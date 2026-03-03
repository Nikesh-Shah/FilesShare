/**
 * High-Performance File Chunk Worker v2
 * 
 * Reads file via streaming ReadableStream and posts ArrayBuffer chunks.
 * Optimisations:
 *  - Transferable objects (zero-copy to main thread)
 *  - Coalesces partial reads into full-size chunks (avoids tiny trailing sends)
 *  - Adaptive yield frequency based on chunk size
 *  - Minimal pause latency via MessageChannel (~0 ms wakeup)
 */

let paused = false;
let pauseResolve = null;

// Fast pause wakeup via MessageChannel (sub-ms vs 4ms setTimeout)
const mc = typeof MessageChannel !== 'undefined' ? new MessageChannel() : null;
let mcResolve = null;
if (mc) {
  mc.port1.onmessage = () => { if (mcResolve) { const r = mcResolve; mcResolve = null; r(); } };
}
const microYield = () => {
  if (mc) return new Promise(r => { mcResolve = r; mc.port2.postMessage(0); });
  return new Promise(r => setTimeout(r, 0));
};

const waitUnpaused = async () => {
  while (paused) {
    await new Promise(r => { pauseResolve = r; setTimeout(r, 2); });
  }
};

self.onmessage = async (e) => {
  if (e.data?.cmd === 'pause') {
    paused = true;
    return;
  }
  if (e.data?.cmd === 'resume') {
    paused = false;
    if (pauseResolve) { const r = pauseResolve; pauseResolve = null; r(); }
    return;
  }

  const { file, chunkSize = 256 * 1024, jobId } = e.data;
  if (!file) {
    self.postMessage({ type: 'error', error: 'No file', jobId });
    return;
  }

  try {
    self.postMessage({ type: 'start', jobId });

    const reader = file.stream().getReader();
    let seq = 0;
    let leftover = null;

    // Larger chunks → yield less often (they take longer to drain anyway)
    const yieldInterval = chunkSize >= 512 * 1024 ? 64 : chunkSize >= 256 * 1024 ? 32 : chunkSize >= 64 * 1024 ? 16 : 8;

    while (true) {
      if (paused) await waitUnpaused();

      const { done, value } = await reader.read();

      // Merge leftover from previous iteration with fresh data
      let data;
      if (leftover && value) {
        data = new Uint8Array(leftover.byteLength + value.byteLength);
        data.set(leftover, 0);
        data.set(value, leftover.byteLength);
        leftover = null;
      } else if (leftover) {
        data = leftover;
        leftover = null;
      } else if (value) {
        data = value;
      } else {
        break;
      }

      if (!data || data.byteLength === 0) { if (done) break; continue; }

      let offset = 0;
      while (offset < data.byteLength) {
        if (paused) await waitUnpaused();

        const remaining = data.byteLength - offset;
        // Keep partial tail for merging with next read (avoids tiny chunks)
        if (remaining < chunkSize && !done) {
          leftover = data.slice(offset);
          break;
        }

        const end = Math.min(offset + chunkSize, data.byteLength);
        const chunk = data.buffer.slice(data.byteOffset + offset, data.byteOffset + end);

        self.postMessage({ type: 'chunk', payload: chunk, seq, jobId }, [chunk]);

        seq++;
        offset = end;

        if (seq % yieldInterval === 0) await microYield();
      }

      if (done) break;
    }

    // Flush remaining bytes
    if (leftover && leftover.byteLength > 0) {
      const buf = leftover.buffer.slice(leftover.byteOffset, leftover.byteOffset + leftover.byteLength);
      self.postMessage({ type: 'chunk', payload: buf, seq, jobId }, [buf]);
      seq++;
    }

    self.postMessage({ type: 'end', totalSeq: seq, jobId });
  } catch (err) {
    self.postMessage({ type: 'error', error: err.message || String(err), jobId });
  }
};
