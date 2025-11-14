import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/express.types';
import { authService } from '../services/auth.service';
import { userService } from '../services/user.service';
import { logger } from '../utils/logger';

export class AuthController {
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ 
          error: 'Email e senha são obrigatórios' 
        });
      }

      const result = await authService.login(email, password, req);
      
      if (!result.success) {
        return res.status(401).json({ 
          error: result.message 
        });
      }

      logger.info(`User ${email} logged in successfully`);
      res.json(result.data);
    } catch (error) {
      logger.error('Login error:', error);
      next(error);
    }
  }

  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password, name, company, whatsapp } = req.body;
      
      if (!email || !password || !name || !company || !whatsapp) {
        return res.status(400).json({ 
          error: 'Email, senha, nome, empresa e WhatsApp são obrigatórios' 
        });
      }

      const result = await authService.register(email, password, name);
      
      if (!result.success) {
        return res.status(400).json({ 
          error: result.message 
        });
      }

      logger.info(`User ${email} registered successfully`);
      res.status(201).json(result.data);
    } catch (error) {
      logger.error('Registration error:', error);
      next(error);
    }
  }

  async getProfile(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const user = await userService.getProfile(req.user.uid);
      
      if (!user) {
        return res.status(404).json({ 
          error: 'Usuário não encontrado' 
        });
      }

      res.json(user);
    } catch (error) {
      logger.error('Get profile error:', error);
      next(error);
    }
  }

  async updateProfile(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { name, email, company } = req.body;
      
      const updatedUser = await userService.updateProfile(req.user.uid, {
        name,
        email,
        company
      });

      logger.info(`Profile updated for user ${req.user.uid}`);
      res.json(updatedUser);
    } catch (error) {
      logger.error('Update profile error:', error);
      next(error);
    }
  }

  async logout(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      await authService.logout(req.user.uid);
      
      logger.info(`User ${req.user.uid} logged out`);
      res.json({ message: 'Logout realizado com sucesso' });
    } catch (error) {
      logger.error('Logout error:', error);
      next(error);
    }
  }
}

export const authController = new AuthController();