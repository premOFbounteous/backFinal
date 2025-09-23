import * as dotenv from "dotenv";
dotenv.config();

export const PORT: number = Number(process.env.PORT) || 8000;
export const MONGO_URI = process.env.MONGO_URI || "";
export const DB_NAME = process.env.DB_NAME ;

// JWT Config
export const SECRET_KEY= process.env.JWT_SECRET||"some randon value";
export const ALGORITHM = "HS256";
export const ACCESS_TOKEN_EXPIRE_MINUTES = 15;
export const REFRESH_TOKEN_EXPIRE_DAYS = 60 * 24 * 5; // preserved original
