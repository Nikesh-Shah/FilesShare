import User from '../model/user.js';

/**
 * GET /api/admin/users — list all users with details
 */
export const getAllUsers = async (req, res) => {
    try {
        const users = await User.find()
            .select('-password')
            .sort({ createdAt: -1 })
            .lean();

        const stats = {
            totalUsers: users.length,
            activeUsers: users.filter(u => u.isActive).length,
            adminCount: users.filter(u => u.role === 'admin').length,
        };

        res.json({ users, stats });
    } catch (err) {
        console.error('Admin getAllUsers error:', err);
        res.status(500).json({ message: 'Failed to fetch users.' });
    }
};

/**
 * GET /api/admin/users/:id — single user detail
 */
export const getUserById = async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password').lean();
        if (!user) return res.status(404).json({ message: 'User not found.' });
        res.json({ user });
    } catch (err) {
        console.error('Admin getUserById error:', err);
        res.status(500).json({ message: 'Failed to fetch user.' });
    }
};

/**
 * PUT /api/admin/users/:id/toggle-active — activate / deactivate a user
 */
export const toggleUserActive = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'User not found.' });

        // Prevent deactivating self (the admin currently logged in)
        if (user._id.toString() === req.user._id.toString()) {
            return res.status(400).json({ message: 'You cannot deactivate your own account.' });
        }

        // Prevent deactivating other admins
        if (user.role === 'admin') {
            return res.status(400).json({ message: 'Cannot deactivate an admin account.' });
        }

        user.isActive = !user.isActive;
        await user.save();

        res.json({ message: `User ${user.isActive ? 'activated' : 'deactivated'}.`, isActive: user.isActive });
    } catch (err) {
        console.error('Admin toggleUserActive error:', err);
        res.status(500).json({ message: 'Failed to update user.' });
    }
};

/**
 * DELETE /api/admin/users/:id — permanently delete a user
 */
export const deleteUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'User not found.' });

        if (user.role === 'admin') {
            return res.status(400).json({ message: 'Cannot delete an admin account.' });
        }

        await User.findByIdAndDelete(req.params.id);
        res.json({ message: 'User deleted.' });
    } catch (err) {
        console.error('Admin deleteUser error:', err);
        res.status(500).json({ message: 'Failed to delete user.' });
    }
};

/**
 * GET /api/admin/stats — dashboard overview stats
 */
export const getDashboardStats = async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const activeUsers = await User.countDocuments({ isActive: true });
        const adminCount = await User.countDocuments({ role: 'admin' });

        // Users who logged in within last 24h
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const recentLogins = await User.countDocuments({ lastLoginAt: { $gte: oneDayAgo } });

        // Users registered in the last 7 days
        const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const newUsersThisWeek = await User.countDocuments({ createdAt: { $gte: oneWeekAgo } });

        res.json({
            totalUsers,
            activeUsers,
            adminCount,
            recentLogins,
            newUsersThisWeek,
        });
    } catch (err) {
        console.error('Admin getDashboardStats error:', err);
        res.status(500).json({ message: 'Failed to fetch stats.' });
    }
};
