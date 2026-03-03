import bcrypt from 'bcrypt';
import User from './model/user.js';

/**
 * Seed the default admin account on server startup.
 * Uses ADMIN_EMAIL / ADMIN_PASSWORD env vars, or falls back to defaults.
 * This is the ONLY way an admin account gets created — registration is blocked.
 */
export async function seedDefaultAdmin() {
    const email = process.env.ADMIN_EMAIL || 'admin@fileshare.com';
    const plainPassword = process.env.ADMIN_PASSWORD || 'Admin@123';

    try {
        const existing = await User.findOne({ email });
        if (existing) {
            // Ensure the role is admin (in case it was changed accidentally)
            if (existing.role !== 'admin') {
                existing.role = 'admin';
                await existing.save();
                console.log(`[SEED] Promoted ${email} to admin.`);
            } else {
                console.log(`[SEED] Admin account already exists: ${email}`);
            }
            return;
        }

        const hashedPassword = await bcrypt.hash(plainPassword, 10);
        await User.create({
            email,
            password: hashedPassword,
            role: 'admin',
            isActive: true,
            registrationIp: '127.0.0.1',
        });
        console.log(`[SEED] Default admin created: ${email}`);
    } catch (err) {
        console.error('[SEED] Failed to seed admin:', err.message);
    }
}
