// Network optimization utilities for better file transfer performance

export const getOptimizedTransferSettings = (fileSize, connectionType = 'unknown') => {
  const fileSizeMB = fileSize / (1024 * 1024);
  const fileSizeGB = fileSizeMB / 1024;
  
  // Ultra-dynamic settings that scale infinitely with file size
  let settings = {
    chunkSize: calculateOptimalChunkSize(fileSize),
    maxBufferSize: calculateOptimalBufferSize(fileSize),
    batchSize: calculateOptimalBatchSize(fileSize),
    maxDelay: 0, // Always zero delay for maximum speed
    concurrentChunks: calculateOptimalConcurrency(fileSize),
    bufferThreshold: calculateOptimalBufferThreshold(fileSize),
    transferStrategy: getUnlimitedTransferStrategy(fileSize)
  };

  // Connection-specific super optimizations
  if (connectionType === 'local' || connectionType === 'lan') {
    // Local network = unlimited power mode
    settings.chunkSize = Math.min(settings.chunkSize * 2, 16 * 1024 * 1024); // Up to 16MB chunks on LAN
    settings.maxBufferSize = Math.min(settings.maxBufferSize * 2, 512 * 1024 * 1024); // Up to 512MB buffer
    settings.concurrentChunks = Math.min(settings.concurrentChunks * 2, 32); // Up to 32 concurrent chunks
    settings.batchSize = Math.min(settings.batchSize * 2, 100); // Up to 100 chunks per batch
    settings.transferStrategy = 'unlimited-local';
  } else if (connectionType === 'fast') {
    // Fast network optimizations
    settings.chunkSize = Math.min(settings.chunkSize * 1.5, 12 * 1024 * 1024);
    settings.maxBufferSize = Math.min(settings.maxBufferSize * 1.5, 384 * 1024 * 1024);
    settings.concurrentChunks = Math.min(settings.concurrentChunks * 1.5, 24);
    settings.batchSize = Math.min(settings.batchSize * 1.5, 75);
  }

  return settings;
};

// Dynamic chunk size calculation - scales infinitely
function calculateOptimalChunkSize(fileSize) {
  const fileSizeGB = fileSize / (1024 * 1024 * 1024);
  
  if (fileSizeGB >= 50) {
    return 16 * 1024 * 1024; // 16MB chunks for 50GB+ files
  } else if (fileSizeGB >= 20) {
    return 12 * 1024 * 1024; // 12MB chunks for 20-50GB files
  } else if (fileSizeGB >= 10) {
    return 8 * 1024 * 1024; // 8MB chunks for 10-20GB files
  } else if (fileSizeGB >= 5) {
    return 6 * 1024 * 1024; // 6MB chunks for 5-10GB files
  } else if (fileSizeGB >= 2) {
    return 4 * 1024 * 1024; // 4MB chunks for 2-5GB files
  } else if (fileSizeGB >= 1) {
    return 3 * 1024 * 1024; // 3MB chunks for 1-2GB files
  } else if (fileSizeGB >= 0.5) {
    return 2 * 1024 * 1024; // 2MB chunks for 500MB-1GB files
  } else if (fileSizeGB >= 0.1) {
    return 1024 * 1024; // 1MB chunks for 100-500MB files
  } else if (fileSizeGB >= 0.05) {
    return 512 * 1024; // 512KB chunks for 50-100MB files
  } else if (fileSizeGB >= 0.01) {
    return 256 * 1024; // 256KB chunks for 10-50MB files
  } else {
    return 128 * 1024; // 128KB chunks for <10MB files
  }
}

// Dynamic buffer size calculation - scales infinitely
function calculateOptimalBufferSize(fileSize) {
  const fileSizeGB = fileSize / (1024 * 1024 * 1024);
  
  if (fileSizeGB >= 50) {
    return 512 * 1024 * 1024; // 512MB buffer for 50GB+ files
  } else if (fileSizeGB >= 20) {
    return 384 * 1024 * 1024; // 384MB buffer for 20-50GB files
  } else if (fileSizeGB >= 10) {
    return 256 * 1024 * 1024; // 256MB buffer for 10-20GB files
  } else if (fileSizeGB >= 5) {
    return 192 * 1024 * 1024; // 192MB buffer for 5-10GB files
  } else if (fileSizeGB >= 2) {
    return 128 * 1024 * 1024; // 128MB buffer for 2-5GB files
  } else if (fileSizeGB >= 1) {
    return 96 * 1024 * 1024; // 96MB buffer for 1-2GB files
  } else if (fileSizeGB >= 0.5) {
    return 64 * 1024 * 1024; // 64MB buffer for 500MB-1GB files
  } else if (fileSizeGB >= 0.1) {
    return 32 * 1024 * 1024; // 32MB buffer for 100-500MB files
  } else if (fileSizeGB >= 0.05) {
    return 16 * 1024 * 1024; // 16MB buffer for 50-100MB files
  } else {
    return 8 * 1024 * 1024; // 8MB buffer for <50MB files
  }
}

// Dynamic batch size calculation - scales infinitely
function calculateOptimalBatchSize(fileSize) {
  const fileSizeGB = fileSize / (1024 * 1024 * 1024);
  
  if (fileSizeGB >= 50) {
    return 50; // 50 chunks per batch for 50GB+ files
  } else if (fileSizeGB >= 20) {
    return 40; // 40 chunks per batch for 20-50GB files
  } else if (fileSizeGB >= 10) {
    return 30; // 30 chunks per batch for 10-20GB files
  } else if (fileSizeGB >= 5) {
    return 25; // 25 chunks per batch for 5-10GB files
  } else if (fileSizeGB >= 2) {
    return 20; // 20 chunks per batch for 2-5GB files
  } else if (fileSizeGB >= 1) {
    return 15; // 15 chunks per batch for 1-2GB files
  } else if (fileSizeGB >= 0.5) {
    return 12; // 12 chunks per batch for 500MB-1GB files
  } else if (fileSizeGB >= 0.1) {
    return 8; // 8 chunks per batch for 100-500MB files
  } else {
    return 4; // 4 chunks per batch for <100MB files
  }
}

// Dynamic concurrency calculation - scales infinitely
function calculateOptimalConcurrency(fileSize) {
  const fileSizeGB = fileSize / (1024 * 1024 * 1024);
  
  if (fileSizeGB >= 50) {
    return 16; // 16 concurrent chunks for 50GB+ files
  } else if (fileSizeGB >= 20) {
    return 14; // 14 concurrent chunks for 20-50GB files
  } else if (fileSizeGB >= 10) {
    return 12; // 12 concurrent chunks for 10-20GB files
  } else if (fileSizeGB >= 5) {
    return 10; // 10 concurrent chunks for 5-10GB files
  } else if (fileSizeGB >= 2) {
    return 8; // 8 concurrent chunks for 2-5GB files
  } else if (fileSizeGB >= 1) {
    return 6; // 6 concurrent chunks for 1-2GB files
  } else if (fileSizeGB >= 0.5) {
    return 4; // 4 concurrent chunks for 500MB-1GB files
  } else if (fileSizeGB >= 0.1) {
    return 3; // 3 concurrent chunks for 100-500MB files
  } else {
    return 2; // 2 concurrent chunks for <100MB files
  }
}

// Dynamic buffer threshold calculation
function calculateOptimalBufferThreshold(fileSize) {
  const fileSizeGB = fileSize / (1024 * 1024 * 1024);
  
  if (fileSizeGB >= 50) {
    return 256 * 1024 * 1024; // 256MB threshold for 50GB+ files
  } else if (fileSizeGB >= 20) {
    return 192 * 1024 * 1024; // 192MB threshold for 20-50GB files
  } else if (fileSizeGB >= 10) {
    return 128 * 1024 * 1024; // 128MB threshold for 10-20GB files
  } else if (fileSizeGB >= 5) {
    return 96 * 1024 * 1024; // 96MB threshold for 5-10GB files
  } else if (fileSizeGB >= 2) {
    return 64 * 1024 * 1024; // 64MB threshold for 2-5GB files
  } else if (fileSizeGB >= 1) {
    return 48 * 1024 * 1024; // 48MB threshold for 1-2GB files
  } else {
    return 32 * 1024 * 1024; // 32MB threshold for <1GB files
  }
}

// Unlimited transfer strategy
function getUnlimitedTransferStrategy(fileSize) {
  const fileSizeGB = fileSize / (1024 * 1024 * 1024);
  
  if (fileSizeGB >= 50) {
    return 'extreme-massive'; // 50GB+ files
  } else if (fileSizeGB >= 20) {
    return 'ultra-massive'; // 20-50GB files
  } else if (fileSizeGB >= 10) {
    return 'super-massive'; // 10-20GB files
  } else if (fileSizeGB >= 5) {
    return 'very-massive'; // 5-10GB files
  } else if (fileSizeGB >= 2) {
    return 'massive'; // 2-5GB files
  } else if (fileSizeGB >= 1) {
    return 'large-plus'; // 1-2GB files
  } else if (fileSizeGB >= 0.5) {
    return 'large'; // 500MB-1GB files
  } else if (fileSizeGB >= 0.1) {
    return 'medium'; // 100-500MB files
  } else {
    return 'small'; // <100MB files
  }
}

export const detectConnectionType = async () => {
  try {
    // Try to detect if we're on a local network
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    
    if (connection) {
      const { effectiveType, downlink } = connection;
      
      // High speed connection indicators
      if (downlink > 10 || effectiveType === '4g') {
        return 'fast';
      }
    }

    // Simple RTT test to detect local network
    const start = performance.now();
    try {
      await fetch('/api/ping', { method: 'HEAD' });
      const rtt = performance.now() - start;
      
      if (rtt < 10) {
        return 'local'; // Very fast response suggests local network
      } else if (rtt < 50) {
        return 'fast';
      }
    } catch (e) {
      // Fallback if ping endpoint doesn't exist
    }

    return 'unknown';
  } catch (error) {
    console.log('Connection detection failed:', error);
    return 'unknown';
  }
};

export const optimizeDataChannelSettings = (fileSize) => {
  const fileSizeGB = fileSize / (1024 * 1024 * 1024);
  
  // For maximum speed, we use maxPacketLifeTime instead of maxRetransmits
  // Cannot use both at the same time - WebRTC constraint
  let maxPacketLifeTime;
  if (fileSizeGB >= 50) {
    maxPacketLifeTime = 30000; // 30 seconds for 50GB+ files
  } else if (fileSizeGB >= 20) {
    maxPacketLifeTime = 25000; // 25 seconds for 20-50GB files
  } else if (fileSizeGB >= 10) {
    maxPacketLifeTime = 20000; // 20 seconds for 10-20GB files
  } else if (fileSizeGB >= 5) {
    maxPacketLifeTime = 15000; // 15 seconds for 5-10GB files
  } else if (fileSizeGB >= 1) {
    maxPacketLifeTime = 10000; // 10 seconds for 1-5GB files
  } else {
    maxPacketLifeTime = 5000; // 5 seconds for <1GB files
  }
  
  return {
    ordered: false, // Always unordered for maximum speed
    // Use maxPacketLifeTime for speed (not maxRetransmits)
    maxPacketLifeTime,
    protocol: fileSizeGB >= 10 ? 'unlimited-massive-transfer' : 'optimized-transfer',
    binaryType: 'arraybuffer'
  };
};

// Enhanced memory management for unlimited file sizes
export const getMemoryOptimizedSettings = (fileSize, availableMemory = null) => {
  const fileSizeGB = fileSize / (1024 * 1024 * 1024);
  
  // Estimate available memory with better fallbacks
  let memoryGB;
  if (availableMemory) {
    memoryGB = availableMemory / (1024 * 1024 * 1024);
  } else if (navigator.deviceMemory) {
    memoryGB = navigator.deviceMemory;
  } else {
    // Conservative fallback based on file size
    memoryGB = Math.max(4, Math.min(16, fileSizeGB * 2));
  }
  
  // Dynamic memory allocation - use up to 40% of available memory for massive files
  const maxBufferGB = Math.min(
    memoryGB * (fileSizeGB >= 10 ? 0.4 : fileSizeGB >= 5 ? 0.35 : 0.3),
    2 // Cap at 2GB buffer
  );
  
  return {
    maxBufferSize: maxBufferGB * 1024 * 1024 * 1024,
    preloadChunks: Math.min(100, Math.floor((maxBufferGB * 1024) / 16)), // Preload based on memory
    gcInterval: fileSizeGB >= 20 ? 25 : fileSizeGB >= 10 ? 40 : fileSizeGB >= 5 ? 50 : 100,
    memoryStrategy: fileSizeGB >= 20 ? 'ultra-aggressive' : fileSizeGB >= 10 ? 'aggressive' : 'optimized'
  };
};

// Unlimited transfer strategy with no upper bounds
export const getTransferStrategy = (fileSize, networkSpeed = null) => {
  const fileSizeGB = fileSize / (1024 * 1024 * 1024);
  
  if (fileSizeGB >= 100) {
    return 'extreme-unlimited'; // 100GB+ files - no limits
  } else if (fileSizeGB >= 50) {
    return 'ultra-unlimited'; // 50-100GB files
  } else if (fileSizeGB >= 20) {
    return 'super-unlimited'; // 20-50GB files
  } else if (fileSizeGB >= 10) {
    return 'mega-unlimited'; // 10-20GB files
  } else if (fileSizeGB >= 5) {
    return 'ultra-massive'; // 5-10GB files
  } else if (fileSizeGB >= 2) {
    return 'massive'; // 2-5GB files
  } else if (fileSizeGB >= 1) {
    return 'large-optimized'; // 1-2GB files
  } else {
    return 'fast-optimized'; // <1GB files
  }
};

// Real-time performance adaptation
export const adaptSettingsRealTime = (currentSettings, transferredBytes, elapsedTimeMs, targetSpeed = null) => {
  const currentSpeedBps = transferredBytes / (elapsedTimeMs / 1000);
  const currentSpeedMbps = currentSpeedBps / (1024 * 1024);
  
  let adaptedSettings = { ...currentSettings };
  
  // If we're going really fast, increase everything
  if (currentSpeedMbps > 100) { // 100 MB/s
    adaptedSettings.chunkSize = Math.min(adaptedSettings.chunkSize * 1.25, 32 * 1024 * 1024); // Up to 32MB
    adaptedSettings.concurrentChunks = Math.min(adaptedSettings.concurrentChunks + 2, 64);
    adaptedSettings.batchSize = Math.min(adaptedSettings.batchSize * 1.2, 200);
  } else if (currentSpeedMbps > 50) { // 50 MB/s
    adaptedSettings.chunkSize = Math.min(adaptedSettings.chunkSize * 1.1, 24 * 1024 * 1024); // Up to 24MB
    adaptedSettings.concurrentChunks = Math.min(adaptedSettings.concurrentChunks + 1, 48);
  } else if (currentSpeedMbps < 10 && adaptedSettings.chunkSize > 1024 * 1024) { // < 10 MB/s
    // Scale back if we're going too slow
    adaptedSettings.chunkSize = Math.max(adaptedSettings.chunkSize * 0.8, 512 * 1024);
    adaptedSettings.concurrentChunks = Math.max(adaptedSettings.concurrentChunks - 1, 2);
  }
  
  return adaptedSettings;
};
