import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/jwt";
import { JWTPayload } from "../models/types";

export function vendorAuthMiddleware(req: Request, res: Response, next: NextFunction): void {
  const header = (req.headers.authorization || "").toString();
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    res.status(401).json({ detail: "Authentication credentials were not provided" });
    return;
  }

  try {
    const payload = verifyToken(token) as JWTPayload;

    // Check if the token is for a vendor
    if (payload.role !== 'vendor' || !payload.vendor_id) {
        res.status(403).json({ detail: "Access forbidden: Vendor privileges required" });
        return;
    }

    // Attach vendor information to the request object
    (req as any).vendor = { vendor_id: payload.vendor_id };
    next();

  } catch (err) {
    res.status(401).json({ detail: "Invalid or expired token" });
  }
}