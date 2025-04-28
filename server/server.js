const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');
require('dotenv').config(); // Load .env file

// Force Firestore to use HTTP instead of gRPC
process.env.FIRESTORE_USE_HTTP = 'true';

// Initialize Firebase Admin SDK securely using environment variables
const serviceAccount = {
  type: process.env.FIREBASE_TYPE,
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'), // important to fix line breaks
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: process.env.FIREBASE_AUTH_URI,
  token_uri: process.env.FIREBASE_TOKEN_URI,
  auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
  client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL,
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = getFirestore();

const app = express();
const PORT = process.env.PORT || 7000; // Use environment PORT on production


app.use(cors());
app.use(express.json());

// Store new news item
app.post('/api/news/store', async (req, res) => {
  try {
    const { id, title, original_text, thumbnail } = req.body;

    // Validate required fields
    if (!id || !title || !original_text || !thumbnail) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const newsRef = db.collection('news').doc(id.toString());

    // Check if news already exists
    const existingDoc = await newsRef.get();
    if (existingDoc.exists) {
      return res.status(409).json({ message: "News already exists" });
    }

    // Save news
    await newsRef.set({
      id: id,
      title: title,
      original_text: original_text,
      thumbnail: thumbnail,
      created_at: admin.firestore.FieldValue.serverTimestamp() // Save the time automatically
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

    let query = db.collection('news')
                  .orderBy('created_at', 'desc')
                  .offset(skip)
                  .limit(limit);

    const snapshot = await query.get();

    const results = [];
    snapshot.forEach(doc => {
      results.push({ id: doc.id, ...doc.data() });
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

    res.json({
      id: doc.id,
      ...doc.data()
    });
  } catch (error) {
    console.error("Error fetching single news:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});