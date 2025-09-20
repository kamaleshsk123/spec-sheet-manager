"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const database_1 = __importDefault(require("../config/database"));
class AuthController {
    static async register(req, res) {
        try {
            const { email, name, password } = req.body;
            // Check if user already exists
            const existingUser = await database_1.default.query('SELECT id FROM users WHERE email = $1', [email]);
            if (existingUser.rows.length > 0) {
                return res.status(400).json({
                    success: false,
                    error: 'User with this email already exists'
                });
            }
            // Hash password
            const saltRounds = 12;
            const password_hash = await bcryptjs_1.default.hash(password, saltRounds);
            // Create user
            const result = await database_1.default.query(`INSERT INTO users (email, name, password_hash) 
         VALUES ($1, $2, $3) 
         RETURNING id, email, name, created_at`, [email, name, password_hash]);
            const user = result.rows[0];
            // Generate JWT token
            const token = jsonwebtoken_1.default.sign({ id: user.id, email: user.email, name: user.name }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
            res.status(201).json({
                success: true,
                data: {
                    user: {
                        id: user.id,
                        email: user.email,
                        name: user.name,
                        created_at: user.created_at
                    },
                    token
                },
                message: 'User registered successfully'
            });
        }
        catch (error) {
            console.error('Registration error:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error'
            });
        }
    }
    static async login(req, res) {
        try {
            const { email, password } = req.body;
            // Find user
            const result = await database_1.default.query('SELECT id, email, name, password_hash, created_at FROM users WHERE email = $1', [email]);
            if (result.rows.length === 0) {
                return res.status(401).json({
                    success: false,
                    error: 'Invalid email or password'
                });
            }
            const user = result.rows[0];
            // Verify password
            const isValidPassword = await bcryptjs_1.default.compare(password, user.password_hash);
            if (!isValidPassword) {
                return res.status(401).json({
                    success: false,
                    error: 'Invalid email or password'
                });
            }
            // Generate JWT token
            const token = jsonwebtoken_1.default.sign({ id: user.id, email: user.email, name: user.name }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
            res.json({
                success: true,
                data: {
                    user: {
                        id: user.id,
                        email: user.email,
                        name: user.name,
                        created_at: user.created_at
                    },
                    token
                },
                message: 'Login successful'
            });
        }
        catch (error) {
            console.error('Login error:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error'
            });
        }
    }
    static async getProfile(req, res) {
        try {
            const userId = req.user.id;
            const result = await database_1.default.query('SELECT id, email, name, created_at FROM users WHERE id = $1', [userId]);
            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'User not found'
                });
            }
            res.json({
                success: true,
                data: result.rows[0]
            });
        }
        catch (error) {
            console.error('Get profile error:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error'
            });
        }
    }
}
exports.AuthController = AuthController;
//# sourceMappingURL=authController.js.map