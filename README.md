# FileShare

Ultra-fast, private, peer-to-peer file and text sharing — no cloud storage, no size limits, no tracking.

## How It Works

Files and text are transferred **directly between browsers** using WebRTC Data Channels. The backend only handles signaling (WebRTC offer/answer/ICE exchange) and optional share metadata — your data never passes through the server.

```
Sender Browser  ──── WebRTC P2P ────  Receiver Browser
        │                                      │
        └──── Socket.IO signaling ─────────────┘
                      │
                  Backend (Node.js)
                      │
                 MongoDB Atlas (metadata only)
```

---

## Features

- **File sharing** — send any file type, any size, directly peer-to-peer
- **Text / Code sharing** — share plain text or code snippets with language labels
- **6-character OTP** — receiver enters a short code at `/receive` to connect instantly
- **Shareable link** — direct URL with embedded password for one-click access
- **QR code** — scan to open the share link; download as PNG
- **Single / Multi user mode** — lock a share to one receiver or allow multiple
- **Transfer speed display** — real-time MB/s, progress bar, and ETA
- **History** — logged-in users see past shares with status (not used / in progress / completed)
- **Download toggle** — sender can enable/disable file download per share
- **Adaptive chunk sizing** — auto-tunes chunk size based on RTT and network profile (LAN/WAN/relay)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite 7, TailwindCSS 4 |
| Routing | react-router-dom v7 |
| Transport | WebRTC Data Channels (P2P) |
| Signaling | Socket.IO 4.8 |
| Icons | lucide-react |
| QR | react-qr-code |
| HTTP client | Axios |
| Backend | Node.js (ESM), Express 5 |
| Realtime | Socket.IO 4.8 |
| Database | MongoDB Atlas + Mongoose 8 |
| Auth | bcrypt + jsonwebtoken |

---

## Project Structure

```
FileSharing/
├── backend/
│   ├── server.js              # Express app, Socket.IO signaling
│   ├── db.js                  # MongoDB connection
│   ├── otpStore.js            # In-memory OTP → roomId map
│   ├── controller/
│   │   ├── authController.js
│   │   └── fileShareController.js
│   ├── model/
│   │   ├── user.js
│   │   └── FileShare.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   └── fileShareRoutes.js
│   └── uploads/               # Temp storage for HTTP chunk uploads
│
└── frontend/
    └── src/
        ├── App.jsx
        ├── api/api.js
        ├── components/
        │   ├── Sender.jsx      # File + text sender with OTP display
        │   ├── Receiver.jsx    # File + text receiver
        │   ├── Nav.jsx
        │   └── Footer.jsx
        ├── pages/
        │   ├── Homepage.jsx
        │   ├── ReceiveLanding.jsx  # /receive — OTP entry page
        │   └── QrView.jsx
        └── workers/
            └── fileChunkWorker.js  # Web Worker for chunked file reading
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB Atlas account (free M0 tier works)

### 1. Clone & install

```bash
git clone https://github.com/your-username/filesharing.git
cd filesharing

# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Configure environment variables

**`backend/.env`**
```env
PORT=5000
MONGO_URI=mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
JWT_SECRET=your_secret_here
JWT_EXPIRATION=1h
CORS_ORIGIN=http://localhost:5173
```

**`frontend/.env`** (optional — auto-detected from `window.location` if not set)
```env
VITE_API_URL=http://localhost:5000
VITE_FRONTEND_URL=http://localhost:5173
```

### 3. Run locally

```bash
# Terminal 1 — backend
cd backend
npm start

# Terminal 2 — frontend
cd frontend
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

## Usage

### Sending a file

1. Open the homepage
2. Select **Files** tab → choose file(s)
3. Pick **Single User** or **Multiple Users** mode
4. Click **Start File Share**
5. Share the **6-character code**, the **link**, or the **QR code** with the receiver

### Sending text / code

1. Open the homepage
2. Select **Text / Code** tab
3. Pick a language from the dropdown, paste your content
4. Click **Share Text**
5. Share the code or link

### Receiving

**Via code:**
1. Go to `/receive`
2. Enter the 6-character code
3. Click **Open Share →**

**Via link:**
- Open the direct link — password is embedded in the URL

---

## Deployment

### Backend → [Render](https://render.com)

1. Push repo to GitHub
2. New Web Service → connect repo
3. Root directory: `backend`
4. Build command: `npm install`
5. Start command: `npm start`
6. Add environment variables in the Render dashboard

### Frontend → [Vercel](https://vercel.com)

1. New Project → import repo
2. Root directory: `frontend`
3. Add environment variables:
   - `VITE_API_URL` → your Render backend URL
   - `VITE_BACKEND_URL` → same Render URL
4. Deploy

### MongoDB → [MongoDB Atlas](https://cloud.mongodb.com)

1. Create a free M0 cluster
2. Add a database user
3. Whitelist `0.0.0.0/0` (or your server IP) under Network Access
4. Get the connection string and set it as `MONGO_URI`

---

## How the OTP System Works

1. Sender clicks **Start File Share** / **Share Text**
2. A 6-character alphanumeric code is generated (e.g. `A3XKP2`)
3. The code is registered in the backend's in-memory map via a `register-otp` Socket.IO event — **no database required**
4. Receiver goes to `/receive`, enters the code
5. Backend looks up `OTP → roomId` from the in-memory map
6. Receiver is redirected to `/receiver/:roomId?password=<code>`
7. WebRTC P2P connection is established; the code is used as the channel password

> The OTP map lives in server memory. If the backend restarts, active OTPs are cleared. A new share must be created.

---
