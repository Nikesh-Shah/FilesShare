// Performance monitoring utilities for massive file transfers

export class TransferPerformanceMonitor {
  constructor() {
    this.startTime = null;
    this.lastCheckpoint = null;
    this.bytesTransferred = 0;
    this.checkpoints = [];
    this.isMonitoring = false;
  }

  start() {
    this.startTime = Date.now();
    this.lastCheckpoint = this.startTime;
    this.bytesTransferred = 0;
    this.checkpoints = [];
    this.isMonitoring = true;
    console.log('Performance monitoring started for massive file transfer');
  }

  updateProgress(bytesTransferred) {
    if (!this.isMonitoring) return;
    
    const now = Date.now();
    this.bytesTransferred = bytesTransferred;
    
    // Create checkpoint every 5 seconds for massive files
    if (now - this.lastCheckpoint >= 5000) {
      const checkpoint = {
        timestamp: now,
        bytesTransferred,
        elapsedTime: now - this.startTime,
        intervalSpeed: this.calculateIntervalSpeed(bytesTransferred, now)
      };
      
      this.checkpoints.push(checkpoint);
      this.lastCheckpoint = now;
      
      // Keep only last 20 checkpoints for memory efficiency
      if (this.checkpoints.length > 20) {
        this.checkpoints.shift();
      }
    }
  }

  calculateIntervalSpeed(bytes, timestamp) {
    if (this.checkpoints.length === 0) {
      return bytes / ((timestamp - this.startTime) / 1000);
    }
    
    const lastCheckpoint = this.checkpoints[this.checkpoints.length - 1];
    const intervalBytes = bytes - lastCheckpoint.bytesTransferred;
    const intervalTime = (timestamp - lastCheckpoint.timestamp) / 1000;
    
    return intervalTime > 0 ? intervalBytes / intervalTime : 0;
  }

  getCurrentSpeed() {
    if (!this.isMonitoring || !this.startTime) return 0;
    
    const now = Date.now();
    const elapsedTime = (now - this.startTime) / 1000;
    return elapsedTime > 0 ? this.bytesTransferred / elapsedTime : 0;
  }

  getAverageSpeed() {
    if (this.checkpoints.length < 2) {
      return this.getCurrentSpeed();
    }
    
    const speeds = this.checkpoints.map(cp => cp.intervalSpeed);
    const sum = speeds.reduce((acc, speed) => acc + speed, 0);
    return sum / speeds.length;
  }

  getOptimalChunkSize(currentChunkSize, currentSpeed, targetSpeed = null) {
    if (!this.isMonitoring) return currentChunkSize;
    
    const speed = this.getCurrentSpeed();
    const avgSpeed = this.getAverageSpeed();
    
    // If we're performing well above expectations, increase chunk size
    if (speed > 50 * 1024 * 1024) { // 50 MB/s
      return Math.min(currentChunkSize * 1.5, 8 * 1024 * 1024); // Up to 8MB chunks
    } else if (speed > 20 * 1024 * 1024) { // 20 MB/s
      return Math.min(currentChunkSize * 1.25, 4 * 1024 * 1024); // Up to 4MB chunks
    } else if (speed < 5 * 1024 * 1024 && currentChunkSize > 1024 * 1024) { // < 5 MB/s
      return Math.max(currentChunkSize * 0.8, 512 * 1024); // Reduce to min 512KB
    }
    
    return currentChunkSize;
  }

  getOptimalBufferSize(fileSize, currentSpeed) {
    const fileSizeGB = fileSize / (1024 * 1024 * 1024);
    const speedMBps = currentSpeed / (1024 * 1024);
    
    // Buffer should be enough for 2-3 seconds of data at current speed
    const speedBasedBuffer = Math.ceil(speedMBps * 2.5) * 1024 * 1024;
    
    // File size based buffer (higher for larger files)
    let fileSizeBasedBuffer;
    if (fileSizeGB >= 5) {
      fileSizeBasedBuffer = 128 * 1024 * 1024; // 128MB
    } else if (fileSizeGB >= 2) {
      fileSizeBasedBuffer = 96 * 1024 * 1024; // 96MB
    } else if (fileSizeGB >= 1) {
      fileSizeBasedBuffer = 64 * 1024 * 1024; // 64MB
    } else {
      fileSizeBasedBuffer = 32 * 1024 * 1024; // 32MB
    }
    
    // Use the larger of the two, capped at 256MB
    return Math.min(Math.max(speedBasedBuffer, fileSizeBasedBuffer), 256 * 1024 * 1024);
  }

  shouldTriggerGarbageCollection() {
    // Trigger GC every 100MB transferred for massive files
    return this.bytesTransferred > 0 && this.bytesTransferred % (100 * 1024 * 1024) === 0;
  }

  getPerformanceReport() {
    if (!this.isMonitoring) return null;
    
    const currentSpeed = this.getCurrentSpeed();
    const avgSpeed = this.getAverageSpeed();
    const elapsedTime = (Date.now() - this.startTime) / 1000;
    
    return {
      elapsedTime,
      bytesTransferred: this.bytesTransferred,
      currentSpeed,
      averageSpeed: avgSpeed,
      speedFormatted: this.formatSpeed(currentSpeed),
      avgSpeedFormatted: this.formatSpeed(avgSpeed),
      checkpointCount: this.checkpoints.length,
      memoryRecommendation: this.shouldTriggerGarbageCollection() ? 'gc-recommended' : 'normal'
    };
  }

  formatSpeed(bytesPerSecond) {
    if (bytesPerSecond > 1024 * 1024 * 1024) {
      return `${(bytesPerSecond / (1024 * 1024 * 1024)).toFixed(2)} GB/s`;
    } else if (bytesPerSecond > 1024 * 1024) {
      return `${(bytesPerSecond / (1024 * 1024)).toFixed(1)} MB/s`;
    } else {
      return `${(bytesPerSecond / 1024).toFixed(1)} KB/s`;
    }
  }

  stop() {
    this.isMonitoring = false;
    const report = this.getPerformanceReport();
    console.log('Performance monitoring stopped. Final report:', report);
    return report;
  }
}

// Utility functions for massive file optimization
export const estimateOptimalSettings = (fileSize, connectionType = 'unknown') => {
  const fileSizeGB = fileSize / (1024 * 1024 * 1024);
  
  // Base settings for massive files
  let settings = {
    useStreaming: fileSizeGB >= 1, // Use streaming for 1GB+ files
    preloadAmount: Math.min(100 * 1024 * 1024, fileSize * 0.1), // Preload 100MB or 10% of file
    maxConcurrentChunks: fileSizeGB >= 5 ? 12 : fileSizeGB >= 2 ? 8 : 6,
    progressUpdateInterval: fileSizeGB >= 5 ? 100 : 200, // More frequent updates for huge files
    memoryManagement: fileSizeGB >= 2 ? 'aggressive' : 'normal'
  };
  
  // Connection-specific optimizations
  if (connectionType === 'local' || connectionType === 'lan') {
    settings.maxConcurrentChunks += 4; // More concurrency on local network
    settings.progressUpdateInterval = Math.max(50, settings.progressUpdateInterval / 2);
  }
  
  return settings;
};

// Memory management utilities
export const optimizeMemoryUsage = (transferredBytes, totalSize) => {
  const transferredGB = transferredBytes / (1024 * 1024 * 1024);
  const totalGB = totalSize / (1024 * 1024 * 1024);
  
  return {
    shouldCompactBuffers: transferredGB > 0.5 && transferredGB % 0.5 === 0, // Every 500MB
    shouldTriggerGC: transferredGB > 1 && transferredGB % 1 === 0, // Every 1GB
    bufferCompactionNeeded: transferredBytes > totalSize * 0.1, // After 10% of file
    memoryPressure: transferredGB > 2 ? 'high' : transferredGB > 1 ? 'medium' : 'low'
  };
};
