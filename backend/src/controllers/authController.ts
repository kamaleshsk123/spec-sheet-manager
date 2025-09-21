import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../config/database';
import { CreateUserRequest, LoginRequest, User, ApiResponse } from '../models/types';
import axios from 'axios';

interface GitHubTokenResponse {
  access_token: string;
  token_type: string;
  scope: string;
}

interface GitHubUserResponse {
  id: number;
  login: string;
  email: string | null;
  name: string | null;
}

export class AuthController {
  static async register(req: Request, res: Response) {
    try {
      const { email, name, password }: CreateUserRequest = req.body;

      // Check if user already exists
      const existingUser = await pool.query(
        'SELECT id FROM users WHERE email = $1',
        [email]
      );

      if (existingUser.rows.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'User with this email already exists'
        } as ApiResponse);
      }

      // Hash password
      const saltRounds = 12;
      const password_hash = await bcrypt.hash(password, saltRounds);

      // Create user
      const result = await pool.query(
        `INSERT INTO users (email, name, password_hash) 
         VALUES ($1, $2, $3) 
         RETURNING id, email, name, created_at`,
        [email, name, password_hash]
      );

      const user = result.rows[0];

      // Generate JWT token
      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) {
        throw new Error('JWT_SECRET is not defined');
      }

      const options: jwt.SignOptions = {
        expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as any,
      };
      const token = jwt.sign(
        {
          id: user.id,
          email: user.email,
          name: user.name
        },
        jwtSecret,
        options
      );
      
            res.status(201).json({        success: true,
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
      } as ApiResponse);

    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      } as ApiResponse);
    }
  }

  static async login(req: Request, res: Response) {
    try {
      const { email, password }: LoginRequest = req.body;

      // Find user
      const result = await pool.query(
        'SELECT id, email, name, password_hash, created_at, github_id, github_username FROM users WHERE email = $1',
        [email]
      );

      if (result.rows.length === 0) {
        return res.status(401).json({
          success: false,
          error: 'Invalid email or password'
        } as ApiResponse);
      }

      const user = result.rows[0];

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          error: 'Invalid email or password'
        } as ApiResponse);
      }

      // Generate JWT token
      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) {
        throw new Error('JWT_SECRET is not defined');
      }

      const options: jwt.SignOptions = {
        expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as any,
      };
      const token = jwt.sign(
        {
          id: user.id,
          email: user.email,
          name: user.name
        },
        jwtSecret,
        options
      );

      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            created_at: user.created_at,
            github_id: user.github_id,
            github_username: user.github_username
          },
          token
        },
        message: 'Login successful'
      } as ApiResponse);

    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      } as ApiResponse);
    }
  }

  static async getProfile(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;

      const result = await pool.query(
        'SELECT id, email, name, created_at, github_id, github_username FROM users WHERE id = $1',
        [userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        } as ApiResponse);
      }

      res.json({
        success: true,
        data: result.rows[0]
      } as ApiResponse);

    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      } as ApiResponse);
    }
  }

  static async githubAuth(req: Request, res: Response) {
    const githubClientId = process.env.GITHUB_CLIENT_ID;
    const redirectUri = `http://localhost:3000/api/auth/github/callback`;
    const scope = 'read:user user:email repo';
    const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${githubClientId}&redirect_uri=${redirectUri}&scope=${scope}`;
    res.redirect(githubAuthUrl);
  }

  static async githubCallback(req: Request, res: Response) {
    const code = req.query.code as string;
    const githubClientId = process.env.GITHUB_CLIENT_ID;
    const githubClientSecret = process.env.GITHUB_CLIENT_SECRET;

    try {
      const tokenResponse = await axios.post<GitHubTokenResponse>('https://github.com/login/oauth/access_token', {
        client_id: githubClientId,
        client_secret: githubClientSecret,
        code: code,
      }, {
        headers: { Accept: 'application/json' },
      });

      const accessToken = tokenResponse.data.access_token;

      const userResponse = await axios.get<GitHubUserResponse>('https://api.github.com/user', {
        headers: { Authorization: `token ${accessToken}` },
      });

      const githubUser = userResponse.data;
      const { id: github_id, login: github_username, email, name } = githubUser;

      if (!email) {
        return res.status(400).json({
          success: false,
          error: 'Could not retrieve a public email from your GitHub account. Please add a public email to your GitHub profile and try again.'
        });
      }

      let userResult = await pool.query('SELECT * FROM users WHERE github_id = $1', [github_id]);
      let user = userResult.rows[0];

      if (!user) {
        userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        user = userResult.rows[0];

        if (user) {
          await pool.query('UPDATE users SET github_id = $1, github_username = $2, github_access_token = $3 WHERE id = $4', [github_id, github_username, accessToken, user.id]);
        } else {
          const result = await pool.query(
            `INSERT INTO users (name, email, github_id, github_username, github_access_token, password_hash) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [name || github_username, email, github_id, github_username, accessToken, '']
          );
          user = result.rows[0];
        }
      }

      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) {
        throw new Error('JWT_SECRET is not defined');
      }

      const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, jwtSecret, { expiresIn: '7d' });

      res.redirect(`${process.env.FRONTEND_URL}/dashboard?token=${token}`);

    } catch (error) {
      console.error('GitHub auth error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }
}