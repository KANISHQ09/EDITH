import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ParticipantRole, PARTICIPANT_ROLE } from '@vaic/shared';
import { logger } from '../lib/logger';

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    orgId: string;
    email: string;
    role: ParticipantRole;
  };
  correlationId?: string;
}

/**
 * JWT Authentication Middleware.
 * Validates Bearer token and attaches decoded user to request.
 */
export function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    if (process.env.NODE_ENV !== 'production') {
      req.user = {
        userId: '00000000-0000-0000-0000-000000000002',
        orgId: '00000000-0000-0000-0000-000000000001',
        email: 'alex@localdev.vaic',
        role: PARTICIPANT_ROLE.INCIDENT_COMMANDER,
      };
      next();
      return;
    }
    res.status(401).json({ error: 'UNAUTHORIZED', message: 'Bearer token required' });
    return;
  }

  const token = authHeader.slice(7);

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      sub: string;
      orgId: string;
      email: string;
      role: ParticipantRole;
    };

    req.user = {
      userId: decoded.sub,
      orgId: decoded.orgId,
      email: decoded.email,
      role: decoded.role,
    };

    next();
  } catch (err) {
    logger.warn({ message: 'JWT validation failed', error: (err as Error).message, service: 'api' });
    res.status(401).json({ error: 'UNAUTHORIZED', message: 'Invalid or expired token' });
  }
}

/**
 * RBAC Middleware factory.
 * Restricts access to users with the specified roles.
 */
export function requireRole(...allowedRoles: ParticipantRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'UNAUTHORIZED', message: 'Authentication required' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: 'FORBIDDEN',
        message: `Role '${req.user.role}' is not permitted. Required: ${allowedRoles.join(', ')}`,
      });
      return;
    }

    next();
  };
}

// Convenience role guards
export const requireIC = requireRole(PARTICIPANT_ROLE.INCIDENT_COMMANDER);
export const requireResponder = requireRole(
  PARTICIPANT_ROLE.INCIDENT_COMMANDER,
  PARTICIPANT_ROLE.RESPONDER
);
export const requireAnyAuthenticated = requireRole(
  PARTICIPANT_ROLE.INCIDENT_COMMANDER,
  PARTICIPANT_ROLE.RESPONDER,
  PARTICIPANT_ROLE.OBSERVER,
  PARTICIPANT_ROLE.BUSINESS_STAKEHOLDER,
  PARTICIPANT_ROLE.PLATFORM_ADMIN
);
