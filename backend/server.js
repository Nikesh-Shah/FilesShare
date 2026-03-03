import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB from './db.js';
import authRoutes from './routes/authRoutes.js';
import fileShareRoutes from './routes/fileShareRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import { setIoInstance } from './controller/fileShareController.js';
import { otpRoomMap } from './otpStore.js';
import { seedDefaultAdmin } from './seedAdmin.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();

// Create directories for file uploads
const uploadsDir = path.join(__dirname, 'uploads');
const tempDir = path.join(uploadsDir, 'temp');
const downloadsDir = path.join(uploadsDir, 'downloads');

[uploadsDir, tempDir, downloadsDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Configure multer for chunk uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB per chunk
});

// Build allow list for CORS (explicit + dev tunnels + optional env list)
const staticAllowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3001',
  'http://localhost:5000',
  'https://localhost:5173', 
];

if (process.env.CORS_ORIGIN) {
  process.env.CORS_ORIGIN.split(',')
    .map(o => o.trim())
    .filter(o => o)
    .forEach(o => staticAllowedOrigins.push(o));
}

// De-duplicate
const baseAllowSet = new Set(staticAllowedOrigins);

// Function form to allow dynamic dev tunnel domains (*.devtunnels.ms)
const corsOrigin = (origin, callback) => {
  if (!origin) return callback(null, true); // non-browser / same-origin
  if (baseAllowSet.has(origin)) return callback(null, true);
  // Allow any Azure dev tunnel style domain
  if (/\.devtunnels\.ms$/i.test(origin)) return callback(null, true);
  // Allow Netlify deployments
  if (/\.netlify\.app$/i.test(origin)) return callback(null, true);
  // Allow Vercel deployments
  if (/\.vercel\.app$/i.test(origin)) return callback(null, true);
  // Allow any GitHub Codespaces like patterns (optional future use)
  if (/githubpreview\.dev$/i.test(origin)) return callback(null, true);
  return callback(new Error(`Not allowed by CORS: ${origin}`));
};

app.use(cors({
  origin: corsOrigin,
  credentials: true,
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.raw({ type: 'application/octet-stream', limit: '50mb' }));
app.use('/api/auth', authRoutes);
app.use('/api/fileshare', fileShareRoutes);
app.use('/api/admin', adminRoutes);

// Health check / keep-alive route for cron jobs
app.get('/', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
});
app.get('/ping', (req, res) => res.send('pong'));

// ─── ICE / TURN credentials endpoint ────────────────────────────────
// Returns STUN + TURN servers the frontend uses for RTCPeerConnection.
// Supports two config modes (set via env vars):
//   1) Metered.ca free tier → METERED_API_KEY
//   2) Custom TURN server   → TURN_URL, TURN_USERNAME, TURN_CREDENTIAL
let cachedIceServers = null;
let iceCacheExpiry = 0;

app.get('/api/ice-servers', async (_req, res) => {
  try {
    // Return cached if still valid
    if (cachedIceServers && Date.now() < iceCacheExpiry) {
      return res.json({ iceServers: cachedIceServers });
    }

    const iceServers = [];

    // ── Option 1: Metered.ca free TURN API ──
    const meteredKey = process.env.METERED_API_KEY;
    const meteredApp = process.env.METERED_APP_NAME || 'filesharing';
    if (meteredKey) {
      try {
        const meteredRes = await fetch(
          `https://${meteredApp}.metered.live/api/v1/turn/credentials?apiKey=${meteredKey}`
        );
        if (meteredRes.ok) {
          const servers = await meteredRes.json();
          iceServers.push(...servers);
          console.log('[ICE] Fetched Metered TURN credentials:', servers.length, 'entries');
        } else {
          console.warn('[ICE] Metered API returned', meteredRes.status);
        }
      } catch (err) {
        console.warn('[ICE] Metered API error:', err.message);
      }
    }

    // ── Option 2: Custom TURN server from env ──
    const turnUrl = process.env.TURN_URL;
    const turnUser = process.env.TURN_USERNAME;
    const turnCred = process.env.TURN_CREDENTIAL;
    if (turnUrl && turnUser && turnCred) {
      // Support comma-separated URLs (e.g. turn:host:3478,turns:host:5349)
      const urls = turnUrl.split(',').map(u => u.trim()).filter(Boolean);
      iceServers.push({
        urls,
        username: turnUser,
        credential: turnCred,
      });
      // Also add TCP transport variant if only UDP was given
      if (urls.length === 1 && !urls[0].includes('transport=')) {
        iceServers.push({
          urls: `${urls[0]}?transport=tcp`,
          username: turnUser,
          credential: turnCred,
        });
      }
      console.log('[ICE] Using custom TURN server:', urls);
    }

    // Cache for 1 hour (Metered credentials are valid for 24h)
    if (iceServers.length > 0) {
      cachedIceServers = iceServers;
      iceCacheExpiry = Date.now() + 3600_000;
    }

    return res.json({ iceServers });
  } catch (err) {
    console.error('[ICE] Error building ICE config:', err);
    return res.json({ iceServers: [] });
  }
});

// Serve static files from the frontend build

// Connect to MongoDB (non-fatal — server starts even if DB is unavailable)
connectDB()
  .then(() => seedDefaultAdmin())
  .catch(err => {
    console.warn('MongoDB unavailable — continuing without database:', err.message);
  });

// HTTP Upload endpoints for fast transfer (non-private)
app.post('/api/upload/chunk', upload.single('chunk'), async (req, res) => {
  try {
    const { chunkIndex, totalChunks, fileName, transferId } = req.body;
    
    if (!req.file || !chunkIndex || !totalChunks || !fileName || !transferId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Save chunk buffer to file
    const chunkPath = path.join(uploadsDir, `${transferId}_chunk_${chunkIndex}`);
    await fs.writeFile(chunkPath, req.file.buffer);
    
    // Check if all chunks received
    const receivedChunks = [];
    for (let i = 0; i < parseInt(totalChunks); i++) {
      const chunkFile = path.join(uploadsDir, `${transferId}_chunk_${i}`);
      if (await fs.pathExists(chunkFile)) {
        receivedChunks.push(i);
      }
    }
    
    if (receivedChunks.length === parseInt(totalChunks)) {
      // Assemble file
      const finalPath = path.join(uploadsDir, `${transferId}_${fileName}`);
      const writeStream = fs.createWriteStream(finalPath);
      
      for (let i = 0; i < parseInt(totalChunks); i++) {
        const chunkFile = path.join(uploadsDir, `${transferId}_chunk_${i}`);
        const chunkData = await fs.readFile(chunkFile);
        writeStream.write(chunkData);
        await fs.remove(chunkFile); // Clean up chunk
      }
      
      writeStream.end();
      
      res.json({ 
        success: true, 
        complete: true, 
        downloadUrl: `/api/download/${transferId}/${fileName}`,
        receivedChunks: receivedChunks.length,
        totalChunks: parseInt(totalChunks)
      });
    } else {
      res.json({ 
        success: true, 
        complete: false,
        receivedChunks: receivedChunks.length,
        totalChunks: parseInt(totalChunks)
      });
    }
  } catch (error) {
    console.error('Chunk upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

app.get('/api/download/:transferId/:fileName', async (req, res) => {
  try {
    const { transferId, fileName } = req.params;
    const filePath = path.join(uploadsDir, `${transferId}_${fileName}`);
    
    if (!(await fs.pathExists(filePath))) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    const stats = await fs.stat(filePath);
    
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', stats.size);
    res.setHeader('Content-Type', 'application/octet-stream');
    
    const readStream = fs.createReadStream(filePath);
    readStream.pipe(res);
    
    // Clean up file after download (optional - you might want to keep it longer)
    readStream.on('end', async () => {
      setTimeout(async () => {
        try {
          await fs.remove(filePath);
          console.log(`Cleaned up file: ${filePath}`);
        } catch (err) {
          console.error('Cleanup error:', err);
        }
      }, 60000); // Delete after 1 minute
    });
    
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ error: 'Download failed' });
  }
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: corsOrigin,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

setIoInstance(io);

const connectedRooms = new Map(); 

io.on('connection', (socket) =>{
    console.log('User connected:', socket.id);
    
    socket.on('join', (data) => {
        const { roomId, role } = data; 
        console.log(`User ${socket.id} attempting to join room ${roomId} as ${role || 'receiver'}`);
        
        if (role === 'sender') {
            socket.join(roomId);
            socket.currentRoomId = roomId;
            console.log(`Sender ${socket.id} joined room ${roomId}`);
            return;
        }
        
        const roomStatus = connectedRooms.get(roomId);
        
        if (roomStatus && roomStatus.shareMode === 'single' && roomStatus.connected) {
            console.log(`Room ${roomId} is already occupied (single-user mode)`);
            socket.emit('room-occupied', { 
                message: 'This link has already been opened by another user. Single-user sharing allows only one receiver at a time.' 
            });
            return;
        }
        
        socket.join(roomId);
        socket.currentRoomId = roomId; 
        
        console.log(`Receiver ${socket.id} joined room ${roomId}`);
        
        if (roomStatus && roomStatus.shareMode === 'single') {
            roomStatus.connected = true;
            connectedRooms.set(roomId, roomStatus);
            console.log(`Room ${roomId} marked as connected (single-user mode) - first receiver`);
        }
        
        socket.to(roomId).emit('receiver-joined', { 
            userId: socket.id, 
            roomId: roomId 
        });
    });

    // Sender registers a room with its share mode
    socket.on('register-room', (data) => {
        const { roomId, shareMode } = data;
        console.log(`Registering room ${roomId} with mode: ${shareMode}`);
        connectedRooms.set(roomId, { connected: false, shareMode });
    });

    // Sender registers OTP → roomId so receivers can look it up without MongoDB
    socket.on('register-otp', (data) => {
        const { otp, roomId } = data;
        if (otp && roomId) {
            otpRoomMap.set(otp.toUpperCase(), roomId);
            console.log(`OTP registered: ${otp.toUpperCase()} → ${roomId}`);
        }
    });

    // Sender emits offer to a specific receiver
    socket.on('offer', (data) => {
        if (data.targetId) {
            // Multi-user mode: send to specific receiver
            console.log(`Offer from ${socket.id} to receiver ${data.targetId} in room ${data.roomId}`);
            io.to(data.targetId).emit('offer', { ...data, senderId: socket.id });
        } else {
            // Single-user mode: broadcast to room
            console.log(`Offer from ${socket.id} to room ${data.roomId}`);
            socket.to(data.roomId).emit('offer', { ...data, senderId: socket.id });
        }
    });

    // Receiver emits answer to sender
    socket.on('answer', (data) => {
        if (data.targetId) {
            console.log(`Answer from ${socket.id} to sender ${data.targetId} in room ${data.roomId}`);
            io.to(data.targetId).emit('answer', { ...data, senderId: socket.id });
        } else {
            console.log(`Answer from ${socket.id} to room ${data.roomId}`);
            socket.to(data.roomId).emit('answer', { ...data, senderId: socket.id });
        }
    });

    // ICE candidates between sender and receiver
    socket.on('candidate', (data) => {
        if (data.targetId) {
            console.log(`ICE candidate from ${socket.id} to ${data.targetId} in room ${data.roomId}`);
            io.to(data.targetId).emit('candidate', { ...data, senderId: socket.id });
        } else {
            console.log(`ICE candidate from ${socket.id} to room ${data.roomId}`);
            socket.to(data.roomId).emit('candidate', { ...data, senderId: socket.id });
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        

        if (socket.currentRoomId) {
            const roomStatus = connectedRooms.get(socket.currentRoomId);
            if (roomStatus && roomStatus.shareMode === 'single' && roomStatus.connected) {

                roomStatus.connected = false;
                connectedRooms.set(socket.currentRoomId, roomStatus);
                console.log(`Room ${socket.currentRoomId} marked as available (receiver disconnected)`);
            }
        }
    });
});


const port = process.env.PORT || 5000;
server.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log('CORS explicit allow list:', Array.from(baseAllowSet));
  console.log('Dynamic allowance: *.devtunnels.ms');
});
