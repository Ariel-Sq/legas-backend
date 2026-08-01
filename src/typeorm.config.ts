import { DataSource } from 'typeorm';
import {
  DB_HOST,
  DB_NAME,
  DB_PASSWORD,
  DB_PORT,
  DB_TYPE,
  DB_USERNAME,
} from '@app/utils/environments';

export default new DataSource({
  type: DB_TYPE as any,
  host: DB_HOST,
  port: DB_PORT,
  username: DB_USERNAME,
  password: DB_PASSWORD,
  database: DB_NAME,
  // Managed Postgres providers (Neon, Supabase pooler) require TLS.
  ...(process.env.DB_SSL === 'true'
    ? { ssl: { rejectUnauthorized: false } }
    : {}),
  synchronize: false,
  entities: ['src/**/*.entity.ts'],
  migrations: ['src/database/migrations/*.ts'],
});
