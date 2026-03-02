import express from 'express';
import { createFileShare, getFileShares, updateFileShareStatus, toggleDownloadPermission, checkDownloadPermission, deleteFileShare, deleteAllFileShares, getRoomByOtp } from '../controller/fileShareController.js';

const router = express.Router();

router.post('/create', createFileShare);
router.get('/list', getFileShares);
router.get('/by-otp/:otp', getRoomByOtp);
router.put('/status/:roomId', updateFileShareStatus);
router.put('/download-permission/:roomId', toggleDownloadPermission);
router.get('/download-permission/:roomId', checkDownloadPermission);
router.delete('/delete/:roomId', deleteFileShare);
router.delete('/delete-all/:senderEmail', deleteAllFileShares);

export default router;
