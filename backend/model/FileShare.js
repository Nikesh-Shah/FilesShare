
import mongoose from 'mongoose';

const fileShareSchema = new mongoose.Schema({
    fileName: { type: String, required: true },
    filePath: { type: String },
    pathType: { type: String, enum: ['relative', 'filename-only', 'folder', 'multiple-files'], default: 'filename-only' },
    fileType: { type: String },
    fileSize: { type: Number, required: true },
    lastModified: { type: Date },
    roomId: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    shareMode: { type: String, enum: ['single', 'multi'], default: 'single' },
    status: { type: String, enum: ['active', 'completed', 'expired'], default: 'active' },
    downloadEnabled: { type: Boolean, default: true },
    senderEmail: { type: String },
}, {
    timestamps: true,
});

export default mongoose.model('FileShare', fileShareSchema);
