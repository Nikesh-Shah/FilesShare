import React, { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useParams, useLocation } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Download } from 'lucide-react';
import Nav from './Nav';
import { checkDownloadPermission } from '../api/api';
import { getRtcConfig } from '../utils/iceConfig';

const socket = io(import.meta.env.VITE_API_URL );

const Receiver = () => {
  const { roomId } = useParams();
  const location = useLocation();

  const peerRef = useRef(null);
  const senderIdRef = useRef(null);
  const pendingDataChannel = useRef(null);
  const receivedBytesRef = useRef(0);
  const receivedBuffers = useRef([]);
  const receivedMapRef = useRef(new Map());
  const expectedChunksRef = useRef(0);
  const receivedCountRef = useRef(0);
  const downloadStartTimeRef = useRef(null);
  const fileMetadataRef = useRef(null);
  const lastSpeedLogRef = useRef(0);
  
  const lastProgressUpdateRef = useRef(0);
  const lastProgressPctRef = useRef(0);
  const uiLoopActiveRef = useRef(false);
  const uiRafIdRef = useRef(0);
  const speedModeActiveRef = useRef(false); // legacy flag (ordered channel path now)
  const receivedSeqSetRef = useRef(new Set());
  const highestSeqRef = useRef(-1);
  const missingCheckTimerRef = useRef(null);
  const highestContiguousRef = useRef(-1);
  const receivedChunksRef = useRef(new Map());
  const expectTotalSeqRef = useRef(null);
  const lastAckSentRef = useRef(-1);
  const ackTimerRef = useRef(null);

  const [downloadLink, setDownloadLink] = useState('');
  const [downloadLinks, setDownloadLinks] = useState([]); // for multiple files
  const [savingAll, setSavingAll] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [status, setStatus] = useState('Connecting...');
  const [fileMetadata, setFileMetadata] = useState(null);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordValue, setPasswordValue] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Encryption removed

  const [progressPct, setProgressPct] = useState(0);
  const [downloadPermissionEnabled, setDownloadPermissionEnabled] = useState(true);
  const [permissionChecked, setPermissionChecked] = useState(false);
  const [isRoomOccupied, setIsRoomOccupied] = useState(false);
  const [occupiedMessage, setOccupiedMessage] = useState('');
  const [receivedText, setReceivedText] = useState('');
  const [textLanguage, setTextLanguage] = useState('plain');
  const [isTextShare, setIsTextShare] = useState(false);
  const [textCopied, setTextCopied] = useState(false);
  const permissionSetupRef = useRef(false);
  const permissionCleanupRef = useRef(null);
  const unorderedRef = useRef(false);

  const urlParams = new URLSearchParams(location.search);
  const urlPassword = urlParams.get('password');

  const formatBytes = (bytes) => {
    if (!bytes && bytes !== 0) return '';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = bytes === 0 ? 0 : Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${units[i]}`;
  };

  useEffect(() => {
    console.log('Receiver component mounted for roomId:', roomId);
    
    // Add socket connection debugging
    const handleConnect = () => {
      console.log('Socket connected:', socket.id);
    };
    const handleDisconnect = () => {
      console.log('Socket disconnected');
      setStatus('Disconnected from server. Reconnecting...');
    };
    const handleReconnect = () => {
      console.log('Socket reconnected');
      setStatus('Reconnected. Setting up connection...');
      if (roomId) {
        setupConnection();
      }
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('reconnect', handleReconnect);
    
    const handleOffer = async (data) => {
      console.log('Received offer from sender:', data.senderId);
      setStatus('Setting up connection...');
      senderIdRef.current = data.senderId;

      if (peerRef.current) {
        await peerRef.current.setRemoteDescription(new RTCSessionDescription(data.offer));
        const answer = await peerRef.current.createAnswer();
        await peerRef.current.setLocalDescription(answer);
        socket.emit('answer', { answer, roomId, targetId: data.senderId });
      }
    };

    const handleCandidate = async (data) => {
      if (peerRef.current) {
        await peerRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
      }
    };

    const handleRoomOccupied = (data) => {
      setIsRoomOccupied(true);
      setOccupiedMessage(data.message);
      setStatus('Link expired');
    };

    const handleDownloadPermissionChanged = (data) => {
      setDownloadPermissionEnabled(data.downloadEnabled);
      if (!data.downloadEnabled) {
        setPasswordError('Download has been disabled by the sender');
      } else {
        setPasswordError('');
      }
    };

    socket.on('offer', handleOffer);
    socket.on('candidate', handleCandidate);
    socket.on('room-occupied', handleRoomOccupied);
    socket.on('download-permission-changed', handleDownloadPermissionChanged);

    setupConnection();

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('reconnect', handleReconnect);
      socket.off('offer', handleOffer);
      socket.off('candidate', handleCandidate);
      socket.off('room-occupied', handleRoomOccupied);
      socket.off('download-permission-changed', handleDownloadPermissionChanged);
    };
  }, [roomId]);

  useEffect(() => {
    if (!permissionSetupRef.current && roomId) {
      permissionSetupRef.current = true;
      
      const setupPermissionChecking = async () => {
        const receiverEmail = localStorage.getItem('email') || sessionStorage.getItem('email');
        
        setDownloadPermissionEnabled(true);
        setPermissionChecked(true);
        setIsRoomOccupied(false);
        
        if (receiverEmail) {
          
          const checkDownloadPermissionSilently = async (roomId) => {
            try {
              const response = await checkDownloadPermission(roomId);
              return { success: true, data: response.data };
            } catch (error) {
              if (error.response?.status === 404) {
                return { success: false, notFound: true };
              } else {
                return { success: false, error: error };
              }
            }
          };
          
          const result = await checkDownloadPermissionSilently(roomId);
          
          if (result.success) {
            
            setDownloadPermissionEnabled(result.data.downloadEnabled);
            
            const permissionInterval = setInterval(async () => {
              const pollResult = await checkDownloadPermissionSilently(roomId);
              if (pollResult.success) {
                setDownloadPermissionEnabled(pollResult.data.downloadEnabled);
              } else {
                clearInterval(permissionInterval);
              }
            }, 2000);
            
            permissionCleanupRef.current = () => clearInterval(permissionInterval);
            
          } else if (result.notFound) {
            
          } else {
            permissionCleanupRef.current = () => {}; // No cleanup needed
          }
        } else {
          permissionCleanupRef.current = () => {}; // No cleanup needed
        }
      };
      
      setupPermissionChecking();
    }

    return () => {
      // Clean up permission polling if it was set up
      if (permissionCleanupRef.current) {
        permissionCleanupRef.current();
      }
    };
  }, []); // Empty dependency array - runs only once

  // requestAnimationFrame-based UI update loop to minimize per-chunk work
  const startUiLoop = () => {
    if (uiLoopActiveRef.current) return;
    uiLoopActiveRef.current = true;
    const step = () => {
      if (!uiLoopActiveRef.current) return;
      const meta = fileMetadataRef.current || fileMetadata;
      const total = meta?.size || 0;
      if (total > 0 && downloadStartTimeRef.current) {
        const now = Date.now();
        const timeSinceLast = now - (lastProgressUpdateRef.current || downloadStartTimeRef.current);
        const minInterval = 100; // ms - faster UI updates for ultra-fast transfers
        if (timeSinceLast >= minInterval) {
          const received = receivedBytesRef.current;
          const pct = Math.min(100, Math.round((received / total) * 100));
          setProgressPct(pct);
          lastProgressPctRef.current = pct;
          lastProgressUpdateRef.current = now;

          const elapsed = Math.max(0.001, (now - downloadStartTimeRef.current) / 1000);
          const speed = received / elapsed; // bytes/s
          const remainingBytes = Math.max(0, total - received);
          const etaSec = speed > 0 ? remainingBytes / speed : 0;

          let speedText;
          if (speed > 1024 * 1024 * 1024) speedText = `${(speed / (1024 * 1024 * 1024)).toFixed(2)} GB/s`;
          else if (speed > 1024 * 1024) speedText = `${(speed / (1024 * 1024)).toFixed(1)} MB/s`;
          else speedText = `${(speed / 1024).toFixed(1)} KB/s`;

          let etaText;
          if (etaSec > 3600) etaText = `${Math.ceil(etaSec / 3600)}h remaining`;
          else if (etaSec > 60) etaText = `${Math.ceil(etaSec / 60)}m remaining`;
          else etaText = `${Math.ceil(etaSec)}s remaining`;

          setStatus(`Receiving ${meta?.name || 'file'}: ${pct}% (${formatBytes(received)} / ${formatBytes(total)}) - ${speedText} - ${etaText}`);
        }
      }
      uiRafIdRef.current = requestAnimationFrame(step);
    };
    uiRafIdRef.current = requestAnimationFrame(step);
  };

  const stopUiLoop = () => {
    uiLoopActiveRef.current = false;
    if (uiRafIdRef.current) cancelAnimationFrame(uiRafIdRef.current);
    uiRafIdRef.current = 0;
  };

  const setupConnection = async () => {
    console.log('Setting up WebRTC connection for room:', roomId);
    
    // Fetch TURN credentials from backend for reliable cross-network NAT traversal
    const rtcConfig = await getRtcConfig();
    
    console.log('Creating RTCPeerConnection with config:', rtcConfig);
    peerRef.current = new RTCPeerConnection(rtcConfig);

    // Monitor ICE connection state for cross-network debugging & auto-restart
    peerRef.current.oniceconnectionstatechange = () => {
      const state = peerRef.current.iceConnectionState;
      console.log(`[ICE] Receiver connection state: ${state}`);
      if (state === 'failed') {
        console.warn('[ICE] Connection failed — the TURN relay may be unavailable');
        setStatus('Connection failed. Please check your network or try again.');
      } else if (state === 'disconnected') {
        setStatus('Connection interrupted. Waiting for recovery...');
      } else if (state === 'connected' || state === 'completed') {
        console.log('[ICE] Peer connected successfully');
      }
    };

    peerRef.current.onicecandidate = (e) => {
      if (e.candidate) {
        console.log('Receiver sending ICE candidate:', e.candidate);
        socket.emit('candidate', {
          candidate: e.candidate,
          roomId,
          targetId: senderIdRef.current,
        });
      } else {
        console.log('ICE gathering complete');
      }
    };

    // ── Multi-channel receiver: collect all data channels from sender ──
    let controlChannel = null;
    let allChannels = [];
    let channelOpenCount = 0;
    let passwordSent = false;

    peerRef.current.ondatachannel = (e) => {
      const channel = e.channel;
      console.log('Data channel received:', channel.label);
      try { channel.binaryType = 'arraybuffer'; } catch (_) {}
      allChannels.push(channel);

      // The first channel (fileTransfer) is the control channel
      const isControl = channel.label === 'fileTransfer';
      if (isControl) controlChannel = channel;

      // ── Binary data handler (shared across all channels) ──
      channel.onmessage = (event) => {
        if (typeof event.data === 'string') {
          // Only control channel receives string messages
          if (!isControl) return;

          if (event.data === 'END') { finalizeIfPossible(); return; }
          let msg;
          try { msg = JSON.parse(event.data); } catch { msg = null; }
          if (msg) {
            if (msg.type === 'metadata') {
              fileMetadataRef.current = msg;
              setFileMetadata(msg);
              receivedBuffers.current = [];
              receivedSeqSetRef.current = new Set();
              highestSeqRef.current = -1;
              receivedBytesRef.current = 0;
              setProgressPct(0);
              downloadStartTimeRef.current = Date.now();
              startUiLoop();
              setStatus(`Receiving ${msg.name} (${formatBytes(msg.size)})...`);
              return;
            }
            if (msg.type === 'FILE_END') {
              receivedBuffers.current = [];
              receivedBytesRef.current = 0;
              setProgressPct(0);
              return;
            }
            if (msg.type === 'ALL_DONE') { setStatus('All files received.'); return; }
            if (msg.type === 'TEXT_PAYLOAD') {
              setReceivedText(msg.text || '');
              setTextLanguage(msg.language || 'plain');
              setIsTextShare(true);
              setShowPasswordForm(false);
              setStatus('Text received.');
              stopUiLoop();
              return;
            }
            if (msg.type === 'password-result' && !msg.success) {
              setPasswordError('Incorrect password. Please try again.');
              setPasswordValue('');
              return;
            }
            if (msg.type === 'END') {
              endSequenceRef.current = msg.totalSeq || null;
              attemptFinalize();
              return;
            }
            if (msg.type === 'DONE') { attemptFinalize(); return; }
          }
        } else if (event.data instanceof ArrayBuffer) {
          // Fast binary path — push directly, skip any processing
          receivedBuffers.current.push(event.data);
          receivedBytesRef.current += event.data.byteLength;
        }
      };

      channel.onopen = () => {
        channelOpenCount++;
        console.log(`📡 Data channel opened: ${channel.label} (${channelOpenCount}/${allChannels.length})`);

        if (isControl) {
          speedModeActiveRef.current = false;
          setStatus('Data channel connected. Waiting for file transfer...');
          try { channel.bufferedAmountLowThreshold = 0; } catch (_) {}
          pendingDataChannel.current = channel;

          // Send password once control channel is open
          if (!passwordSent) {
            if (urlPassword) {
              passwordSent = true;
              setStatus('Connected. Verifying password from QR code...');
              setShowPasswordForm(false);
              setTimeout(() => {
                channel.send(JSON.stringify({ type: 'password', password: urlPassword }));
              }, 100);
            } else {
              setStatus('Connected. Password required to access file.');
              setShowPasswordForm(true);
            }
          }
        }
      };

      channel.onclose = () => {
        if (missingCheckTimerRef.current) clearInterval(missingCheckTimerRef.current);
        console.log(`📡 Data channel closed: ${channel.label}`);
        if (isControl) {
          stopUiLoop();
          if (receivedBytesRef.current === 0) {
            setStatus('Connection closed before file transfer started. Please try again.');
          } else {
            const currentMetadata = fileMetadataRef.current || fileMetadata;
            const expectedSize = currentMetadata?.size || 0;
            if (receivedBytesRef.current < expectedSize) {
              setStatus(`Connection lost during transfer. Received ${formatBytes(receivedBytesRef.current)} of ${formatBytes(expectedSize)}.`);
            }
          }
        }
      };

      channel.onerror = (error) => {
        console.error(`📡 Data channel error (${channel.label}):`, error);
        if (isControl) setStatus('Data channel error occurred. Please refresh and try again.');
      };
    };

    // ── Shared helpers (closure-scoped, used across channels) ──
    const endSequenceRef = { current: null };

    const finalizeIfPossible = async () => {
      const currentMetadata = fileMetadataRef.current || fileMetadata;
      if (!currentMetadata) return;

      // Build blob directly from buffer array — very fast even for large files
      // because the browser internally references the same ArrayBuffers.
      const blob = new Blob(receivedBuffers.current, {
        type: currentMetadata?.fileType || 'application/octet-stream',
      });

      const totalSize = currentMetadata?.size ? ` (${formatBytes(currentMetadata.size)})` : '';
      setStatus(`File download completed${totalSize}. Ready to save.`);
      const url = URL.createObjectURL(blob);
      setDownloadLink(url);
      setDownloadLinks(prev => [...prev, { url, name: currentMetadata?.name || `file-${Date.now()}` }]);
      setProgressPct(100);
    };

    const attemptFinalize = () => { finalizeIfPossible(); };

    console.log('Emitting join event to server...');
    socket.emit('join', { roomId, role: 'receiver' });
    console.log('Receiver: Emitting join event with roomId:', roomId, 'role: receiver');
    
    // Add connection state monitoring
    peerRef.current.onconnectionstatechange = () => {
      console.log('WebRTC connection state:', peerRef.current.connectionState);
      if (peerRef.current.connectionState === 'failed') {
        setStatus('Connection failed. Please refresh and try again.');
      }
    };
    
    peerRef.current.oniceconnectionstatechange = () => {
      console.log('ICE connection state:', peerRef.current.iceConnectionState);
    };
  };

  const handlePasswordSubmit = async () => {
    if (!passwordValue.trim()) {
      setPasswordError('Please enter the password');
      return;
    }

    // Check if download is currently enabled (already handled by setupPermissionChecking)
    if (!downloadPermissionEnabled) {
      setPasswordError('Download is currently disabled by the sender');
      return;
    }

    setPasswordError('');
    setStatus('Verifying password...');

    if (pendingDataChannel.current) {
      pendingDataChannel.current.send(
        JSON.stringify({
          type: 'password',
          password: passwordValue,
        })
      );
    }
  };

  // Decryption removed

  return (
    <div className="min-h-screen bg-gray-50">
      <Nav />

      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">File Receiver</h1>
          <p className="mt-1 text-gray-600">
            Join the sender's room and receive the file securely using a one-time password.
          </p>
        </div>

        {/* Room Occupied Message */}
        {isRoomOccupied && (
          <div className="mb-6 rounded-lg border border-red-300 bg-red-50 p-6 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h3 className="mt-3 text-lg font-semibold text-red-900">Link Expired</h3>
            <p className="mt-2 text-sm text-red-700">{occupiedMessage}</p>
            <p className="mt-2 text-xs text-red-600">
              Please ask the sender to create a new sharing link for you.
            </p>
          </div>
        )}

        {/* Main content - only show if room is not occupied */}
        {!isRoomOccupied && (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Status + Progress */}
          <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Connection</h2>
            </div>

            <div
              className={`mt-4 flex items-start gap-2 rounded-md border p-3 text-sm ${
                status.toLowerCase().includes('error') || status.toLowerCase().includes('expired')
                  ? 'border-red-300 bg-red-50 text-red-700'
                  : status.toLowerCase().includes('waiting')
                  ? 'border-gray-200 bg-gray-50 text-gray-700'
                  : 'border-blue-200 bg-blue-50 text-blue-800'
              }`}
              aria-live="polite"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{status}</p>
            </div>

            {progressPct > 0 && progressPct < 100 && (
              <div className="mt-4">
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="h-full rounded-full bg-blue-600 transition-[width]"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-gray-600">{progressPct}%</p>
              </div>
            )}

            {!permissionChecked && (
              <div className="mt-4 text-sm text-gray-600">
                Checking download permissions...
              </div>
            )}

            {/* Info about download control based on receiver login status */}
            {permissionChecked && downloadPermissionEnabled && !isRoomOccupied && (
              <div className="mt-4 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>
                    {(localStorage.getItem('email') || sessionStorage.getItem('email')) 
                      ? 'Real-time download control is active. Logged-in receivers get full features.' 
                      : 'Download ready. Login for real-time download control and advanced features.'}
                  </span>
                </div>
              </div>
            )}

            {permissionChecked && !downloadPermissionEnabled && (
              <div className="mt-4 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-700">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>Download is currently disabled by the sender. This is checked in real-time.</span>
                </div>
              </div>
            )}
          </section>

          {/* Password input / Download */}
          <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">Access {isTextShare ? 'Text' : 'File'}</h2>

            {/* Text share display */}
            {isTextShare && receivedText && (
              <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <span className="font-medium text-green-900 text-sm">
                      {textLanguage === 'plain' ? 'Text received' : `${textLanguage} code received`}
                    </span>
                  </div>
                  <button
                    onClick={() => { navigator.clipboard.writeText(receivedText).then(() => { setTextCopied(true); setTimeout(() => setTextCopied(false), 1500); }); }}
                    className="inline-flex items-center gap-1.5 rounded-md bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700"
                  >
                    {textCopied ? '✓ Copied!' : 'Copy'}
                  </button>
                </div>
                <pre className="mt-2 max-h-80 overflow-auto rounded-md bg-gray-900 p-3 text-xs text-green-300 font-mono whitespace-pre-wrap break-words">{receivedText}</pre>
              </div>
            )}

            {downloadLinks.length > 1 && (
              <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-4 text-center">
                <div className="flex items-center justify-center">
                  <CheckCircle2 className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="mt-2 font-medium text-green-900">Files Ready</h3>
                <p className="text-sm text-green-700">{downloadLinks.length} files received</p>
                {saveError && <p className="mt-2 text-sm text-red-600">{saveError}</p>}
                <button
                  disabled={savingAll}
                  onClick={async () => {
                    setSaveError('');
                    setSavingAll(true);
                    try {
                      const hasDirPicker = !!window.showDirectoryPicker;
                      if (hasDirPicker) {
                        const dir = await window.showDirectoryPicker({ mode: 'readwrite' });
                        for (let i = 0; i < downloadLinks.length; i++) {
                          const f = downloadLinks[i];
                          const name = f.name || `file-${i+1}`;
                          const fileHandle = await dir.getFileHandle(name, { create: true });
                          const writable = await fileHandle.createWritable();
                          const resp = await fetch(f.url);
                          const blob = await resp.blob();
                          await writable.write(blob);
                          await writable.close();
                        }
                      } else {
                        for (let i = 0; i < downloadLinks.length; i++) {
                          const f = downloadLinks[i];
                          const a = document.createElement('a');
                          a.href = f.url;
                          a.download = f.name || `file-${i+1}`;
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                          await new Promise(r => setTimeout(r, 150));
                        }
                      }
                    } catch (e) {
                      setSaveError('Save failed. Please try again or switch browser.');
                    } finally {
                      setSavingAll(false);
                    }
                  }}
                  className="mt-3 inline-flex items-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-700 disabled:opacity-60"
                >
                  <Download className="h-4 w-4" /> {savingAll ? 'Saving…' : 'Save All'}
                </button>
              </div>
            )}

            {downloadLinks.length <= 1 && downloadLink && (
              <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-4 text-center">
                <div className="flex items-center justify-center">
                  <CheckCircle2 className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="mt-2 font-medium text-green-900">File Ready!</h3>
                <p className="text-sm text-green-700">
                  {fileMetadata?.name} ({Math.round((fileMetadata?.size || 0) / 1024)} KB)
                </p>
                <a
                  href={downloadLink}
                  download={fileMetadata?.name || 'downloaded-file'}
                  className="mt-3 inline-flex items-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-700"
                >
                  <Download className="h-4 w-4" />
                  Download File
                </a>
              </div>
            )}

            {showPasswordForm && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700">
                  One-time password
                </label>
                <div className="mt-2 flex gap-2">
                  <div className="flex-1">
                    <input
                      type="password"
                      value={passwordValue}
                      onChange={(e) => setPasswordValue(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handlePasswordSubmit()}
                      placeholder="Enter the password from sender"
                      disabled={!downloadPermissionEnabled}
                      className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 disabled:bg-gray-100"
                    />
                  </div>
                  <button
                    onClick={handlePasswordSubmit}
                    disabled={!downloadPermissionEnabled}
                    className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    Unlock
                  </button>
                </div>
                {passwordError && <p className="text-sm text-red-600">{passwordError}</p>}
              </div>
            )}

            {/* Encryption UI removed */}

            {!showPasswordForm && !downloadLink && (
              <p className="text-sm text-gray-600">Waiting for the sender to connect…</p>
            )}
          </section>
        </div>
        )}
      </main>
    </div>
  );
};

export default Receiver;