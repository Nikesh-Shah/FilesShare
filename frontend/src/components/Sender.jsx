import React, { useState, useRef, useEffect } from 'react';
import QRCode from 'react-qr-code';
import { io } from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';
import { useNavigate } from 'react-router-dom';
import { Copy } from 'lucide-react';
import Nav from './Nav';
import { createFileShare, getFileShares, toggleDownloadPermission, deleteFileShare, deleteAllFileShares, updateFileShareStatus } from '../api/api';
import { Trash2, Link as LinkIcon, KeyRound, QrCode, CheckCircle2, Clock, Circle } from 'lucide-react';
import { createRoot } from 'react-dom/client';
import { getRtcConfig, prefetchIceConfig } from '../utils/iceConfig';

if (typeof window !== 'undefined' && window.CanvasRenderingContext2D && !CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function(x, y, width, height, radii) {
    if (typeof radii === 'number') {
      radii = { tl: radii, tr: radii, br: radii, bl: radii };
    } else {
      radii = { tl: 0, tr: 0, br: 0, bl: 0, ...radii };
    }
    this.beginPath();
    this.moveTo(x + radii.tl, y);
    this.lineTo(x + width - radii.tr, y);
    this.quadraticCurveTo(x + width, y, x + width, y + radii.tr);
    this.lineTo(x + width, y + height - radii.br);
    this.quadraticCurveTo(x + width, y + height, x + width - radii.br, y + height);
    this.lineTo(x + radii.bl, y + height);
    this.quadraticCurveTo(x, y + height, x, y + height - radii.bl);
    this.lineTo(x, y + radii.tl);
    this.quadraticCurveTo(x, y, x + radii.tl, y);
    this.closePath();
    return this;
  };
}

const deriveBackendUrl = () => {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  if (typeof window !== 'undefined') {
    const loc = window.location;
    if (/devtunnels\.ms$/i.test(loc.hostname)) {
      return loc.origin.replace(/5173/, '5000');
    }
  }
  // Use environment variable, then window.location.origin, then fallback
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return '';
};

const deriveFrontendUrl = () => {
  if (import.meta.env.VITE_FRONTEND_URL) return import.meta.env.VITE_FRONTEND_URL;
  if (typeof window !== 'undefined') return window.location.origin;
  return '';
};

const socket = io(deriveBackendUrl(), { withCredentials: true });

const Sender = () => {
  const navigate = useNavigate();
  const [files, setFiles] = useState([]);
  const [roomId, setRoomId] = useState(uuidv4());
  const [link, setLink] = useState('');
  const [qrLink, setQrLink] = useState('');
  const [status, setStatus] = useState('');
  const [isReady, setIsReady] = useState(false);
  const [password, setPassword] = useState('');
  const [shareMode, setShareMode] = useState('single');
  const [progress, setProgress] = useState(0);
  const [copied, setCopied] = useState({ link: false, password: false, qrLink: false });
  const qrSvgRef = useRef(null);
  const [fileHistory, setFileHistory] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [historyStatus, setHistoryStatus] = useState(new Map()); 
  const [downloadEnabled, setDownloadEnabled] = useState(true);
  const [historyToast, setHistoryToast] = useState('');
  const [activeShares, setActiveShares] = useState(new Map());
  const [deleteModal, setDeleteModal] = useState({ show: false, type: '', fileName: '', roomId: '' });
  const [shareType, setShareType] = useState('file'); // 'file' | 'text'
  const [textContent, setTextContent] = useState('');
  const [textLanguage, setTextLanguage] = useState('plain');


  const peersRef = useRef({});
  const dataChannelsRef = useRef({});
  const activeRoomsRef = useRef(new Set());
  const activeSharesRef = useRef(new Map()); // mirrors activeShares for socket callbacks
  const workerRef = useRef(null);

  useEffect(() => { loadFileHistory(); checkUserLogin(); prefetchIceConfig(); }, []);

  // Keep ref in sync with state so socket handlers always see latest rooms
  useEffect(() => { activeSharesRef.current = activeShares; }, [activeShares]);

  // Re-register all active rooms whenever the socket (re)connects.
  // This covers: initial connect, tab throttle-induced disconnect, network blip.
  useEffect(() => {
    const reRegisterRooms = () => {
      const shares = activeSharesRef.current;
      if (!shares.size) return;
      console.log(`[Socket reconnect] Re-registering ${shares.size} active room(s)`);
      shares.forEach((shareInfo, roomId) => {
        socket.emit('join', { roomId, role: 'sender' });
        socket.emit('register-room', { roomId, shareMode: shareInfo.shareMode || 'single' });
        if (shareInfo.password) {
          socket.emit('register-otp', { otp: shareInfo.password, roomId });
        }
      });
    };

    socket.on('connect', reRegisterRooms);

    // Visibility change: when the user switches back to this tab, ensure the
    // socket is connected and rooms are re-registered (handles browser tab throttling).
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        if (!socket.connected) {
          socket.connect();
        } else {
          reRegisterRooms();
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      socket.off('connect', reRegisterRooms);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  useEffect(() => {
    const handleLoggedOut = () => {
      setCurrentUser(null);
      setFileHistory([]);
      setHistoryStatus(new Map());
    };
    const handleLoggedIn = () => {
      checkUserLogin();
      loadFileHistory();
    };
    const handleStorage = (e) => {
      if (!e || e.key === null || e.key === 'token' || e.key === 'email') {
        const email = localStorage.getItem('email') || sessionStorage.getItem('email');
        if (!email) handleLoggedOut(); else handleLoggedIn();
      }
    };
    window.addEventListener('userLogout', handleLoggedOut);
    window.addEventListener('userLogin', handleLoggedIn);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('userLogout', handleLoggedOut);
      window.removeEventListener('userLogin', handleLoggedIn);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const checkUserLogin = () => { const email = localStorage.getItem('email') || sessionStorage.getItem('email'); setCurrentUser(email); };
  const loadFileHistory = async () => { try { const senderEmail = localStorage.getItem('email') || sessionStorage.getItem('email'); if (!senderEmail) { setFileHistory([]); return; } const response = await getFileShares(senderEmail); const list = response.data.fileShares || []; setFileHistory(list);
    const m = new Map(historyStatus);
    list.forEach(it => { if (it.status) m.set(it.roomId, it.status); });
    setHistoryStatus(m);
  } catch { setFileHistory([]); } };
  const formatBytes = (bytes) => { if (bytes === 0) return '0 B'; if (!bytes) return ''; const units=['B','KB','MB','GB','TB']; const i=Math.floor(Math.log(bytes)/Math.log(1024)); return `${(bytes/Math.pow(1024,i)).toFixed(2)} ${units[i]}`; };
  const generatePassword = () => { const chars='ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'; let r=''; for(let i=0;i<6;i++) r+=chars[Math.floor(Math.random()*chars.length)]; return r; };
  const copy = async (text,key) => { try { await navigator.clipboard.writeText(text); setCopied(c=>({...c,[key]:true})); setTimeout(()=>setCopied(c=>({...c,[key]:false})),1200);} catch {} };
  const handleFile = (e) => {
    const list = Array.from(e.target.files || []);
    if (!list.length) return;
    if (!currentUser && list.some(f => f.size > 1024*1024*1024)) {
      setStatus('Error: Files larger than 1GB require login.');
      setFiles([]);
      return;
    }
    setFiles(list);
    const total = list.reduce((s,f)=>s+f.size,0);
    const preview = list.length === 1 ? `${list[0].name} (${formatBytes(list[0].size)})` : `${list[0].name} + ${list.length-1} more (${formatBytes(total)})`;
    setStatus(`Selected: ${preview}`);
  };
  const setupFileSharing = async () => { if (!files || files.length===0) return; try { const newRoomId=uuidv4(); const filePassword=generatePassword(); setRoomId(newRoomId); setPassword(filePassword); setStatus('Preparing files...'); setProgress(0); const totalSize=files.reduce((s,f)=>s+f.size,0);
    const shareInfo={ roomId:newRoomId, password:filePassword, files:[...files], shareMode, originalTotalSize: totalSize };
    setActiveShares(prev=>{const m=new Map(prev); m.set(newRoomId,shareInfo); return m;}); activeRoomsRef.current.add(newRoomId);
    if (currentUser) {
      const first = files[0];
      setFileHistory(prev => [{
        senderEmail: currentUser,
        fileName: files.length>1 ? `${first.name} + ${files.length-1} more` : first.name,
        fileSize: totalSize,
        roomId: newRoomId,
        password: filePassword,
        shareMode,
        downloadEnabled,
        createdAt: new Date().toISOString()
      }, ...(prev || [])]);
      setHistoryStatus(prev => { const m = new Map(prev); m.set(newRoomId, 'not-used'); return m; });
    }
    try { const senderEmail=localStorage.getItem('email')||sessionStorage.getItem('email'); if (senderEmail) { const first = files[0]; await createFileShare({ senderEmail, fileName: files.length>1 ? `${first.name} + ${files.length-1} more` : first.name, fileSize: totalSize, roomId:newRoomId, password:filePassword, shareMode, downloadEnabled }); } } catch {}
    socket.emit('join',{roomId:newRoomId,role:'sender'}); socket.emit('register-room',{roomId:newRoomId,shareMode}); socket.emit('register-otp',{otp:filePassword,roomId:newRoomId});
    const shareLink = `${deriveFrontendUrl()}/receiver/${newRoomId}`; const shareLinkWithPassword = `${shareLink}?password=${filePassword}`; setLink(shareLink); setQrLink(shareLinkWithPassword); setIsReady(true); setStatus('Ready. Keep page open.'); } catch { setStatus('Setup error.'); } };

  const setupTextSharing = async () => {
    if (!textContent.trim()) return;
    try {
      const newRoomId = uuidv4();
      const textPassword = generatePassword();
      setRoomId(newRoomId); setPassword(textPassword); setStatus('Preparing text share...'); setProgress(0);
      const shareInfo = { roomId: newRoomId, password: textPassword, contentType: 'text', textContent: textContent.trim(), textLanguage, shareMode };
      setActiveShares(prev => { const m = new Map(prev); m.set(newRoomId, shareInfo); return m; }); activeRoomsRef.current.add(newRoomId);
      socket.emit('join', { roomId: newRoomId, role: 'sender' }); socket.emit('register-room', { roomId: newRoomId, shareMode }); socket.emit('register-otp', { otp: textPassword, roomId: newRoomId });
      const shareLink = `${deriveFrontendUrl()}/receiver/${newRoomId}`;
      const shareLinkWithPassword = `${shareLink}?password=${textPassword}`;
      setLink(shareLink); setQrLink(shareLinkWithPassword); setIsReady(true); setStatus('Ready. Keep page open.');
    } catch { setStatus('Setup error.'); }
  };

  useEffect(() => {
  const sendFile = async (file, channelOrChannels, roomId, peer, onDone) => {
      const channels = Array.isArray(channelOrChannels) ? channelOrChannels : [channelOrChannels];
      const controlChannel = channels[0];
  if (!workerRef.current) {
        workerRef.current = new Worker(new URL('../workers/fileChunkWorker.js', import.meta.url), { type: 'module' });
      }
  let seqSent = 0; 
      let sentBytes = 0;
      const fileSize = file.size;
      const startTime = performance.now();
  // ── Pro-level tunables ──
  // Start larger, cap higher — the adaptive loop will shrink if relay/WAN
  let chunkSize = 256 * 1024;            // 256 KB initial
  let maxChunkCap = 1024 * 1024;         // 1 MB cap (LAN can go higher)
  const minChunk = 64 * 1024;            // 64 KB floor
  let MAX_BUFFERED_AMOUNT = 16 * 1024 * 1024; // 16 MB (scales per profile)
      let workerPaused = false;
      let ended = false;
  console.debug('[TUNING] params', { initialChunk: chunkSize, maxChunkCap, channels: channels.length });
      const updateProgress = () => {
        const now = performance.now();
        if (now - (updateProgress.last || 0) < 250) return;
        updateProgress.last = now;
        const pct = Math.min(100, Math.round((sentBytes / fileSize) * 100));
        setProgress(pct);
        if (pct < 100) {
          const elapsed = (now - startTime) / 1000;
          const speed = sentBytes / Math.max(0.001, elapsed);
          const speedText = speed > 1024 * 1024 ? `${(speed / 1024 / 1024).toFixed(1)} MB/s` : `${(speed / 1024).toFixed(1)} KB/s`;
          const remaining = fileSize - sentBytes;
          const etaSec = remaining / Math.max(1, speed);
          let etaText = '';
          if (Number.isFinite(etaSec)) {
            if (etaSec > 90) { const m = Math.floor(etaSec/60); const s = Math.floor(etaSec%60); etaText = `${m}m ${s}s`; }
            else { etaText = `${Math.ceil(etaSec)}s`; }
          }
          setStatus(`Transferring: ${pct}% - ${speedText}${etaText?` ETA ${etaText}`:''}`);
        }
      };
  let lastRttMs = null; let rttHighStreak = 0; let rttLowStreak = 0;
  let pathProfile = 'unknown'; 
  const setThresholds = () => {
    const thr = Math.min(1024 * 1024, Math.max(64 * 1024, chunkSize * 2));
    channels.forEach(ch => { try { ch.bufferedAmountLowThreshold = thr; } catch {} });
  };
  const adapt = () => {
    if (lastRttMs == null) return;
    if (lastRttMs > 180) { 
      rttHighStreak++; rttLowStreak = 0;
      if (rttHighStreak >= 3 && chunkSize > minChunk) { chunkSize = Math.max(minChunk, Math.floor(chunkSize * 0.7 / 1024) * 1024); rttHighStreak = 0; setThresholds(); console.debug('[ADAPT] shrink chunk', chunkSize); }
    } else if (lastRttMs < 80) { 
      rttLowStreak++; rttHighStreak = 0;
      if (rttLowStreak >= 5 && chunkSize < maxChunkCap) { chunkSize = Math.min(maxChunkCap, Math.floor(chunkSize * 1.3 / 1024) * 1024); rttLowStreak = 0; setThresholds(); console.debug('[ADAPT] grow chunk', chunkSize); }
    }
  };
      const sendQueues = [];
      const channelSend = (ch, ab) => {
        if (ch.bufferedAmount > MAX_BUFFERED_AMOUNT) return false;
        try { ch.send(ab); sentBytes += ab.byteLength; return true; } catch (e) {
          console.warn('send failed, downshifting chunk', e?.message||e);
          // Downshift chunk size on send failure
          if (chunkSize > minChunk) { chunkSize = Math.max(minChunk, Math.floor(chunkSize * 0.5 / 1024) * 1024); }
          return false;
        }
      };
      const sendStriped = (ab, seq) => {
        // Compute target channel by sequence index
        const idx = seq % channels.length;
        const ch = channels[idx];
        if (!ch || ch.readyState !== 'open') return false;
        if (!channelSend(ch, ab)) {
          // queue for later flush
          sendQueues[idx] = sendQueues[idx] || [];
          sendQueues[idx].push(ab);
        }
        return true;
      };
  const flushQueues = () => {
        channels.forEach((ch, i) => {
          if (!sendQueues[i] || !sendQueues[i].length) return;
          if (ch.readyState !== 'open') return;
            while (sendQueues[i].length && ch.bufferedAmount < MAX_BUFFERED_AMOUNT * 0.6) {
              const ab = sendQueues[i][0];
              if (!channelSend(ch, ab)) break;
              sendQueues[i].shift();
            }
        });
      };
  // Low threshold callbacks for faster draining + resume
  const resumeIfClear = () => {
    const clear = channels.every(c => c.bufferedAmount < Math.max(1*1024*1024, MAX_BUFFERED_AMOUNT * 0.2));
    if (workerPaused && clear) { workerPaused = false; try { workerRef.current.postMessage({ cmd: 'resume' }); } catch {} }
  };
  channels.forEach(ch => { try { if (!ch.bufferedAmountLowThreshold) ch.bufferedAmountLowThreshold = 256 * 1024; ch.onbufferedamountlow = () => { flushQueues(); resumeIfClear(); }; } catch {} });
      let flushTimer = null;
      const finalize = () => {
        if (ended) return;
        ended = true;
  const endMsg = { type: 'END', totalBytes: fileSize };
        try { controlChannel.send(JSON.stringify(endMsg)); } catch { }
        const elapsed = (performance.now() - startTime) / 1000;
        const speed = sentBytes / Math.max(0.001, elapsed);
        const speedText = speed > 1024 * 1024 ? `${(speed / 1024 / 1024).toFixed(2)} MB/s` : `${(speed / 1024).toFixed(1)} KB/s`;
  setProgress(100);
  setStatus(`Sent ${file.name} at ${speedText}`);
  // Signal end of this file only; outer controller will decide next or all done
  try { controlChannel.send(JSON.stringify({ type:'FILE_END', name: file.name, size: fileSize })); } catch {}
  try { onDone && onDone(); } catch {}
        clearInterval(statsTimer); clearInterval(instantTimer); clearInterval(windowAdjustTimer); clearInterval(pcStatsTimer); if (flushTimer) clearInterval(flushTimer);
      };
      const statsTimer = setInterval(() => {
        const elapsed = (performance.now() - startTime) / 1000;
        if (elapsed <= 0) return;
        const mbps = (sentBytes * 8 / 1_000_000) / elapsed;
        const maxBuf = channels.reduce((m, c) => Math.max(m, c.bufferedAmount), 0);
  console.debug(`[SPEED-AVG] t=${elapsed.toFixed(1)}s sent=${(sentBytes / 1024 / 1024).toFixed(2)}MB avg=${mbps.toFixed(2)}Mbps bufMax=${maxBuf} chunk=${(chunkSize / 1024)}KB chans=${channels.length}`);
      }, 2000);
      let lastSampleBytes = 0; let lastSampleTime = startTime;
      const instantTimer = setInterval(() => {
        const now = performance.now();
        const deltaBytes = sentBytes - lastSampleBytes; const deltaTime = (now - lastSampleTime) / 1000;
        if (deltaTime > 0) {
          const instBps = deltaBytes / deltaTime; const instMbps = (instBps * 8) / 1_000_000;
          const maxBuf = channels.reduce((m, c) => Math.max(m, c.bufferedAmount), 0);
          console.debug(`[SPEED-INST] ${(instBps / 1024 / 1024).toFixed(2)} MB/s (${instMbps.toFixed(2)} Mbps) bufMax=${maxBuf} chunk=${(chunkSize / 1024)}KB chans=${channels.length}`);
        }
        lastSampleBytes = sentBytes; lastSampleTime = now;
      }, 1000);
  const windowAdjustTimer = setInterval(() => {  }, 5000);
      // ── RTT-based adaptive profiling — polls every 1.5 s for faster reaction ──
      const pcStatsTimer = setInterval(async () => {
        if (!peer || peer.connectionState === 'closed') return;
        try {
          const report = await peer.getStats();
          let rtt = null; let bytesSentPair = 0; let found = false; let localId=null; let remoteId=null; let selectedType=null;
          report.forEach(stat => {
            if (stat.type === 'candidate-pair' && stat.state === 'succeeded') {
              if (!found || stat.nominated) { rtt = stat.currentRoundTripTime; bytesSentPair = stat.bytesSent || bytesSentPair; localId = stat.localCandidateId; remoteId = stat.remoteCandidateId; found = true; }
            }
          });
          if (localId || remoteId) {
            let localType=null, remoteType=null;
            report.forEach(s => {
              if (s.id === localId && (s.type === 'local-candidate' || s.type === 'candidate')) localType = s.candidateType || s.type;
              if (s.id === remoteId && (s.type === 'remote-candidate' || s.type === 'candidate')) remoteType = s.candidateType || s.type;
            });
            selectedType = localType || remoteType;
          }
          if (rtt != null) {
            lastRttMs = rtt * 1000;
            const wasProfile = pathProfile;
            if (selectedType === 'relay') {
              // TURN relay — keep chunks small, buffer modest
              pathProfile = 'relay'; maxChunkCap = 128 * 1024; MAX_BUFFERED_AMOUNT = 4 * 1024 * 1024;
            } else if (selectedType === 'host' || selectedType === 'srflx' || selectedType === 'prflx') {
              if (lastRttMs < 5) {
                // Ultra-low latency LAN — max everything
                pathProfile = 'lan'; maxChunkCap = 2 * 1024 * 1024; MAX_BUFFERED_AMOUNT = 64 * 1024 * 1024;
              } else if (lastRttMs < 30) {
                pathProfile = 'lan'; maxChunkCap = 1024 * 1024; MAX_BUFFERED_AMOUNT = 32 * 1024 * 1024;
              } else {
                pathProfile = 'wan'; maxChunkCap = 512 * 1024; MAX_BUFFERED_AMOUNT = 16 * 1024 * 1024;
              }
            }
            if (pathProfile !== wasProfile) console.debug('[PROFILE]', { pathProfile, maxChunkCap, MAX_BUFFERED_AMOUNT });
            // Aggressively ramp on LAN detection
            if (pathProfile === 'lan' && chunkSize < maxChunkCap) {
              chunkSize = Math.min(maxChunkCap, Math.max(chunkSize, 512 * 1024));
              setThresholds();
            }
            console.debug(`[PC] RTT ${lastRttMs.toFixed(1)}ms pairBytes ${(bytesSentPair / 1024 / 1024).toFixed(2)}MB type=${selectedType||'n/a'} profile=${pathProfile}`);
            adapt();
          }
        } catch { }
      }, 1500);
  {
  // Periodic queue flush and resume watchdog
  flushTimer = setInterval(() => { flushQueues(); resumeIfClear(); }, 200);
        const jobId = crypto.randomUUID();
        workerRef.current.onmessage = async (e) => {
          const { type, payload, error } = e.data;
          if (type === 'error') { setStatus(`Worker error: ${error}`); return; }
          if (type === 'start') { }
          if (type === 'chunk') {
            const anyHigh = channels.some(c=>c.bufferedAmount > MAX_BUFFERED_AMOUNT);
            if (anyHigh && !workerPaused) { workerPaused = true; workerRef.current.postMessage({ cmd: 'pause' }); }
            sendStriped(payload, seqSent++);
            flushQueues();
            updateProgress();
            if (workerPaused && channels.every(c=>c.bufferedAmount < MAX_BUFFERED_AMOUNT * 0.4)) { workerPaused = false; workerRef.current.postMessage({ cmd: 'resume' }); }
          }
          if (type === 'end') { finalize(seqSent); }
        };
        workerRef.current.postMessage({ file, chunkSize, jobId });
  }
    };
    const handleReceiverJoined = async (data) => {
      const { roomId: receiverRoomId, userId } = data;
      console.log(`Receiver ${userId} joined room ${receiverRoomId}`);
      // Mark as in-progress as soon as a receiver joins
      try { setHistoryStatus(prev => { const m = new Map(prev); m.set(receiverRoomId, 'in-progress'); return m; }); } catch {}
      try { updateFileShareStatus && updateFileShareStatus(receiverRoomId, 'in-progress').catch(()=>{}); } catch {}
      // Fetch TURN credentials before creating peer connection
      const rtcConfig = await getRtcConfig();
      setActiveShares(currentShares => {
        const shareInfo = currentShares.get(receiverRoomId);
        if (!shareInfo) { console.log(`No active share found for room ${receiverRoomId}`); return currentShares; }
    const peer = new RTCPeerConnection(rtcConfig);
  // ── Create multiple parallel data channels for maximum throughput ──
  // Channel 0 = control + data, channels 1-3 = data-only (striped sends)
  let dataChannel; let channelList = [];
  const NUM_CHANNELS = 4;
  for (let ci = 0; ci < NUM_CHANNELS; ci++) {
    const label = ci === 0 ? 'fileTransfer' : `fileTransfer-${ci}`;
    // ordered:true on channel 0 for control messages; ordered:false on extra
    // channels for maximum throughput (order is handled by seq numbers)
    const ch = peer.createDataChannel(label, {
      ordered: ci === 0,
      ...(ci > 0 ? { maxRetransmits: 3 } : {}),
    });
    try { ch.bufferedAmountLowThreshold = 512 * 1024; } catch(_){}
    try { ch.binaryType = 'arraybuffer'; } catch(_){}
    channelList.push(ch);
    if (ci === 0) dataChannel = ch;
  }
        peersRef.current[`${receiverRoomId}-${userId}`] = peer;
        dataChannelsRef.current[`${receiverRoomId}-${userId}`] = channelList;
        let opened=0; let errorCount=0; channelList.forEach((ch,idx)=>{ 
          ch.onopen=()=>{ if(++opened===channelList.length){ setStatus('Connection ready. Waiting for password...'); console.log(`All ${channelList.length} data channels opened for room ${receiverRoomId}`);} }; 
          ch.onclose=()=>{ console.log(`📡 DataChannel closed (${ch.label}) for room ${receiverRoomId}`); if(++errorCount >= channelList.length/2) { setStatus('Connection lost. Please refresh and try again.'); setProgress(0); } }; 
          ch.onerror=(err)=>{ console.error(`📡 DataChannel error (${ch.label}):`, err); if(++errorCount >= channelList.length/2) { setStatus('Connection unstable. Please retry.'); } }; 
        });
  dataChannel.onmessage = (event) => { if (typeof event.data === 'string') { let message; try { message = JSON.parse(event.data); } catch { return; } if (message.type === 'password') { const si = activeShares.get(receiverRoomId) || shareInfo; if (message.password === si.password) {
              if (si.contentType === 'text') {
                setStatus('Password verified. Sending text...');
                if (dataChannel.readyState === 'open') {
                  dataChannel.send(JSON.stringify({ type: 'TEXT_PAYLOAD', text: si.textContent, language: si.textLanguage || 'plain' }));
                  dataChannel.send(JSON.stringify({ type: 'ALL_DONE' }));
                  setStatus('Text sent.');
                  try { setHistoryStatus(prev => { const m = new Map(prev); m.set(receiverRoomId, 'completed'); return m; }); } catch {}
                  try { updateFileShareStatus && updateFileShareStatus(receiverRoomId, 'completed').catch(()=>{}); } catch {}
                }
                return;
              }
              const list = si.files || (si.file ? [si.file] : []); if (!list.length) return; setStatus('Password verified. Sending files...'); let idx = 0; const sendNext = () => {
                if (idx >= list.length) { try { dataChannel.send(JSON.stringify({ type:'ALL_DONE' })); } catch {} setStatus('All files sent.');
                  // Mark history status as completed and sync
                  try { setHistoryStatus(prev => { const m = new Map(prev); m.set(receiverRoomId, 'completed'); return m; }); } catch {}
                  try { updateFileShareStatus && updateFileShareStatus(receiverRoomId, 'completed').catch(()=>{}); } catch {}
                  return; }
                const f = list[idx];
                const meta = { type:'metadata', name:f.name, fileType:f.type, size:f.size, originalSize:f.size };
                if (dataChannel && dataChannel.readyState==='open') {
                  dataChannel.send(JSON.stringify(meta));
                  setTimeout(() => { if (dataChannel.readyState==='open') { sendFile(f, channelList, receiverRoomId, peer, () => { idx++; sendNext(); }); } }, 10);
                }
              };
              sendNext();
            } else { if (dataChannel.readyState==='open'){ dataChannel.send(JSON.stringify({ type:'password-result', success:false })); } } } } };
        peer.onicecandidate = (event)=>{ if(event.candidate){ socket.emit('candidate',{ candidate:event.candidate, roomId:receiverRoomId, targetId:userId }); } };
        // Monitor ICE connection state for cross-network debugging & auto-restart
        peer.oniceconnectionstatechange = () => {
          const state = peer.iceConnectionState;
          console.log(`[ICE] Connection state for ${receiverRoomId}: ${state}`);
          if (state === 'failed') {
            console.warn('[ICE] Connection failed — attempting ICE restart');
            setStatus('Connection failed. Retrying...');
            peer.createOffer({ iceRestart: true }).then(offer => {
              peer.setLocalDescription(offer);
              socket.emit('offer', { offer, roomId: receiverRoomId, targetId: userId });
            }).catch(err => console.error('[ICE] Restart error:', err));
          } else if (state === 'disconnected') {
            setStatus('Connection interrupted. Waiting for recovery...');
          } else if (state === 'connected' || state === 'completed') {
            console.log('[ICE] Peer connected successfully');
          }
        };
        const createOffer = async () => { try { const offer = await peer.createOffer({ offerToReceiveAudio:false, offerToReceiveVideo:false, iceRestart:false }); await peer.setLocalDescription(offer); socket.emit('offer',{ offer, roomId:receiverRoomId, targetId:userId }); console.log(`Offer sent to ${userId}`); } catch(err){ console.error('Error creating offer:', err); } };
        createOffer();
        return currentShares;
      });
    };
    const handleAnswer = async (data) => { const { senderId, answer, roomId: answerRoomId } = data; const peerKey = `${answerRoomId}-${senderId}`; const peer = peersRef.current[peerKey]; if (peer) { try { await peer.setRemoteDescription(new RTCSessionDescription(answer)); } catch (err) { console.error('Error setting remote description:', err); } } };
    const handleCandidate = async (data) => { const { senderId, candidate, roomId: candidateRoomId } = data; const peerKey = `${candidateRoomId}-${senderId}`; const peer = peersRef.current[peerKey]; if (peer) { try { await peer.addIceCandidate(new RTCIceCandidate(candidate)); } catch (err) { console.error('Error adding ice candidate:', err); } } };
    socket.on('receiver-joined', handleReceiverJoined); socket.on('answer', handleAnswer); socket.on('candidate', handleCandidate);
    return () => { socket.off('receiver-joined', handleReceiverJoined); socket.off('answer', handleAnswer); socket.off('candidate', handleCandidate); };
  }, [activeShares]);

  // UI
  return (
    <div className="min-h-screen bg-gray-50">
      {/* <Nav /> */}
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">File Sender</h1>
          <p className="mt-1 text-gray-600">Share files using WebRTC.</p>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">Setup</h2>
            {/* Share type tab switcher */}
            <div className="mt-4 flex rounded-md border border-gray-200 overflow-hidden text-sm font-medium">
              <button
                onClick={() => { setShareType('file'); setIsReady(false); setLink(''); setStatus(''); }}
                className={`flex-1 py-2 transition-colors ${shareType === 'file' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
              >Files</button>
              <button
                onClick={() => { setShareType('text'); setIsReady(false); setLink(''); setStatus(''); }}
                className={`flex-1 py-2 transition-colors border-l border-gray-200 ${shareType === 'text' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
              >Text / Code</button>
            </div>
            <div className="mt-4 space-y-5">
              {shareType === 'file' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Select Files</label>
                  <input type="file" multiple onChange={handleFile} className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                </div>
              ) : (
                <>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-700">Text / Code</label>
                      <select
                        value={textLanguage}
                        onChange={e => setTextLanguage(e.target.value)}
                        className="text-xs border border-gray-300 rounded-md px-2 py-1 text-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="plain">Plain text</option>
                        <option value="javascript">JavaScript</option>
                        <option value="typescript">TypeScript</option>
                        <option value="python">Python</option>
                        <option value="java">Java</option>
                        <option value="csharp">C#</option>
                        <option value="cpp">C++</option>
                        <option value="html">HTML</option>
                        <option value="css">CSS</option>
                        <option value="sql">SQL</option>
                        <option value="bash">Bash</option>
                        <option value="json">JSON</option>
                        <option value="yaml">YAML</option>
                        <option value="xml">XML</option>
                        <option value="markdown">Markdown</option>
                        <option value="other">Other code</option>
                      </select>
                    </div>
                    <textarea
                      value={textContent}
                      onChange={e => setTextContent(e.target.value)}
                      rows={8}
                      placeholder={textLanguage === 'plain' ? 'Type or paste your message here...' : `Paste your ${textLanguage} code here...`}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono text-gray-800 placeholder-gray-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 resize-y"
                    />
                    <p className="mt-1 text-xs text-gray-500">{textContent.length.toLocaleString()} characters</p>
                  </div>
                </>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Share Mode</label>
                <div className="flex gap-6 text-sm text-gray-700">
                  <label className="flex items-center gap-2"><input type="radio" value="single" checked={shareMode==='single'} onChange={e=>setShareMode(e.target.value)} />Single User</label>
                  <label className="flex items-center gap-2"><input type="radio" value="multi" checked={shareMode==='multi'} onChange={e=>setShareMode(e.target.value)} />Multiple Users</label>
                </div>
              </div>
              {shareType === 'file' ? (
                <button onClick={setupFileSharing} disabled={!files || files.length===0} className="w-full py-2.5 px-4 rounded-md text-sm font-semibold shadow-sm disabled:bg-gray-400 disabled:cursor-not-allowed bg-blue-600 text-white hover:bg-blue-700">Start File Share</button>
              ) : (
                <button onClick={setupTextSharing} disabled={!textContent.trim()} className="w-full py-2.5 px-4 rounded-md text-sm font-semibold shadow-sm disabled:bg-gray-400 disabled:cursor-not-allowed bg-blue-600 text-white hover:bg-blue-700">Share Text</button>
              )}
            </div>
          </section>
          <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">Share Details</h2>
            {status && <div className={`mt-4 flex items-start gap-2 rounded-md border p-3 text-sm ${status.toLowerCase().includes('error')?'border-red-300 bg-red-50 text-red-700': status.toLowerCase().includes('waiting')?'border-gray-200 bg-gray-50 text-gray-700':'border-blue-200 bg-blue-50 text-blue-800'}`}><p>{status}</p></div>}
            {progress>0 && progress<100 && (<div className="mt-4"><div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-200"><div className="h-full rounded-full bg-blue-600 transition-[width]" style={{width:`${progress}%`}} /></div><p className="mt-1 text-xs text-gray-600">{progress}%</p></div>)}
            {isReady && link && (
              <div className="mt-5 space-y-4">
                {/* OTP Share Code — prominent */}
                <div className="rounded-lg border-2 border-blue-200 bg-blue-50 p-4 text-center">
                  <p className="text-xs font-semibold uppercase tracking-widest text-blue-500 mb-2">Share Code</p>
                  <div className="flex justify-center gap-2 mb-3">
                    {password.split('').map((ch, i) => (
                      <span key={i} className="flex h-10 w-9 items-center justify-center rounded-md bg-white border border-blue-300 text-xl font-bold text-blue-700 shadow-sm">{ch}</span>
                    ))}
                  </div>
                  <button onClick={() => copy(password, 'password')} className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-700">
                    {copied.password ? '✓ Copied!' : 'Copy Code'}
                  </button>
                  <p className="mt-2 text-xs text-blue-600">Receiver enters this code at <span className="font-mono font-semibold">/receive</span></p>
                </div>
                <div><label className="block text-sm font-medium text-gray-700 mb-2">Share Link</label><div className="flex"><input type="text" value={link} readOnly className="flex-1 rounded-l-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm" /><a href={link} target="_blank" rel="noopener noreferrer" className="rounded-none border-t border-b border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-blue-600 hover:bg-gray-50 flex items-center" title="Open link in new tab">Open</a><button onClick={()=>copy(link,'link')} className="rounded-r-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">{copied.link?'Copied!':'Copy'}</button></div></div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">QR Code (includes password)</label>
                  <div className="flex flex-col items-center space-y-3 p-4 border border-gray-200 rounded-lg bg-gray-50">
                    <div className="bg-white p-3 rounded-lg">
                      <div ref={qrSvgRef}>
                        <QRCode value={qrLink} size={150} level="M" />
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 justify-center">
                      <button onClick={()=>copy(qrLink,'qrLink')} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
                        <Copy className="h-4 w-4" />{copied.qrLink?'Copied!':'Copy QR Link'}
                      </button>
                      <button
                        onClick={() => {
                          const url = `${deriveFrontendUrl()}/qr?` + new URLSearchParams({ value: qrLink, title: 'Scan QR Code' }).toString();
                          window.open(url, '_blank');
                        }}
                        className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                      >
                        Open Large View
                      </button>
                      <button
                        onClick={() => {
                          // Export the QR SVG to PNG and trigger download
                          try {
                            const svg = qrSvgRef.current?.querySelector('svg');
                            if (!svg) return;
                const serializer = new XMLSerializer();
                const svgStr = serializer.serializeToString(svg);
                const svgBlob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
                const url = URL.createObjectURL(svgBlob);
                const img = new Image();
                img.onload = () => {
                  const scale = 4;
                  const padding = 24 * scale;
                  const canvas = document.createElement('canvas');
                  canvas.width = img.width * scale + padding * 2;
                  canvas.height = img.height * scale + padding * 2;
                  const ctx = canvas.getContext('2d');
                  ctx.fillStyle = '#ffffff';
                  ctx.fillRect(0, 0, canvas.width, canvas.height);
                  ctx.imageSmoothingEnabled = false;
                  ctx.drawImage(img, padding, padding, img.width * scale, img.height * scale);
                  URL.revokeObjectURL(url);
                  canvas.toBlob((blob) => {
                                if (!blob) return;
                                const a = document.createElement('a');
                                a.href = URL.createObjectURL(blob);
                                a.download = 'share-qr.png';
                                document.body.appendChild(a);
                                a.click();
                                document.body.removeChild(a);
                              }, 'image/png');
                            };
                            img.src = url;
                          } catch (e) {
                            console.error('QR export failed', e);
                          }
                        }}
                        className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                      >
                        Download QR
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 text-center">Scan to open link with password.</p>
                  </div>
                </div>
              </div>) }
          </section>
        </div>

        {/* History for logged-in users */}
  {currentUser && (
          <section className="mt-8 rounded-lg border border-gray-200 bg-white p-5 shadow-sm relative">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">History</h2>
              {fileHistory?.length > 0 && (
                <button
                  onClick={async () => { try { await deleteAllFileShares(currentUser); await loadFileHistory(); } catch {} }}
                  className="text-sm rounded-md border border-gray-300 bg-white px-3 py-1.5 text-gray-700 hover:bg-gray-50"
                >
                  Delete All
                </button>
              )}
            </div>
            {historyToast && (
              <div className="absolute right-4 top-4 rounded-md bg-gray-900/90 px-2 py-1 text-xs font-medium text-white shadow">
                {historyToast}
              </div>
            )}

            {!fileHistory || fileHistory.length === 0 ? (
              <p className="mt-3 text-sm text-gray-600">No shares yet. Start sharing to see your history here.</p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                {/* Helper to download QR as PNG for a given link */}
                {/* eslint-disable-next-line jsx-a11y/no-redundant-roles */}
                <span role="note" className="hidden" aria-hidden="true"></span>
                { /* Helper function defined inline to avoid re-render issues */ }
                {(() => {
                  if (!window.__downloadQrPng) {
                    window.__downloadQrPng = (value, filename = 'share-qr.png') => {
                      try {
                        const container = document.createElement('div');
                        container.style.position = 'fixed';
                        container.style.left = '-9999px';
                        container.style.top = '0';
                        document.body.appendChild(container);
                        const root = createRoot(container);
                        root.render(React.createElement(QRCode, { value, size: 150, level: 'M' }));
                        setTimeout(() => {
                          const svg = container.querySelector('svg');
                          if (!svg) { root.unmount(); document.body.removeChild(container); return; }
                          const serializer = new XMLSerializer();
                          const svgStr = serializer.serializeToString(svg);
                          const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
                          const url = URL.createObjectURL(blob);
                          const img = new Image();
                          img.onload = () => {
                            const scale = 4;
                            const padding = 24 * scale;
                            const canvas = document.createElement('canvas');
                            canvas.width = img.width * scale + padding * 2;
                            canvas.height = img.height * scale + padding * 2;
                            const ctx = canvas.getContext('2d');
                            ctx.fillStyle = '#ffffff';
                            ctx.fillRect(0, 0, canvas.width, canvas.height);
                            ctx.imageSmoothingEnabled = false;
                            ctx.drawImage(img, padding, padding, img.width * scale, img.height * scale);
                            URL.revokeObjectURL(url);
                            canvas.toBlob((png) => {
                              if (!png) { root.unmount(); document.body.removeChild(container); return; }
                              const a = document.createElement('a');
                              a.href = URL.createObjectURL(png);
                              a.download = filename;
                              document.body.appendChild(a);
                              a.click();
                              document.body.removeChild(a);
                              root.unmount();
                              document.body.removeChild(container);
                            }, 'image/png');
                          };
                          img.src = url;
                        }, 0);
                      } catch (e) { /* no-op */ }
                    };
                  }
                })()}
        <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-gray-700">File</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-700">Size</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-700">Password</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-700">Mode</th>
          <th className="px-3 py-2 text-left font-medium text-gray-700">Status</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-700">Download</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-700">Created</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {fileHistory.map((item) => {
                      const shareLink = `${deriveFrontendUrl()}/receiver/${item.roomId}`;
                      const linkWithPassword = item.password ? `${shareLink}?password=${item.password}` : shareLink;
                      return (
                        <tr key={item.roomId}>
                          <td className="px-3 py-2">
                            <div className="max-w-[220px] truncate font-medium text-gray-900" title={item.fileName}>{item.fileName}</div>
                          </td>
                          <td className="px-3 py-2 text-gray-700">{formatBytes(item.fileSize)}</td>
                          <td className="px-3 py-2 text-gray-700 font-mono">{item.password || '-'}</td>
                          <td className="px-3 py-2 text-gray-700">{item.shareMode || 'single'}</td>
                          <td className="px-3 py-2">
                            {(() => {
                              const st = (historyStatus.get(item.roomId) || item.status || 'not-used').toLowerCase();
                              if (st === 'completed') {
                                return (
                                  <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-green-600 px-2.5 py-0.5 text-xs font-medium text-white shadow-sm">
                                    <CheckCircle2 className="h-3.5 w-3.5" /> Completed
                                  </span>
                                );
                              }
                              if (st === 'in-progress') {
                                return (
                                  <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-blue-600 px-2.5 py-0.5 text-xs font-medium text-white shadow-sm">
                                    <Clock className="h-3.5 w-3.5" /> In progress
                                  </span>
                                );
                              }
                              return (
                                <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-gray-500 px-2.5 py-0.5 text-xs font-medium text-white shadow-sm">
                                  <Circle className="h-3.5 w-3.5" /> Not used
                                </span>
                              );
                            })()}
                          </td>
                          <td className="px-3 py-2">
                            <button
                              onClick={async (e) => { e.stopPropagation?.(); const next = !item.downloadEnabled; try { await toggleDownloadPermission(item.roomId, next); setHistoryToast(next ? 'Download enabled' : 'Download disabled'); setTimeout(()=>setHistoryToast(''), 1200); await loadFileHistory(); } catch {} }}
                              role="switch"
                              aria-checked={item.downloadEnabled}
                              className={`relative inline-flex h-5 w-9 items-center rounded-full transition ${item.downloadEnabled ? 'bg-green-600' : 'bg-gray-300'}`}
                              title="Toggle download permission"
                              aria-label="Toggle download permission"
                            >
                              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${item.downloadEnabled ? 'translate-x-4' : 'translate-x-1'}`} />
                            </button>
                          </td>
                          <td className="px-3 py-2 text-gray-700">{item.createdAt ? new Date(item.createdAt).toLocaleString() : ''}</td>
                          <td className="px-3 py-2">
                            <div className="flex flex-wrap gap-2">
                              <a
                                href={linkWithPassword}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white p-1.5 text-blue-600 hover:bg-gray-50"
                                title="Open receiver link"
                                aria-label="Open receiver link"
                              >
                                <LinkIcon className="h-4 w-4" />
                              </a>
                              <button
                                onClick={() => { navigator.clipboard.writeText(linkWithPassword).then(()=>{ setHistoryToast('Link copied'); setTimeout(()=>setHistoryToast(''), 1200); }); }}
                                className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white p-1.5 text-gray-700 hover:bg-gray-50"
                                title="Copy password link"
                                aria-label="Copy password link"
                              >
                                <Copy className="h-4 w-4" />
                              </button>
                              {item.password && (
                                <button
                                  onClick={() => { navigator.clipboard.writeText(item.password).then(()=>{ setHistoryToast('Password copied'); setTimeout(()=>setHistoryToast(''), 1200); }); }}
                                  className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white p-1.5 text-gray-700 hover:bg-gray-50"
                                  title="Copy password"
                                  aria-label="Copy password"
                                >
                                  <KeyRound className="h-4 w-4" />
                                </button>
                              )}
                              <button
                                onClick={() => { if (window.__downloadQrPng) { window.__downloadQrPng(linkWithPassword, `qr-${item.roomId}.png`); setHistoryToast('QR download started'); setTimeout(()=>setHistoryToast(''), 1200); } }}
                                className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white p-1.5 text-gray-700 hover:bg-gray-50"
                                title="Download QR PNG"
                                aria-label="Download QR PNG"
                              >
                                <QrCode className="h-4 w-4" />
                              </button>
                              {/* Toggle moved to Download column */}
                              <button
                                onClick={async () => { try { await deleteFileShare(item.roomId); await loadFileHistory(); } catch {} }}
                                className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white p-1.5 text-red-700 hover:bg-red-50"
                                title="Delete share"
                                aria-label="Delete share"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
};

export default Sender;