import { config } from 'dotenv';
config();

export const PORT = process.env.PORT || 3000;
export const NODE_ENV = process.env.NODE_ENV || 'development';
export const IS_PRODUCTION = NODE_ENV === 'production';

// Auth: Google id_token verification + backend-issued JWT.
// GOOGLE_CLIENT_ID is the OAuth client the frontend signs in with; it is the
// expected `aud` claim when verifying Google id_tokens.
export const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
// Secret used to sign/verify the backend's own session JWT (HS256).
export const JWT_SECRET = process.env.JWT_SECRET;
// Lifetime of the backend JWT (any `jsonwebtoken` expiresIn value, e.g. '7d').
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export const DB_TYPE = process.env.DB_TYPE || 'postgres';
export const DB_HOST = process.env.DB_HOST;
export const DB_PORT = Number(process.env.DB_PORT) || 5432;
export const DB_USERNAME = process.env.DB_USERNAME;
export const DB_PASSWORD = process.env.DB_PASSWORD;
export const DB_NAME = process.env.DB_NAME;

export const THROTTLE_TTL = Number(process.env.THROTTLE_TTL) || 60000;
export const THROTTLE_LIMIT = Number(process.env.THROTTLE_LIMIT) || 10;

// Storage configuration
export const STORAGE_TYPE = process.env.STORAGE_TYPE || 'SUPABASE';
export const STORAGE_PATH = process.env.STORAGE_PATH || '~/.storage';
export const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

// Supabase configuration
export const SUPABASE_URL = process.env.SUPABASE_URL;
export const SUPABASE_KEY = process.env.SUPABASE_KEY;
export const SUPABASE_STORAGE_BUCKET =
  process.env.SUPABASE_STORAGE_BUCKET || 'images';

// CORS allowlist — comma-separated origins. Defaults to local dev.
const DEFAULT_CORS_ORIGINS = ['http://localhost:3000', 'http://localhost:5173'];
export const CORS_ORIGINS: string[] = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  : DEFAULT_CORS_ORIGINS;
