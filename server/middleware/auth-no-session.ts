
import admin from '../services/firebase-admin';
import { db } from '../db';
import { users } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import { Request, Response, NextFunction } from 'express';
import { findUserByFirebaseUid } from '../services/user.service';

export async function authNoSession(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token provided' });
  }

  const token = authHeader.substring(7);

  try {
    // Verify the Firebase token
    const decodedToken = await admin.auth().verifyIdToken(token);
    const uid = decodedToken.uid;

    // ✅ USAR FUNÇÃO CENTRALIZADA - Get or create user in our database
    let dbUser = await findUserByFirebaseUid(uid);

    if (!dbUser) {
      // Create new user if doesn't exist
      const [newUser] = await db.insert(users).values({
        uid,
        email: decodedToken.email || '',
        isApproved: false,
        role: 'user'
      }).returning();
      dbUser = newUser;
    }

    // Auto-approve for special roles
    if ((dbUser.role === 'admin' || dbUser.role === 'superadmin') && !dbUser.isApproved) {
      await db.update(users)
        .set({ isApproved: true })
        .where(eq(users.uid, uid));
      dbUser.isApproved = true;
    }

    req.user = dbUser;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({ message: 'Invalid token' });
  }
}
