/**
 * THE CUBIK SPACES — Backend API Server
 * Full REST API with JWT auth, file uploads (images + videos), persistent JSON storage
 */

const express = require('express');
const multer  = require('multer');
const cors    = require('cors');
const jwt     = require('jsonwebtoken');
const bcrypt  = require('bcryptjs');
const { v4: uuid } = require('uuid');
const path    = require('path');
const fs      = require('fs');

const app  = express();
const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'cubik_spaces_secret_2024';

// ─── Data store (JSON files as simple DB) ───────────────────────────────────
const DB_DIR = path.join(__dirname, 'db');
if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });

function readDB(name) {
  const file = path.join(DB_DIR, `${name}.json`);
  if (!fs.existsSync(file)) return [];
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return []; }
}
function writeDB(name, data) {
  fs.writeFileSync(path.join(DB_DIR, `${name}.json`), JSON.stringify(data, null, 2));
}

// Seed default data if empty
function seedDefaults() {
  if (!readDB('users').length) {
    const hash = bcrypt.hashSync('cubik2024', 10);
    writeDB('users', [{ id: uuid(), username: 'admin', password: hash, role: 'admin', name: 'Admin' }]);
  }
  if (!readDB('projects').length) {
    writeDB('projects', [
      { id: uuid(), name: 'The Serene Residence', category: 'Residential', location: 'Mumbai, India', year: 2024, desc: 'A contemporary masterpiece blending warmth with minimalism.', status: 'Completed', color: '#1e1a15', images: [], videos: [], createdAt: new Date().toISOString() },
      { id: uuid(), name: 'Azure Corporate Hub', category: 'Commercial', location: 'Bangalore, India', year: 2023, desc: 'Open collaborative workspace redefining corporate culture.', status: 'Completed', color: '#151820', images: [], videos: [], createdAt: new Date().toISOString() },
      { id: uuid(), name: 'Opulent Villa Retreat', category: 'Luxury', location: 'Goa, India', year: 2024, desc: 'A celebration of stone, wood, and light in perfect harmony.', status: 'Featured', color: '#1a1515', images: [], videos: [], createdAt: new Date().toISOString() },
    ]);
  }
  if (!readDB('reviews').length) {
    writeDB('reviews', [
      { id: uuid(), author: 'Priya Sharma', loc: 'Mumbai · Residential', rating: 5, initials: 'PS', text: 'The Cubik Spaces completely transformed our home. Extraordinary attention to detail.', createdAt: new Date().toISOString() },
      { id: uuid(), author: 'Rahul Mehta', loc: 'Delhi · Commercial', rating: 5, initials: 'RM', text: 'Working with them on our restaurant redesign was a dream. Guests absolutely love it.', createdAt: new Date().toISOString() },
    ]);
  }
  if (!readDB('services').length) {
    writeDB('services', [
      { id: uuid(), name: 'Residential Design', desc: 'Transform your home into a sanctuary of comfort and elegance.', visible: true, order: 1 },
      { id: uuid(), name: 'Commercial Spaces', desc: 'Design offices and retail spaces that enhance brand identity.', visible: true, order: 2 },
      { id: uuid(), name: '3D Visualization', desc: 'Photo-realistic renders and virtual walkthroughs.', visible: true, order: 3 },
      { id: uuid(), name: 'Lighting Design', desc: 'Strategic lighting that transforms mood and highlights architecture.', visible: true, order: 4 },
      { id: uuid(), name: 'Furniture Curation', desc: 'Custom furniture design and premium curation from global artisans.', visible: true, order: 5 },
      { id: uuid(), name: 'Project Management', desc: 'End-to-end coordination ensuring timelines and quality are met.', visible: true, order: 6 },
    ]);
  }
  if (!readDB('settings').length) {
    writeDB('settings', [{ id: 'main', studioName: 'The Cubik Spaces', tagline: 'Crafting Extraordinary Spaces', email: 'hello@thecubikspaces.com', phone: '+91 98765 43210', instagram: '@the_cubik_spaces', address: 'Mumbai, India' }]);
  }
}
seedDefaults();

// ─── Multer Storage ──────────────────────────────────────────────────────────
const UPLOAD_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(path.join(UPLOAD_DIR,'images'))) fs.mkdirSync(path.join(UPLOAD_DIR,'images'), { recursive: true });
if (!fs.existsSync(path.join(UPLOAD_DIR,'videos'))) fs.mkdirSync(path.join(UPLOAD_DIR,'videos'), { recursive: true });

const storage = multer.diskStorage({
  destination(req, file, cb) {
    const isVideo = file.mimetype.startsWith('video/');
    cb(null, path.join(UPLOAD_DIR, isVideo ? 'videos' : 'images'));
  },
  filename(req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuid()}${ext}`);
  }
});
const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg','image/jpg','image/png','image/webp','image/gif','video/mp4','video/webm','video/mov','video/quicktime'];
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error(`File type not allowed: ${file.mimetype}`), false);
};
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB
});

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());
app.use('/uploads', express.static(UPLOAD_DIR)); // serve uploaded files
app.use(express.static(path.join(__dirname, 'public'))); // serve frontend

// Auth middleware
function authRequired(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
  try {
    req.user = jwt.verify(header.slice(7), JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// ─── AUTH ROUTES ─────────────────────────────────────────────────────────────
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  const users = readDB('users');
  const user = users.find(u => u.username === username);
  if (!user || !bcrypt.compareSync(password, user.password))
    return res.status(401).json({ error: 'Invalid credentials' });
  const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: user.id, username: user.username, name: user.name, role: user.role } });
});

app.put('/api/auth/password', authRequired, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const users = readDB('users');
  const idx = users.findIndex(u => u.id === req.user.id);
  if (idx === -1) return res.status(404).json({ error: 'User not found' });
  if (!bcrypt.compareSync(currentPassword, users[idx].password))
    return res.status(400).json({ error: 'Current password incorrect' });
  users[idx].password = bcrypt.hashSync(newPassword, 10);
  writeDB('users', users);
  res.json({ message: 'Password updated' });
});

// ─── PROJECTS ROUTES ──────────────────────────────────────────────────────────
app.get('/api/projects', (req, res) => {
  res.json(readDB('projects'));
});

app.post('/api/projects', authRequired, upload.fields([
  { name: 'images', maxCount: 10 },
  { name: 'videos', maxCount: 10 }
]), (req, res) => {
  const { name, category, location, year, desc, status, color } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });
  const project = {
    id: uuid(), name, category, location, year: +year || new Date().getFullYear(),
    desc, status, color: color || '#1a1a18',
    images: req.files?.images ? req.files.images.map(f => ({ path: `/uploads/images/${f.filename}`, original: f.originalname })) : [],
    videos: req.files?.videos ? req.files.videos.map(f => ({ path: `/uploads/videos/${f.filename}`, original: f.originalname })) : [],
    createdAt: new Date().toISOString()
  };
  const projects = readDB('projects');
  projects.push(project);
  writeDB('projects', projects);
  res.status(201).json(project);
});

app.put('/api/projects/:id', authRequired, upload.fields([
  { name: 'images', maxCount: 10 },
  { name: 'videos', maxCount: 10 }
]), (req, res) => {
  const projects = readDB('projects');
  const idx = projects.findIndex(p => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Project not found' });
  const existing = projects[idx];
  const updated = {
    ...existing,
    ...req.body,
    year: +req.body.year || existing.year,
    updatedAt: new Date().toISOString()
  };
  // Handle images
  if (req.files?.images) {
    // Add new images
    const newImages = req.files.images.map(f => ({ path: `/uploads/images/${f.filename}`, original: f.originalname }));
    updated.images = [...(existing.images || []), ...newImages];
  } else {
    updated.images = existing.images || [];
  }
  // Handle videos
  if (req.files?.videos) {
    const newVideos = req.files.videos.map(f => ({ path: `/uploads/videos/${f.filename}`, original: f.originalname }));
    updated.videos = [...(existing.videos || []), ...newVideos];
  } else {
    updated.videos = existing.videos || [];
  }
  // Remove specific images/videos if flagged
  if (req.body.removeImages) {
    const toRemove = JSON.parse(req.body.removeImages);
    toRemove.forEach(p => {
      try { fs.unlinkSync(path.join(__dirname, p)); } catch {}
      updated.images = updated.images.filter(img => img.path !== p);
    });
  }
  if (req.body.removeVideos) {
    const toRemove = JSON.parse(req.body.removeVideos);
    toRemove.forEach(p => {
      try { fs.unlinkSync(path.join(__dirname, p)); } catch {}
      updated.videos = updated.videos.filter(vid => vid.path !== p);
    });
  }
  projects[idx] = updated;
  writeDB('projects', projects);
  res.json(updated);
});

app.delete('/api/projects/:id', authRequired, (req, res) => {
  const projects = readDB('projects');
  const proj = projects.find(p => p.id === req.params.id);
  if (!proj) return res.status(404).json({ error: 'Not found' });
  // Delete all images
  if (proj.images) {
    proj.images.forEach(img => {
      try { fs.unlinkSync(path.join(__dirname, img.path)); } catch {}
    });
  }
  // Delete all videos
  if (proj.videos) {
    proj.videos.forEach(vid => {
      try { fs.unlinkSync(path.join(__dirname, vid.path)); } catch {}
    });
  }
  writeDB('projects', projects.filter(p => p.id !== req.params.id));
  res.json({ message: 'Deleted' });
});

// ─── REVIEWS ROUTES ───────────────────────────────────────────────────────────
app.get('/api/reviews', (req, res) => res.json(readDB('reviews')));

app.post('/api/reviews', authRequired, (req, res) => {
  const { author, loc, rating, initials, text } = req.body;
  if (!author || !text) return res.status(400).json({ error: 'Author and text required' });
  const review = { id: uuid(), author, loc, rating: +rating || 5, initials: initials || author.split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2), text, createdAt: new Date().toISOString() };
  const reviews = readDB('reviews');
  reviews.push(review);
  writeDB('reviews', reviews);
  res.status(201).json(review);
});

app.put('/api/reviews/:id', authRequired, (req, res) => {
  const reviews = readDB('reviews');
  const idx = reviews.findIndex(r => r.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  reviews[idx] = { ...reviews[idx], ...req.body, rating: +req.body.rating || reviews[idx].rating, updatedAt: new Date().toISOString() };
  writeDB('reviews', reviews);
  res.json(reviews[idx]);
});

app.delete('/api/reviews/:id', authRequired, (req, res) => {
  const reviews = readDB('reviews');
  if (!reviews.find(r => r.id === req.params.id)) return res.status(404).json({ error: 'Not found' });
  writeDB('reviews', reviews.filter(r => r.id !== req.params.id));
  res.json({ message: 'Deleted' });
});

// ─── SERVICES ROUTES ──────────────────────────────────────────────────────────
app.get('/api/services', (req, res) => res.json(readDB('services')));

app.post('/api/services', authRequired, (req, res) => {
  const { name, desc, visible, order } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });
  const svc = { id: uuid(), name, desc, visible: visible !== 'false' && visible !== false, order: +order || 99, createdAt: new Date().toISOString() };
  const services = readDB('services');
  services.push(svc);
  writeDB('services', services);
  res.status(201).json(svc);
});

app.put('/api/services/:id', authRequired, (req, res) => {
  const services = readDB('services');
  const idx = services.findIndex(s => s.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  services[idx] = { ...services[idx], ...req.body, visible: req.body.visible !== 'false' && req.body.visible !== false };
  writeDB('services', services);
  res.json(services[idx]);
});

app.delete('/api/services/:id', authRequired, (req, res) => {
  const s = readDB('services');
  writeDB('services', s.filter(x => x.id !== req.params.id));
  res.json({ message: 'Deleted' });
});

// ─── INQUIRIES ROUTES ─────────────────────────────────────────────────────────
app.get('/api/inquiries', authRequired, (req, res) => res.json(readDB('inquiries')));

app.post('/api/inquiries', (req, res) => { // public endpoint — from contact form
  const { name, email, type, budget, message } = req.body;
  if (!name || !email || !message) return res.status(400).json({ error: 'Name, email, message required' });
  const inq = { id: uuid(), name, email, type, budget, message, status: 'New', date: new Date().toLocaleDateString('en-IN'), createdAt: new Date().toISOString() };
  const inquiries = readDB('inquiries');
  inquiries.push(inq);
  writeDB('inquiries', inquiries);
  res.status(201).json({ message: 'Inquiry received. We will be in touch shortly!' });
});

app.put('/api/inquiries/:id', authRequired, (req, res) => {
  const inq = readDB('inquiries');
  const idx = inq.findIndex(i => i.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  inq[idx] = { ...inq[idx], ...req.body };
  writeDB('inquiries', inq);
  res.json(inq[idx]);
});

app.delete('/api/inquiries/:id', authRequired, (req, res) => {
  writeDB('inquiries', readDB('inquiries').filter(i => i.id !== req.params.id));
  res.json({ message: 'Deleted' });
});

app.delete('/api/inquiries', authRequired, (req, res) => {
  writeDB('inquiries', []);
  res.json({ message: 'All inquiries cleared' });
});

// ─── SETTINGS ROUTES ──────────────────────────────────────────────────────────
app.get('/api/settings', (req, res) => {
  const s = readDB('settings');
  res.json(s[0] || {});
});

app.put('/api/settings', authRequired, (req, res) => {
  writeDB('settings', [{ id: 'main', ...req.body }]);
  res.json({ message: 'Settings saved' });
});

// ─── MEDIA UPLOAD (standalone) ────────────────────────────────────────────────
app.post('/api/upload', authRequired, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const isVideo = req.file.mimetype.startsWith('video/');
  const url = `/uploads/${isVideo ? 'videos' : 'images'}/${req.file.filename}`;
  res.json({ url, filename: req.file.filename, originalName: req.file.originalname, size: req.file.size, type: isVideo ? 'video' : 'image' });
});

// ─── STATS ────────────────────────────────────────────────────────────────────
app.get('/api/stats', authRequired, (req, res) => {
  const projects  = readDB('projects');
  const inquiries = readDB('inquiries');
  const reviews   = readDB('reviews');
  const cats = {};
  projects.forEach(p => { cats[p.category] = (cats[p.category] || 0) + 1; });
  res.json({
    total: { projects: projects.length, inquiries: inquiries.length, reviews: reviews.length, newInquiries: inquiries.filter(i => i.status === 'New').length },
    byCategory: cats,
    recent: { inquiries: inquiries.slice(-5).reverse() }
  });
});

// ─── START ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n✦ THE CUBIK SPACES — Backend API`);
  console.log(`✦ Running at: http://localhost:${PORT}`);
  console.log(`✦ API base:   http://localhost:${PORT}/api`);
  console.log(`✦ Uploads at: http://localhost:${PORT}/uploads`);
  console.log(`✦ Login:      admin / cubik2024\n`);
});

module.exports = app;
