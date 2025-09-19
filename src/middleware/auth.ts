import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/jwt";

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const header = (req.headers.authorization || "").toString();
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    res.status(401).json({ detail: "Could not validate credentials" });
    return;
  }

  try {
    const payload = verifyToken(token);
    (req as any).user = { user_id: payload.user_id };
    next();
  } catch {
    res.status(401).json({ detail: "Could not validate credentials" });
  }
}
