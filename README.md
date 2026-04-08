# THE CUBIK SPACES — Full Stack Website

## 🚀 Quick Start (3 steps)

```bash
# 1. Install dependencies
npm install

# 2. Start the backend server
npm start

# 3. Open in browser
# Website:    http://localhost:4000
# Admin:      http://localhost:4000/admin.html
# API:        http://localhost:4000/api
```

**Login:** `admin` / `cubik2024`

---

## 📁 Folder Structure

```
cubik-backend/
├── server.js           ← Node.js backend (Express)
├── package.json
├── db/                 ← JSON database (auto-created)
│   ├── projects.json
│   ├── reviews.json
│   ├── services.json
│   ├── inquiries.json
│   ├── settings.json
│   └── users.json
├── uploads/            ← Uploaded files (auto-created)
│   ├── images/         ← Project images
│   └── videos/         ← Project videos
└── public/             ← Frontend files
    ├── index.html      ← Main website
    └── admin.html      ← Admin panel
```

---

## 🔌 REST API Endpoints

### Auth
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/login` | No | Login → returns JWT token |
| PUT | `/api/auth/password` | Yes | Change password |

### Projects
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/projects` | No | List all projects (public) |
| POST | `/api/projects` | Yes | Create project (with image/video upload) |
| PUT | `/api/projects/:id` | Yes | Update project |
| DELETE | `/api/projects/:id` | Yes | Delete project |

### Reviews
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/reviews` | No | List all reviews (public) |
| POST | `/api/reviews` | Yes | Add review |
| PUT | `/api/reviews/:id` | Yes | Update review |
| DELETE | `/api/reviews/:id` | Yes | Delete review |

### Services
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/services` | No | List all services (public) |
| POST | `/api/services` | Yes | Add service |
| PUT | `/api/services/:id` | Yes | Update service |
| DELETE | `/api/services/:id` | Yes | Delete service |

### Inquiries (Contact Form)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/inquiries` | Yes | List all inquiries |
| POST | `/api/inquiries` | No | Submit inquiry (from contact form) |
| PUT | `/api/inquiries/:id` | Yes | Update status |
| DELETE | `/api/inquiries/:id` | Yes | Delete inquiry |
| DELETE | `/api/inquiries` | Yes | Clear all inquiries |

### Stats & Misc
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/stats` | Yes | Dashboard stats |
| GET | `/api/settings` | No | Studio settings |
| PUT | `/api/settings` | Yes | Update settings |
| POST | `/api/upload` | Yes | Standalone file upload |

---

## 🖼️ Image & Video Upload

### From Admin Panel
- Click **"Add Project"** → drag & drop or **click to browse** from your folder
- Supports: **JPG, PNG, WebP, GIF** (images) · **MP4, WebM, MOV** (videos)
- Max: **50MB** images, **100MB** videos
- Preview shown immediately after selection
- Files stored in `uploads/images/` and `uploads/videos/`

### Via API (direct)
```bash
curl -X POST http://localhost:4000/api/projects \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "name=My Project" \
  -F "category=Residential" \
  -F "image=@/path/to/photo.jpg" \
  -F "video=@/path/to/tour.mp4"
```

---

## ⚙️ Environment Variables

Create a `.env` file for production:
```
PORT=4000
JWT_SECRET=your_super_secret_key_here
```

---

## 🌐 Deploy to Production

### Option 1: Railway / Render / Fly.io
1. Push to GitHub
2. Connect to Railway/Render
3. Set `PORT` and `JWT_SECRET` env vars
4. Deploy — uploads folder will persist with a volume

### Option 2: VPS (Ubuntu)
```bash
npm install pm2 -g
pm2 start server.js --name cubik
pm2 startup && pm2 save
```

---

## 🎨 Offline Mode

The admin panel works **without the backend** using localStorage:
- All data stored in browser
- Image/video uploads stored as base64
- Ideal for demos and development
- Connect backend later without losing workflow
