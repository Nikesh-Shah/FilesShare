import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import User from '../model/user.js'; 

/**
 * Helper: extract client IP from request (handles proxies like Render / Netlify)
 */
const getClientIp = (req) => {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) return forwarded.split(',')[0].trim();
    return req.socket?.remoteAddress || req.ip || 'unknown';
};

export const register = async (req, res) => {
    const { email, password } = req.body;

    try {
        // Block registration of admin accounts
        // Admin is seeded at startup — never created through the API
        const existingAdmin = await User.findOne({ email, role: 'admin' });
        if (existingAdmin) {
            return res.status(403).json({
                message: 'This account cannot be registered.',
                error: 'Forbidden'
            });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ 
                message: 'An account with this email address already exists. Please try logging in instead.',
                error: 'User already exists'
            });
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create new user — always role 'user'
        const user = await User.create({
            email,
            password: hashedPassword,
            role: 'user',
            registrationIp: getClientIp(req),
            userAgent: req.headers['user-agent'] || null,
        });

        res.status(201).json({ 
            message: 'Account created successfully! You can now log in with your credentials.',
            userId: user._id 
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ 
            message: 'Sorry, something went wrong while creating your account. Please try again.',
            error: 'Internal server error'
        });
    }
}
  export const login = async (req, res) => {
        const{ email, password } = req.body;
        try {
            // Find user by email
            const user = await User.findOne({ email });
            if (!user) {
                return res.status(404).json({ 
                    message: 'No account found with this email address. Please check your email or register for a new account.',
                    error: 'User not found'
                });
            }

            // Check if user is active
            if (!user.isActive) {
                return res.status(403).json({
                    message: 'This account has been deactivated. Please contact support.',
                    error: 'Account deactivated'
                });
            }

            // Compare passwords
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                return res.status(401).json({ 
                    message: 'Incorrect password. Please check your password and try again.',
                    error: 'Invalid credentials'
                });
            }

            // Update login metadata
            user.lastLoginAt = new Date();
            user.lastLoginIp = getClientIp(req);
            user.userAgent = req.headers['user-agent'] || user.userAgent;
            user.loginCount = (user.loginCount || 0) + 1;
            await user.save();

            // Generate JWT token — include role
            const token = jwt.sign(
                { userId: user._id, role: user.role },
                process.env.JWT_SECRET,
                { expiresIn: process.env.JWT_EXPIRATION }
            );

            res.status(200).json({ 
                message: 'Welcome back! Login successful.',
                token,
                role: user.role,
            });
        } catch (error) {
            console.error('Login error:', error);
            res.status(500).json({ 
                message: 'Sorry, something went wrong while logging you in. Please try again.',
                error: 'Internal server error'
            });
        }   
    }