import express from 'express';
import { requireAdmin } from '../middleware/adminAuth.js';
import {
    getAllUsers,
    getUserById,
    toggleUserActive,
    deleteUser,
    getDashboardStats,
} from '../controller/adminController.js';

const router = express.Router();

// All routes require admin authentication
router.use(requireAdmin);

router.get('/stats', getDashboardStats);
router.get('/users', getAllUsers);
router.get('/users/:id', getUserById);
router.put('/users/:id/toggle-active', toggleUserActive);
router.delete('/users/:id', deleteUser);

export default router;
