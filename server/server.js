require('dotenv').config(); // Load .env variables
const builder = require('xmlbuilder');
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { TwitterApi } = require('twitter-api-v2');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');
const dayjs = require('dayjs');
const relativeTime = require('dayjs/plugin/relativeTime');
dayjs.extend(relativeTime);

// Firebase credentials from env variable
let credentials;
if (process.env.FIREBASE_CONFIG) {
  try {
    credentials = JSON.parse(process.env.FIREBASE_CONFIG);
  } catch (error) {
    console.error("Invalid JSON in FIREBASE_CONFIG:", error);
    process.exit(1);
  }
} else {
  throw new Error("FIREBASE_CONFIG environment variable is not set.");
}

// Initialize Firebase
admin.initializeApp({
  credential: admin.credential.cert(credentials)
});
const db = getFirestore();

const app = express();
const PORT = process.env.PORT || 7000;

app.use(cors());
app.use(express.json());


function slugify(title) {
  return title
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[\s\W-]+/g, '-') // Replace spaces & special chars with dashes
    .replace(/^-+|-+$/g, '');  // Remove leading/trailing dashes
}

// Function to download image from URL
const downloadImage = async (imageUrl, outputPath) => {
  const response = await axios({
    url: imageUrl,
    method: 'GET',
    responseType: 'stream',
  });
  response.data.pipe(fs.createWriteStream(outputPath));
  return new Promise((resolve, reject) => {
    response.data.on('end', resolve);
    response.data.on('error', reject);
  });
};

// Overlay title text on image and return saved image path
const overlayTitleOnImage = async (imageUrl, title) => {
  const tempImagePath = path.join(__dirname, 'temp_image.jpg');
  const outputImagePath = path.join(__dirname, 'output_image.jpg');

  await downloadImage(imageUrl, tempImagePath);

  const svgOverlay = `
    <svg width="800" height="100">
      <style>
        .title { fill: white; font-size: 32px; font-weight: bold; font-family: Arial, sans-serif; }
      </style>
      <text x="20" y="40" class="title">${title.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</text>
    </svg>
  `;

  await sharp(tempImagePath)
    .resize({ width: 800 })
    .composite([{ input: Buffer.from(svgOverlay), top: 20, left: 0 }])
    .jpeg({ quality: 90 })
    .toFile(outputImagePath);

  return outputImagePath;
};


// Store new news item and post to Twitter/Facebook
app.post('/api/news/store', async (req, res) => {
  try {
    const { id, title, original_text, thumbnail } = req.body;
    if (!id || !title || !original_text || !thumbnail) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const slug = slugify(title);

    const newsRef = db.collection('news').doc(id.toString());
    const existingDoc = await newsRef.get();
    if (existingDoc.exists) {
      return res.status(409).json({ message: "News already exists" });
    }

    await newsRef.set({
      id,
      title,
      slug,
      original_text,
      thumbnail,
      created_at: admin.firestore.FieldValue.serverTimestamp()
    });

    const postUrl = `https://vikayblog.com/details.html?slug=${slug}`;

    // --- Post to Twitter ---
    const twitterClient = new TwitterApi({
      appKey: process.env.TWITTER_API_KEY,
      appSecret: process.env.TWITTER_API_SECRET,
      accessToken: process.env.TWITTER_ACCESS_TOKEN,
      accessSecret: process.env.TWITTER_ACCESS_SECRET,
    });
    async function postTweetWithRetry(client, message, maxRetries = 3) {
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          await client.v2.tweet(message);
          console.log('✅ Tweet posted');
          return;
        } catch (error) {
          if (error.code === 429 && error.rateLimit?.reset) {
            const resetTime = error.rateLimit.reset * 1000;
            const waitTime = resetTime - Date.now();
            console.warn(`⚠️ Twitter rate limit hit. Waiting ${Math.ceil(waitTime / 1000)}s before retrying...`);
            await new Promise(resolve => setTimeout(resolve, waitTime + 1000)); // wait a bit extra
          } else {
            console.error('❌ Twitter post failed:', error);
            break;
          }
        }
      }
    }

    const imagePath = await overlayTitleOnImage(thumbnail, title);

    const mediaId = await twitterClient.v2.uploadMedia(imagePath, { mediaCategory: 'tweet_image' });
    const postText = `${title}\nRead more: ${postUrl}`;

    await twitterClient.v2.tweet({
          text: postText,
          media: { media_ids: [mediaId] }
});

    fs.unlinkSync(imagePath); // Clean up

    

    // --- Post to Facebook ---
    await axios.post(`https://graph.facebook.com/${process.env.FB_PAGE_ID}/feed`, {
      message: `${title}\nRead more: ${postUrl}`,
      access_token: process.env.FB_PAGE_ACCESS_TOKEN
    });

    res.status(201).json({ message: "News stored and shared successfully!" });
  } catch (error) {
    console.error("Error storing or sharing news:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// Get paginated news
app.get('/api/news/edited', async (req, res) => {
  try {
    const skip = parseInt(req.query.skip) || 0;
    const limit = parseInt(req.query.limit) || 20;
    const totalSnapshot = await db.collection('news').get();
    const total = totalSnapshot.size;
    const totalPages = Math.ceil(total / limit);

    const snapshot = await db.collection('news')
      .orderBy('created_at', 'desc')
      .offset(skip)
      .limit(limit)
      .get();

    const results = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      const createdAt = data.created_at?.toDate?.();
      const timeAgo = createdAt ? dayjs(createdAt).fromNow() : 'Unknown time';
      results.push({ id: doc.id, ...data, time_ago: timeAgo });
    });

    res.json({
      total,
      totalPages,
      currentPage: Math.floor(skip / limit) + 1,
      results
    });
  } catch (error) {
    console.error('Error fetching news:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Get single news by ID
app.get('/api/news/edited/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await db.collection('news').doc(id).get();
    if (!doc.exists) return res.status(404).json({ message: "News not found" });

    const data = doc.data();
    const createdAt = data.created_at?.toDate?.();
    const timeAgo = createdAt ? dayjs(createdAt).fromNow() : 'Unknown time';

    res.json({ id: doc.id, ...data, time_ago: timeAgo });
  } catch (error) {
    console.error("Error fetching single news:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// Get single news by slug
app.get('/api/news/edited/slug/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const snapshot = await db.collection('news').where('slug', '==', slug).limit(1).get();

    if (snapshot.empty) return res.status(404).json({ message: "News not found" });

    const doc = snapshot.docs[0];
    const data = doc.data();
    const createdAt = data.created_at?.toDate?.();
    const timeAgo = createdAt ? dayjs(createdAt).fromNow() : 'Unknown time';

    res.json({ id: doc.id, ...data, time_ago: timeAgo });
  } catch (error) {
    console.error("Error fetching news by slug:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

app.get('/sitemap.xml', async (req, res) => {
  try {
    const snapshot = await db.collection('news').orderBy('created_at', 'desc').get();

    const urlSet = builder.create('urlset', { encoding: 'UTF-8' })
      .att('xmlns', 'http://www.sitemaps.org/schemas/sitemap/0.9');

    snapshot.forEach(doc => {
      const data = doc.data();
      const slug = data.slug;
      const updatedAt = data.created_at?.toDate()?.toISOString() || new Date().toISOString();
      const fullUrl = `https://vikayblog.com/details.html?slug=${slug}`; // Adjust to match your frontend

      urlSet.ele('url')
        .ele('loc', {}, fullUrl).up()
        .ele('lastmod', {}, updatedAt).up()
        .ele('changefreq', {}, 'weekly').up()
        .ele('priority', {}, '0.8');
    });

    res.header('Content-Type', 'application/xml');
    res.send(urlSet.end({ pretty: true }));
  } catch (error) {
    console.error("Error generating sitemap:", error);
    res.status(500).send("Could not generate sitemap");
  }
});

//  Fix missing slugs for existing news documents
// app.get('/api/news/fix-slugs', async (req, res) => {
//   try {
//     const snapshot = await db.collection('news').get();
//     let updatedCount = 0;

//     for (const doc of snapshot.docs) {
//       const data = doc.data();

//       if (!data.slug && data.title) {
//         const slug = slugify(data.title);
//         await doc.ref.update({ slug });
//         updatedCount++;
//         console.log(`Added slug to: ${data.title}`);
//       }
//     }

//     res.json({ message: `Slugs fixed for ${updatedCount} documents.` });
//   } catch (error) {
//     console.error("Error fixing slugs:", error);
//     res.status(500).json({ message: "Failed to fix slugs" });
//   }
// });

// Start server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
