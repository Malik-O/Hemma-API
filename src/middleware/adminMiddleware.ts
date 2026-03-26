import { Request, Response, NextFunction } from 'express';

/**
 * Admin guard middleware.
 * Must be used AFTER the `protect` middleware so `req.user` is populated.
 *
 * Checks whether the authenticated user's email is listed in the
 * ADMIN_EMAILS environment variable (comma-separated).
 */
export const adminOnly = (req: Request, res: Response, next: NextFunction): void => {
  const adminEmails = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  if (!req.user || !adminEmails.includes(req.user.email.toLowerCase())) {
    res.status(403).json({ message: 'Admin access required' });
    return;
  }

  next();
};
