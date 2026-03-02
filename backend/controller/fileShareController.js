import FileShare from '../model/FileShare.js';
import { otpRoomMap } from '../otpStore.js';

// Store io instance for socket emissions
let ioInstance = null;

export const setIoInstance = (io) => {
    ioInstance = io;
};

export const createFileShare = async (req, res) => {
    try {
        const { 
            fileName, 
            filePath, 
            pathType, 
            fileType, 
            fileSize, 
            lastModified, 
            roomId, 
            password, 
            shareMode, 
            senderEmail 
        } = req.body;
        
        const fileShare = await FileShare.create({
            fileName,
            filePath,
            pathType,
            fileType,
            fileSize,
            lastModified,
            roomId,
            password,
            shareMode,
            senderEmail
        });

        res.status(201).json({ 
            success: true, 
            fileShare: {
                id: fileShare._id,
                fileName: fileShare.fileName,
                fileSize: fileShare.fileSize,
                roomId: fileShare.roomId,
                shareMode: fileShare.shareMode,
                status: fileShare.status,
                createdAt: fileShare.createdAt
            }
        });
    } catch (error) {
        console.error('Error creating file share:', error);
        res.status(500).json({ 
            error: 'Sorry, we couldn\'t save your file sharing information. Please try again.',
            message: 'Failed to create file share record'
        });
    }
};

export const getFileShares = async (req, res) => {
    try {
        const { senderEmail } = req.query;
        
        const query = {};
        if (senderEmail) {
            query.senderEmail = senderEmail;
        }

        const fileShares = await FileShare.find(query)
            .sort({ createdAt: -1 })
            .select('fileName filePath fileSize roomId password shareMode status downloadEnabled fileType lastModified createdAt');

        res.json({ success: true, fileShares });
    } catch (error) {
        console.error('Error fetching file shares:', error);
        res.status(500).json({ 
            error: 'Sorry, we couldn\'t load your file sharing history. Please refresh and try again.',
            message: 'Failed to fetch file shares'
        });
    }
};

export const updateFileShareStatus = async (req, res) => {
    try {
        const { roomId } = req.params;
        const { status } = req.body;

        const fileShare = await FileShare.findOne({ roomId });
        
        if (!fileShare) {
            // Room not in DB (in-memory only share or DB unavailable) — not a fatal error
            return res.json({ success: true, message: 'Status acknowledged (no DB record).' });
        }

        fileShare.status = status;
        await fileShare.save();

        res.json({ success: true, message: 'File share status updated successfully!' });
    } catch (error) {
        // DB unavailable — silently succeed so sender UI isn't disrupted
        return res.json({ success: true, message: 'Status acknowledged (DB unavailable).' });
    }
};

export const toggleDownloadPermission = async (req, res) => {
    try {
        const { roomId } = req.params;
        const { downloadEnabled } = req.body;

        const fileShare = await FileShare.findOne({ roomId });
        
        if (!fileShare) {
            return res.status(404).json({ 
                error: 'File share not found. The file may have been removed or the link is invalid.',
                message: 'File share not found'
            });
        }

        fileShare.downloadEnabled = downloadEnabled;
        await fileShare.save();

        // Emit socket event to notify receivers about permission change
        if (ioInstance) {
            ioInstance.to(roomId).emit('download-permission-changed', {
                roomId,
                downloadEnabled
            });
            console.log(`Emitted download-permission-changed to room ${roomId}: ${downloadEnabled}`);
        }

        res.json({ 
            success: true, 
            message: `Download ${downloadEnabled ? 'enabled' : 'disabled'} successfully!`,
            downloadEnabled: fileShare.downloadEnabled
        });
    } catch (error) {
        console.error('Error toggling download permission:', error);
        res.status(500).json({ 
            error: 'Sorry, we couldn\'t change the download permission. Please try again.',
            message: 'Failed to toggle download permission'
        });
    }
};

export const checkDownloadPermission = async (req, res) => {
    try {
        const { roomId } = req.params;

        const fileShare = await FileShare.findOne({ roomId }).select('downloadEnabled status fileName');
        
        if (!fileShare) {
            // In-memory only share or DB unavailable — default to permitted
            return res.json({ success: true, downloadEnabled: true, status: 'active', fileName: null });
        }

        res.json({ 
            success: true, 
            downloadEnabled: fileShare.downloadEnabled,
            status: fileShare.status,
            fileName: fileShare.fileName
        });
    } catch (error) {
        // DB unavailable — default to permitted so receiver can proceed
        return res.json({ success: true, downloadEnabled: true, status: 'active', fileName: null });
    }
};

export const deleteFileShare = async (req, res) => {
    try {
        const { roomId } = req.params;

        const fileShare = await FileShare.findOne({ roomId });
        
        if (!fileShare) {
            return res.status(404).json({ 
                error: 'File share not found. The file may have already been deleted.',
                message: 'File share not found'
            });
        }

        await fileShare.deleteOne();

        res.json({ 
            success: true, 
            message: 'File share deleted successfully!'
        });
    } catch (error) {
        console.error('Error deleting file share:', error);
        res.status(500).json({ 
            error: 'Sorry, we couldn\'t delete the file share. Please try again.',
            message: 'Failed to delete file share'
        });
    }
};

export const deleteAllFileShares = async (req, res) => {
    try {
        const { senderEmail } = req.params;

        const result = await FileShare.deleteMany({ senderEmail });

        res.json({ 
            success: true, 
            message: result.deletedCount > 0 
                ? `${result.deletedCount} file share(s) deleted successfully!` 
                : 'No file shares found to delete.',
            deletedCount: result.deletedCount
        });
    } catch (error) {
        console.error('Error deleting all file shares:', error);
        res.status(500).json({ 
            error: 'Sorry, we couldn\'t delete your file shares. Please try again.',
            message: 'Failed to delete all file shares'
        });
    }
};

export const getRoomByOtp = async (req, res) => {
    try {
        const { otp } = req.params;
        if (!otp) return res.status(400).json({ error: 'OTP is required.' });

        const normalizedOtp = otp.toUpperCase();

        // Check in-memory map first (works without MongoDB, covers all share types)
        const memRoomId = otpRoomMap.get(normalizedOtp);
        if (memRoomId) {
            return res.json({ success: true, roomId: memRoomId });
        }

        // Fallback: query MongoDB (for shares created in a previous session)
        try {
            const share = await FileShare.findOne({ password: normalizedOtp })
                .select('roomId password');
            if (share) {
                return res.json({ success: true, roomId: share.roomId });
            }
        } catch (_) {
            // MongoDB unavailable — silent fallback
        }

        return res.status(404).json({ error: 'Invalid code. No active share found.' });
    } catch (error) {
        console.error('Error looking up room by OTP:', error);
        res.status(500).json({ error: 'Server error. Please try again.' });
    }
};
