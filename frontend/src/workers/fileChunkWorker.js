/* File Chunk Worker: ultra-fast streaming file chunks off main thread */
let paused = false;
let readAheadBuffer = [];
const MAX_READ_AHEAD = 3; // pre-read chunks for smoothness

self.onmessage = async (e) => {
  if (e.data && e.data.cmd === 'pause') { paused = true; return; }
  if (e.data && e.data.cmd === 'resume') { paused = false; return; }
  const { file, chunkSize = 2 * 1024 * 1024, jobId } = e.data; // default 2MB
  if (!file) { self.postMessage({ type: 'error', error: 'No file', jobId }); return; }
  try {
    self.postMessage({ type: 'start', jobId });
    const reader = file.stream().getReader();
    let seq = 0;
    
    // Ultra-fast processing loop
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      // Process larger read chunks efficiently
      let offset = 0;
      while (offset < value.byteLength) {
        while (paused) { await new Promise(r=>setTimeout(r,5)); } // shorter pause check
        
        const end = Math.min(offset + chunkSize, value.byteLength);
        const slice = value.slice(offset, end);
        
        // Send immediately for maximum throughput
        self.postMessage({ 
          type: 'chunk', 
          payload: slice.buffer, 
          seq, 
          jobId 
        }, [slice.buffer]);
        
        seq++;
        offset = end;
        
        // Micro-yield every 8 chunks to prevent blocking
        if (seq % 8 === 0) await new Promise(r=>setTimeout(r,0));
      }
    }
    self.postMessage({ type: 'end', jobId });
  } catch (err) {
    self.postMessage({ type: 'error', error: err.message || String(err), jobId });
  }
};
