/**
 * ICE Server Configuration for WebRTC
 * 
 * Provides STUN + TURN servers needed for NAT traversal across different networks.
 * 
 * The app fetches temporary TURN credentials from the backend on startup.
 * If the backend provides Metered.ca (or custom) TURN credentials, those are used.
 * Otherwise, only free Google STUN servers are available (same-network only).
 * 
 * To enable cross-network file sharing, set these env vars on the BACKEND:
 *   METERED_API_KEY=<your free key from https://www.metered.ca/stun-turn>
 * 
 * Or provide your own TURN server:
 *   TURN_URL=turn:your-server.com:3478
 *   TURN_USERNAME=user
 *   TURN_CREDENTIAL=pass
 */

const STUN_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun3.l.google.com:19302' },
  { urls: 'stun:stun4.l.google.com:19302' },
];

// Cache fetched TURN credentials (valid for ~24h typically)
let cachedTurnServers = null;
let cacheTimestamp = 0;
const CACHE_TTL = 3600_000; // 1 hour

/**
 * Derive the backend URL (same logic as Sender.jsx)
 */
const getBackendUrl = () => {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  if (typeof window !== 'undefined') {
    const loc = window.location;
    if (/devtunnels\.ms$/i.test(loc.hostname)) {
      return loc.origin.replace(/5173/, '5000');
    }
    return loc.origin;
  }
  return '';
};

/**
 * Fetch TURN credentials from the backend.
 * The backend endpoint /api/ice-servers returns TURN server configs.
 */
async function fetchTurnServers() {
  // Return cached if still fresh
  if (cachedTurnServers && Date.now() - cacheTimestamp < CACHE_TTL) {
    return cachedTurnServers;
  }

  try {
    const backendUrl = getBackendUrl();
    const res = await fetch(`${backendUrl}/api/ice-servers`, {
      credentials: 'include',
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.iceServers && data.iceServers.length > 0) {
      cachedTurnServers = data.iceServers;
      cacheTimestamp = Date.now();
      console.log('[ICE] Fetched TURN credentials from backend:', cachedTurnServers.length, 'servers');
      return cachedTurnServers;
    }
  } catch (err) {
    console.warn('[ICE] Could not fetch TURN credentials from backend:', err.message);
  }
  return [];
}

/**
 * Get the full RTCConfiguration with STUN + TURN servers.
 * Call this before creating each RTCPeerConnection.
 */
export async function getRtcConfig() {
  const turnServers = await fetchTurnServers();

  const iceServers = [
    ...STUN_SERVERS,
    ...turnServers,
  ];

  const config = {
    iceServers,
    iceCandidatePoolSize: 10,
    bundlePolicy: 'max-bundle',
    rtcpMuxPolicy: 'require',
    iceTransportPolicy: 'all',
    sdpSemantics: 'unified-plan',
  };

  console.log('[ICE] RTCPeerConnection config:', {
    stunCount: STUN_SERVERS.length,
    turnCount: turnServers.length,
    hasTurn: turnServers.length > 0,
  });

  if (turnServers.length === 0) {
    console.warn(
      '[ICE] No TURN servers available! Cross-network transfers will fail.\n' +
      'Set METERED_API_KEY or TURN_URL/TURN_USERNAME/TURN_CREDENTIAL on the backend.'
    );
  }

  return config;
}

/**
 * Pre-fetch TURN credentials on app load so they're ready when needed.
 */
export function prefetchIceConfig() {
  fetchTurnServers().catch(() => {});
}
