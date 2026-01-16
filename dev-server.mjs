#!/usr/bin/env node
import { spawn } from 'child_process';
import express from 'express';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';
import { register } from 'tsx/esm/api';

// Load environment variables
dotenv.config();

// Register TypeScript loader
register();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(express.json({ limit: '50mb' }));

// Generic API handler that loads handlers dynamically
const createApiHandler = (handlerPath) => async (req, res) => {
  try {
    const module = await import(handlerPath);
    const handler = module.default;
    await handler(req, res);
  } catch (error) {
    console.error(`❌ API Error in ${handlerPath}:`, error.message);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message });
    }
  }
};

// Mount all API endpoints
app.post('/api/extract-fields', createApiHandler('./api/extract-fields.ts'));
app.all('/api/forms', createApiHandler('./api/forms.ts'));
app.all('/api/forms-publish', createApiHandler('./api/forms-publish.ts'));
app.all('/api/form-versions', createApiHandler('./api/form-versions.ts'));
app.get('/api/public-form', createApiHandler('./api/public-form.ts'));
app.all('/api/responses', createApiHandler('./api/responses.ts'));
app.all('/api/generate-html', createApiHandler('./api/generate-html.ts'));
app.all('/api/billing', createApiHandler('./api/billing.ts'));
app.all('/api/plans', createApiHandler('./api/plans.ts'));
app.all('/api/webhooks/clerk', createApiHandler('./api/webhooks/clerk.ts'));
app.all('/api/webhooks/grow', createApiHandler('./api/webhooks/grow.ts'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    clerk: process.env.VITE_CLERK_PUBLISHABLE_KEY ? 'configured' : 'missing',
    gemini: process.env.GEMINI_API_KEY ? 'configured' : 'missing',
    database: process.env.DATABASE_URL ? 'configured' : 'missing',
    timestamp: new Date().toISOString()
  });
});

// Start API server
const API_PORT = 3002;
app.listen(API_PORT, () => {
  console.log(`\n🚀 API Server running on http://localhost:${API_PORT}`);
  console.log(`📡 Endpoints:`);
  console.log(`   - POST   http://localhost:${API_PORT}/api/extract-fields`);
  console.log(`   - ALL    http://localhost:${API_PORT}/api/forms`);
  console.log(`   - ALL    http://localhost:${API_PORT}/api/responses`);
  console.log(`   - ALL    http://localhost:${API_PORT}/api/billing`);
  console.log(`   - GET    http://localhost:${API_PORT}/api/health\n`);
});

// Start Vite dev server
console.log('🔧 Starting Vite dev server...\n');
const vite = spawn('npx', ['vite'], {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, VITE_API_URL: `http://localhost:${API_PORT}` }
});

vite.on('error', (err) => {
  console.error('Failed to start Vite:', err);
  process.exit(1);
});

process.on('SIGINT', () => {
  console.log('\n\n👋 Shutting down servers...');
  vite.kill();
  process.exit(0);
});
