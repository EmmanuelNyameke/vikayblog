require('dotenv').config(); // Load .env variables

const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');
const dayjs = require('dayjs');
const relativeTime = require('dayjs/plugin/relativeTime');
dayjs.extend(relativeTime);

let credentials;

// Use JSON string from FIREBASE_CONFIG environment variable
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

admin.initializeApp({
  credential: admin.credential.cert(credentials)
});

const db = getFirestore();

const app = express();
const PORT = process.env.PORT || 7000;

app.use(cors());
app.use(express.json());

// Store new news item
app.post('/api/news/store', async (req, res) => {
  try {
    const { id, title, original_text, thumbnail } = req.body;

    if (!id || !title || !original_text || !thumbnail) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const newsRef = db.collection('news').doc(id.toString());

    const existingDoc = await newsRef.get();
    if (existingDoc.exists) {
      return res.status(409).json({ message: "News already exists" });
    }

    await newsRef.set({
      id,
      title,
      original_text,
      thumbnail,
      created_at: admin.firestore.FieldValue.serverTimestamp()
    });

    res.status(201).json({ message: "News stored successfully!" });
  } catch (error) {
    console.error("Error storing news:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// Get all news with pagination
app.get('/api/news/edited', async (req, res) => {
  try {
    const skip = parseInt(req.query.skip) || 0;
    const limit = parseInt(req.query.limit) || 20;

    const snapshot = await db.collection('news')
      .orderBy('created_at', 'desc')
      .offset(skip)
      .limit(limit)
      .get();

    const results = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      const createdAt = data.created_at?.toDate?.(); // Ensure it's a JS Date
      const timeAgo = createdAt ? dayjs(createdAt).fromNow() : 'Unknown time';

      results.push({
        id: doc.id,
        ...data,
        time_ago: timeAgo  // Include relative time
      });
    });

    res.json({ results });
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

    if (!doc.exists) {
      return res.status(404).json({ message: "News not found" });
    }

    const data = doc.data();
    const createdAt = data.created_at?.toDate?.();
    const timeAgo = createdAt ? dayjs(createdAt).fromNow() : 'Unknown time';

    res.json({ id: doc.id, ...data, time_ago: timeAgo });
  } catch (error) {
    console.error("Error fetching single news:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
