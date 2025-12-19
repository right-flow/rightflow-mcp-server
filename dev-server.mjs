#!/usr/bin/env node
import { spawn } from 'child_process';
import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
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

// Import and mount API endpoint
const apiHandler = async (req, res) => {
  console.log('📨 Received API request to /api/extract-fields');
  console.log('📦 Request body size:', JSON.stringify(req.body).length, 'bytes');

  try {
    console.log('🔄 Importing TypeScript handler...');
    const module = await import('./api/extract-fields.ts');
    const handler = module.default;

    console.log('✅ Handler imported successfully');
    console.log('🚀 Calling handler...');

    await handler(req, res);

    console.log('✅ Handler completed');
  } catch (error) {
    console.error('❌ API Error:', error.message);
    console.error('📚 Stack:', error.stack);

    if (!res.headersSent) {
      res.status(500).json({ error: error.message });
    }
  }
};

app.post('/api/extract-fields', apiHandler);

// Test endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    apiKey: process.env.GEMINI_API_KEY ? 'present' : 'missing',
    timestamp: new Date().toISOString()
  });
});

// Start API server
const API_PORT = 3001;
app.listen(API_PORT, () => {
  console.log(`\n🚀 API Server running on http://localhost:${API_PORT}`);
  console.log(`📡 API endpoint: http://localhost:${API_PORT}/api/extract-fields\n`);
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
