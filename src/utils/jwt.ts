import jwt from "jsonwebtoken";
import { ALGORITHM, SECRET_KEY, ACCESS_TOKEN_EXPIRE_MINUTES, REFRESH_TOKEN_EXPIRE_DAYS } from "../config/env";
import { JWTPayload } from "../models/types";

export function createAccessToken(payload: JWTPayload): string {
  return jwt.sign(payload, SECRET_KEY, {
    algorithm: ALGORITHM ,
    expiresIn: `${ACCESS_TOKEN_EXPIRE_MINUTES}m`,
  });
}

export function createRefreshToken(payload: JWTPayload): string {
  return jwt.sign(payload, SECRET_KEY, {
    algorithm: ALGORITHM ,
    expiresIn: `${REFRESH_TOKEN_EXPIRE_DAYS}d`,
  });
}

export function verifyToken(token: string): JWTPayload {
  return jwt.verify(token, SECRET_KEY, { algorithms: [ALGORITHM as any] }) as JWTPayload;
}
