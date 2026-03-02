# FileSharing — High-Speed Peer-to-Peer File Transfer

#### Video Demo: https://youtube.com/shorts/mHa8FbJ3fDc?feature=share

#### Description:

This project is a **full-stack web application** that enables **ultra-fast, privacy-first, peer-to-peer file sharing** over the internet using **WebRTC DataChannels**.  
The goal of this project is to provide a modern, secure, and user-friendly alternative to traditional cloud-based file sharing services, where files are transferred directly between users without being uploaded to a third-party server. This project was created as my final project for **CS50x 2025**.

---

## **Features**

1. **Peer-to-Peer File Transfer via WebRTC DataChannels** — Files are transferred directly between sender and receiver browsers using WebRTC's DataChannel API, ensuring privacy and eliminating the need for server storage. The system uses adaptive chunking and backpressure control to maximize throughput, achieving near-LAN speeds even over the internet. This approach ensures that file contents never touch the signaling server, only metadata and ICE candidates are exchanged for connection setup.

2. **Real-Time Transfer Monitoring and History** — Users can see live transfer progress with speed, ETA, and percentage completed. The system tracks transfer status (Not used / In progress / Completed) and updates the UI in real time. Logged-in users can view their complete transfer history, with instant optimistic updates when a new share starts, and delete individual or all transfers from their history.

3. **QR Code Sharing with Password Protection** — Each file share generates a unique room ID and password, which can be shared via a QR code for easy mobile access. The receiver simply scans the QR code or opens the link with the embedded password, joins the room, and the transfer begins automatically. This makes sharing to mobile devices frictionless and secure.

4. **Adaptive Network Performance** — The system automatically profiles the network path (LAN/WAN/relay) and tunes chunk size and buffer caps based on RTT and candidate type. This ensures optimal throughput across different network conditions, from local network transfers to internet and relay (TURN-like) paths. The sender respects channel backpressure (bufferedAmount) and dynamically adjusts chunk size to avoid stalls.

5. **Single-User and Multi-User Sharing Modes** — Senders can choose between single-user (one receiver at a time) and multi-user (multiple receivers) sharing modes. In single-user mode, a second receiver will see "Link expired/occupied" until the first disconnects. The server tracks room occupancy and share mode, ensuring proper enforcement of sharing policies.

6. **User Authentication and Transfer Management** — The system includes user registration and login with JWT authentication. Users can manage their transfer history, toggle download permissions in real time, and delete individual or all transfers. The backend uses MongoDB (Mongoose) for user and file share metadata storage.

---

## **How It Works**

When the user opens the app, they are greeted with a clean React UI where they can choose to send or receive files. 

- **Sending a file:**  
  The sender selects a file from their device, chooses a sharing mode (single or multi-user), and clicks "Generate Link". The system creates a unique room ID, generates a password, and displays a shareable link and QR code. The sender tab must remain open during the transfer. When a receiver joins, the sender establishes a WebRTC DataChannel connection via Socket.IO signaling, and the file is chunked and streamed directly to the receiver's browser.

- **Receiving a file:**  
  The receiver opens the shared link (or scans the QR code), enters the password if required, and joins the room. The system automatically initiates the WebRTC connection, and the file chunks are assembled in real time. Once the transfer is complete, the receiver can download the file to their device.

- **Real-time updates:**  
  Both sender and receiver see live transfer progress, speed, and ETA. The sender can toggle download permissions in real time, and the receiver's UI reflects these changes instantly. Logged-in users see their transfer history update as new shares start and complete.

- **Backend coordination:**  
  The Node.js/Express backend handles user authentication, file share metadata storage (MongoDB), and Socket.IO signaling for WebRTC connection setup. The backend does not store or relay file contents—only metadata, ICE candidates, and SDP offers/answers.

---

## **Technologies Used**

- **Frontend:** React 18, Vite, TailwindCSS, Socket.IO client, WebRTC DataChannels, lucide-react icons, react-qr-code
- **Backend:** Node.js, Express, Socket.IO server, Mongoose (MongoDB), Multer (for future chunk uploads), CORS
- **Database:** MongoDB (MongoDB Atlas for production, local MongoDB for development)
- **Authentication:** JWT (JSON Web Tokens) with bcrypt for password hashing
- **Real-time Communication:** Socket.IO for signaling, WebRTC DataChannels for P2P file transfer
- **Deployment:** Backend on Render, Frontend on Netlify

**Why I chose these technologies:**
- **React + Vite:** Fast development experience with modern React features and instant HMR.
- **WebRTC DataChannels:** Enables true peer-to-peer transfer without server storage, maximizing privacy and speed.
- **Socket.IO:** Simple, reliable real-time signaling for WebRTC connection setup.
- **MongoDB + Mongoose:** Flexible schema for user and file share metadata, easy to scale.
- **TailwindCSS:** Rapid UI development with utility-first CSS.
- **JWT:** Stateless authentication, perfect for API-only backends.

---

## **Files in This Project**

### **Backend**
- `server.js` — Main Express server, Socket.IO setup, API routes, WebRTC signaling, CORS configuration, MongoDB connection, and HTTP server creation.
- `db.js` — MongoDB connection setup using Mongoose, with error handling and environment variable configuration.
- `routes/authRoutes.js` — User authentication routes (login, register) with JWT token generation.
- `routes/fileShareRoutes.js` — File share API routes (create, list, update status, delete, toggle download permissions).
- `controller/authcontroller.js` — User authentication logic (registration, login, password hashing with bcrypt).
- `controller/fileShareController.js` — File share business logic (CRUD operations, status updates, permission toggles, Socket.IO event broadcasting).
- `model/user.js` — Mongoose schema for User (email, password, timestamps).
- `model/FileShare.js` — Mongoose schema for FileShare (roomId, senderEmail, fileName, fileSize, status, shareMode, downloadEnabled, timestamps).
- `.env` — Environment variables (PORT, MONGO_URI, JWT_SECRET, CORS_ORIGIN).

### **Frontend**
- `src/main.jsx` — React app entry point, router setup (React Router).
- `src/App.jsx` — Main app component, route definitions.
- `src/pages/Homepage.jsx` — Homepage with Sender component and navigation.
- `src/components/Sender.jsx` — File sender UI (file selection, link generation, QR code, WebRTC connection, transfer progress, history).
- `src/components/Receiver.jsx` — File receiver UI (password entry, WebRTC connection, transfer progress, download).
- `src/components/Nav.jsx` — Navigation bar with responsive mobile menu.
- `src/components/Footer.jsx` — Responsive footer.
- `src/components/Login.jsx` — Login form with JWT authentication.
- `src/components/Register.jsx` — Registration form.
- `src/components/About.jsx` — About page.
- `src/components/FAQ.jsx` — FAQ page.
- `src/api/api.js` — Axios instance with JWT token interceptor for API calls.
- `src/utils/crypto.js` — Password generation utility.
- `src/utils/networkOptimizer.js` — Adaptive chunk sizing and network profiling logic.
- `src/utils/performanceMonitor.js` — Transfer speed, ETA, and progress calculation.
- `.env` — Environment variables (VITE_BACKEND_URL, VITE_API_URL, VITE_FRONTEND_URL).

### **Documentation**
- `docs/ARCHITECTURE.md` — Detailed architecture overview (frontend, backend, signaling, data flow).
- `docs/PERFORMANCE.md` — Performance tuning details (adaptive chunking, backpressure, profiling).
- `docs/SECURITY.md` — Security considerations (DTLS encryption, password gating, JWT auth).
- `docs/TROUBLESHOOTING.md` — Common issues and fixes (OperationError, stalls, ETA issues).
- `docs/FileSharing-Project-Report.rtf` — Full project report (scope, design, challenges, outcomes).

---

## **Design Choices**

**Why MongoDB instead of MySQL?**  
I initially used MySQL with Sequelize, but switched to MongoDB (Mongoose) for flexibility and easier deployment. MongoDB's document model is a natural fit for user and file share metadata, and MongoDB Atlas provides a free tier for production. This also eliminated the need for SQL migrations and simplified the schema.

**Why single DataChannel instead of multi-channel striping?**  
Multi-channel striping (2-4 channels) can theoretically increase throughput, but in practice it caused instability and out-of-order delivery issues. A single ordered DataChannel with adaptive chunking and backpressure control proved more reliable across LAN, WAN, and relay paths. LAN profiling is in place to re-enable higher caps when safe.

**Why optimistic UI updates for transfer history?**  
Waiting for a database roundtrip to update the history would cause visible delay. By inserting a new share optimistically when the user clicks "Generate Link", the UI feels instant. The backend syncs the data asynchronously, and the frontend updates the status (Not used / In progress / Completed) based on real-time events.

**Why QR code with embedded password?**  
Mobile users shouldn't have to manually copy/paste a password. Embedding the password in the QR code makes sharing to mobile devices frictionless—just scan and go.

**Why separate frontend and backend deployments?**  
Deploying the frontend on Netlify (static hosting) and the backend on Render (API server) allows for independent scaling, faster CDN delivery for the frontend, and easier backend restarts without affecting the UI. This also simplifies CI/CD and environment management.

---

## **Challenges Faced**

1. **Achieving high throughput with stability across networks**  
   The biggest challenge was balancing speed and reliability. SCTP buffering (used by WebRTC DataChannels) behaves differently across LAN, WAN, and relay paths. I solved this by implementing adaptive chunk sizing based on RTT and candidate profile, respecting bufferedAmount with low-threshold backpressure, and adding periodic queue flushing to break deadlocks.

2. **DataChannel OperationError: Failure to send data**  
   Initially, large chunk sizes (256 KB) caused send errors on some networks. I fixed this by lowering the baseline chunk size to 64 KB, catching send errors gracefully, and implementing adaptive downshift when errors occur.

3. **Transfer stalls at ~10% on receiver**  
   The sender would stop sending after a few chunks, even though the receiver was ready. This was due to bufferedAmount not triggering the low threshold event. I added an `onbufferedamountlow` resume handler and a watchdog flush to break deadlocks.

4. **Huge ETA (e.g., 34 hours) with 4–5 KB/s transfer speed**  
   This was caused by unordered DataChannel with excessive chunking overhead and no backpressure logic. Switching to an ordered channel with adaptive chunking, relay-aware caps, and sender backpressure logic fixed this, achieving 5-10 MB/s on LAN and 500 KB/s - 2 MB/s on WAN.

5. **Deployment errors on Render (path-to-regexp error)**  
   The backend was using a wildcard fallback route (`app.get('*', ...)`) for serving the React SPA, which caused a path-to-regexp error. Since the frontend is deployed separately on Netlify, I removed the static file serving and fallback route from the backend, making it API-only.

6. **CORS issues between Netlify and Render**  
   Initially, the backend CORS config didn't allow the Netlify domain. I updated the `CORS_ORIGIN` env variable to include the Netlify URL, and added dynamic allowance for dev tunnel domains during development.

---

## **Future Improvements**

- **Resume support for interrupted transfers** — Save transfer state and allow resuming from the last successful chunk.
- **Optional TURN integration and authentication** — Add a TURN server for robust NAT traversal in restrictive networks.
- **Share expiration time and download limits** — Auto-expire shares after X hours or Y downloads.
- **End-to-end encryption options** — Add client-side encryption for sensitive files (though WebRTC already uses DTLS).
- **Receiver-side streaming writes to disk** — Use File System Access API to stream large files directly to disk instead of assembling in memory.
- **LAN-only multi-channel striping** — Re-enable 2-4 channel striping for LAN transfers when auto-detection confirms low RTT.
- **Per-chunk manifest + integrity checks** — Add SHA-256 checksums for each chunk and selective resend on corruption.

---

## **How to Run the Project**

### **Prerequisites**
- Node.js 18+ and npm 9+
- MongoDB running locally (or MongoDB Atlas account for production)
- Modern browser (Chrome, Edge, Firefox)

### **Backend Setup**
```powershell
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Create .env file with the following variables:
# PORT=5000
# MONGO_URI=mongodb://localhost:27017/FileSharing (or your MongoDB Atlas URI)
# JWT_SECRET=your_secret_key
# CORS_ORIGIN=http://localhost:5173

# Start the backend server
npm start
```

### **Frontend Setup**
```powershell
# Navigate to frontend directory (open new terminal)
cd frontend

# Install dependencies
npm install

# Create .env file with the following variables:
# VITE_BACKEND_URL=http://localhost:5000/api
# VITE_API_URL=http://localhost:5000
# VITE_FRONTEND_URL=http://localhost:5173

# Start the development server
npm run dev
```

### **Access the Application**
Open your browser and navigate to `http://localhost:5173` (or the URL printed by Vite).

### **Notes**
- Keep the sender tab open during transfers.
- For single-user shares, only one receiver can connect at a time.
- Transfer status updates in real time; the UI reflects the latest known state.

---

## **Demo Screenshots**

![Home](demo/home.png)
![Login](demo/login.png)
![Register](demo/register.png)
![Logged In](demo/logedin.png)
![About](demo/about.png)
![FAQ](demo/faq.png)

---
