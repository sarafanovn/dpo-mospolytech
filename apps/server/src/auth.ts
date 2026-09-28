import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import type { Role } from "@meridian/shared";

const JWT_SECRET = process.env.JWT_SECRET ?? "meridian-dev-secret-change-me";
const COOKIE_NAME = "meridian_session";

export interface SessionPayload {
  userId: number;
  role: Role;
}

export function signSession(payload: SessionPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function setSessionCookie(res: Response, token: string) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

export function clearSessionCookie(res: Response) {
  res.clearCookie(COOKIE_NAME);
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      session?: SessionPayload;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) {
    res.status(401).json({ error: "Не авторизован" });
    return;
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET) as SessionPayload;
    req.session = payload;
    next();
  } catch {
    res.status(401).json({ error: "Сессия недействительна" });
  }
}

export function requireRole(role: Role) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.session?.role !== role) {
      res.status(403).json({ error: "Недостаточно прав" });
      return;
    }
    next();
  };
}
