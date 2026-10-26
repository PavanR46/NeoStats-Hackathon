import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { prisma } from '../db/prisma';
import { AppError } from './error.middleware';
import { GlobalRole } from '@prisma/client';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  globalRole: GlobalRole;
  isActive: boolean;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.token;

    if (!token) {
      throw new AppError('Authentication required. Missing token cookie.', 401);
    }

    let payload: any;
    try {
      payload = jwt.verify(token, env.JWT_SECRET);
    } catch (jwtErr) {
      throw new AppError('Invalid or expired authentication token.', 401);
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        name: true,
        globalRole: true,
        isActive: true,
      },
    });

    if (!user) {
      throw new AppError('User account not found.', 401);
    }

    if (!user.isActive) {
      throw new AppError('Your account has been deactivated. Please contact an administrator.', 403);
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}
