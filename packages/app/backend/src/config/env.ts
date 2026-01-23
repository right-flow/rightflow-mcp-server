import { z } from 'zod';
import dotenv from 'dotenv';

// Load .env file
dotenv.config();

// Environment variable schema (with Zod validation)
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3000').transform(Number),

  // Database
  DATABASE_URL: z.string().url(),

  // Redis
  REDIS_URL: z.string().url(),

  // Authentication
  JWT_SECRET: z.string().min(32),
  CLERK_SECRET_KEY: z.string().startsWith('sk_'),
  CLERK_PUBLISHABLE_KEY: z.string().startsWith('pk_'),

  // Frontend
  FRONTEND_URL: z.string().url(),

  // Webhook
  WEBHOOK_TIMEOUT_MS: z.string().default('10000').transform(Number),
  WEBHOOK_MAX_RETRIES: z.string().default('5').transform(Number),

  // Storage
  STORAGE_PATH: z.string().default('/app/storage'),
  STORAGE_PROVIDER: z.enum(['railway', 's3']).default('railway'),

  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
});

// Validate environment variables
export const config = envSchema.parse(process.env);

// Export type for TypeScript
export type Config = z.infer<typeof envSchema>;
