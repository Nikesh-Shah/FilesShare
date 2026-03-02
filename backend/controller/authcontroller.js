import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import User from '../model/user.js'; 

export const register = async (req, res) => {
    const { email, password } = req.body;

    try {
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

        // Create new user
        const user = await User.create({ email, password: hashedPassword });

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

            // Compare passwords
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                return res.status(401).json({ 
                    message: 'Incorrect password. Please check your password and try again.',
                    error: 'Invalid credentials'
                });
            }

            // Generate JWT token
            const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRATION });

            res.status(200).json({ 
                message: 'Welcome back! Login successful.',
                token 
            });
        } catch (error) {
            console.error('Login error:', error);
            res.status(500).json({ 
                message: 'Sorry, something went wrong while logging you in. Please try again.',
                error: 'Internal server error'
            });
        }   
    }