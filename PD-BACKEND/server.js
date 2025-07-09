// server.js - Main backend server for the AI Podcast Generator

// Import required modules
const express = require('express'); 
const cors = require('cors'); // Enable cross-origin requests
const bodyParser = require('body-parser'); 
const mongoose = require('mongoose'); // MongoDB 
const mysql = require('mysql2/promise'); // MySQL client
const bcrypt = require('bcrypt'); // Password hashing
const session = require('express-session');
const MongoStore = require('connect-mongo'); // Store sessions in MongoDB
const path = require('path'); 
const fs = require('fs'); // File system
const { execSync } = require('child_process'); // Run shell commands
const Podcast = require('../models/Podcast'); 
const { generateScriptFromGPT4All } = require('./gpt');
require('dotenv').config(); // Load environment variables

const app = express();
const PORT = 5000;

// Enable CORS for frontend (adjust origin for production)
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true,
}));

// Parse JSON request bodies
app.use(bodyParser.json());

// Connect to MongoDB for podcasts and session storage
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Set up MySQL connection pool for user authentication
const mysqlPool = mysql.createPool({
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
});

// Set up session management (sessions stored in MongoDB)
app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: process.env.MONGODB_URI }),
  cookie: { maxAge: 1000 * 60 * 60 * 24 }, // 1 day
}));

// --- User Authentication Routes ---

// Register a new user (hash password with bcrypt)
app.post('/register', async (req, res) => {
  const { username, password, email } = req.body;
  if (!username || !password || !email) {
    return res.status(400).json({ success: false, message: 'All fields are required.' });
  }
  try {
    // Check if username already exists
    const [existing] = await mysqlPool.execute(
      'SELECT * FROM users WHERE username = ?',
      [username]
    );
    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: 'Username already exists.' });
    }
    // Hash the password before storing
    const hashedPassword = await bcrypt.hash(password, 10);
    await mysqlPool.execute(
      'INSERT INTO users (username, password, email) VALUES (?, ?, ?)',
      [username, hashedPassword, email]
    );
    res.json({ success: true, message: 'Registration successful', user: { username, email } });
  } catch (err) {
    console.error('MySQL register error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Login user (check password with bcrypt)
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const [rows] = await mysqlPool.execute(
      'SELECT * FROM users WHERE username = ?',
      [username]
    );
    if (rows.length > 0) {
      const user = rows[0];
      // Compare entered password with hashed password
      const match = await bcrypt.compare(password, user.password);
      if (match) {
        req.session.user = { username: user.username, email: user.email };
        return res.json({ success: true, message: 'Login successful', user: { username: user.username, email: user.email } });
      }
    }
    res.status(401).json({ success: false, message: 'Invalid credentials' });
  } catch (err) {
    console.error('MySQL login error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Logout user (destroy session)
app.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.json({ success: true, message: 'Logged out' });
  });
});

// Get current logged-in user (for frontend auth)
app.get('/api/auth/user', (req, res) => {
  if (req.session.user) {
    res.json(req.session.user);
  } else {
    res.status(401).json({ message: 'Not authenticated' });
  }
});

// --- Podcast Generation and Storage ---

// Generate a new podcast (AI + TTS + audio merge)
app.post('/generate', async (req, res) => {
  const { topic } = req.body;
  if (!topic) return res.status(400).json({ message: 'Topic is required' });
  try {
    // Generate script, title, and bullet points using AI
    const { title, bulletPoints, script } = await generateScriptFromGPT4All(topic);

    // Split script into ~200 character chunks for TTS
    const chunks = [];
    let text = script;
    while (text.length > 0) {
      let chunk = text.slice(0, 200);
      // Try to split at a sentence boundary
      const lastPeriod = chunk.lastIndexOf('.');
      if (lastPeriod > 50) chunk = chunk.slice(0, lastPeriod + 1);
      chunks.push(chunk.trim());
      text = text.slice(chunk.length).trim();
    }

    // Download TTS audio for each chunk using Google Translate
    const audioFiles = [];
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(chunk)}&tl=en&client=tw-ob`;
      const audioPath = path.join(__dirname, `../public/audio_chunk_${i}.mp3`);
      execSync(`curl -s -o "${audioPath}" "${url}"`);
      audioFiles.push(audioPath);
    }

    // Merge all audio chunks into one file using ffmpeg
    const listPath = path.join(__dirname, '../public/audio_list.txt');
    fs.writeFileSync(listPath, audioFiles.map(f => `file '${f}'`).join('\n'));
    const finalAudio = path.join(__dirname, `../public/podcast_${Date.now()}.mp3`);
    execSync(`ffmpeg -y -f concat -safe 0 -i "${listPath}" -c copy "${finalAudio}"`);

    // Clean up chunk files
    audioFiles.forEach(f => fs.unlinkSync(f));
    fs.unlinkSync(listPath);

    // Save podcast to MongoDB
    const podcast = new Podcast({
      title,
      topic,
      script,
      bulletPoints,
      audioUrl: `/public/${path.basename(finalAudio)}`,
      createdAt: new Date(),
    });
    await podcast.save();

    res.json({ podcast });
  } catch (err) {
    console.error('Error generating podcast:', err);
    res.status(500).json({ message: 'Failed to generate podcast' });
  }
});

// Get all podcasts from MongoDB
app.get('/podcasts', async (req, res) => {
  try {
    const podcasts = await Podcast.find().sort({ createdAt: -1 });
    res.json(podcasts);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch podcasts' });
  }
});

// Serve static audio files
app.use('/public', express.static(path.join(__dirname, '../public')));

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
