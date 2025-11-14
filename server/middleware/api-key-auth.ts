
import { Request, Response, NextFunction } from 'express';
import { db } from '../db';
import { eq, and } from 'drizzle-orm';
import { users } from '../../shared/schema';

interface ApiKeyRequest extends Request {
  user?: {
    id: number;
    email: string;
    apiKey: string;
    userData?: any;
  };
}

export const authenticateApiKey = async (req: ApiKeyRequest, res: Response, next: NextFunction) => {
  try {
    const apiKey = req.headers['x-api-key'] as string;

    if (!apiKey) {
      return res.status(401).json({
        success: false,
        message: 'API key is required',
        code: 'API_KEY_REQUIRED'
      });
    }

    // Find user by API key
    const user = await db.query.users.findFirst({
      where: and(
        eq(users.apiKey, apiKey),
        eq(users.isApproved, true)
      )
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid API key',
        code: 'INVALID_API_KEY'
      });
    }

    // Check if user is approved
    if (!user.isApproved) {
      return res.status(403).json({
        success: false,
        message: 'User not approved for API access',
        code: 'USER_NOT_APPROVED'
      });
    }

    // Set user data for request
    req.user = {
      id: user.id,
      email: user.email,
      apiKey: user.apiKey,
      userData: user
    };

    console.log(`✅ API Key auth success: ${user.email}`);
    next();
  } catch (error) {
    console.error('API Key authentication error:', error);
    res.status(401).json({
      success: false,
      message: 'Invalid API key',
      code: 'AUTH_FAILED'
    });
  }
};
