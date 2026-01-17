#!/usr/bin/env node
/**
 * Production Server for RightFlow
 * Serves both static frontend (React) and backend API (Express)
 *
 * Architecture:
 * - Static files served from dist/ (built by Vite)
 * - API handlers loaded from dist-api/ (compiled TypeScript)
 * - Single unified server (no separate frontend/backend)
 */

import express from 'express';
import compression from 'compression';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';
import { createServer } from 'http';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================================================
// MIDDLEWARE
// ============================================================================

// Enable gzip compression
app.use(compression());

// Parse JSON bodies (limit: 50MB for PDF uploads)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request logging in production
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      console.log(
        `${new Date().toISOString()} ${req.method} ${req.path} ${res.statusCode} ${duration}ms`
      );
    });
    next();
  });
}

// ============================================================================
// API ROUTES
// ============================================================================

/**
 * Dynamic API handler that loads compiled JavaScript modules
 * In production, API handlers are pre-compiled from TypeScript to JavaScript
 * Structure: dist-api/api/*.js (compiled from api/*.ts)
 */
const createApiHandler = (handlerPath) => async (req, res) => {
  try {
    // Load the compiled JavaScript module from dist-api/api/
    // handlerPath is like 'extract-fields.ts' or 'webhooks/clerk.ts'
    const jsPath = handlerPath.replace('.ts', '.js');
    const modulePath = join(__dirname, 'dist-api/api', jsPath);
    const module = await import(modulePath);
    const handler = module.default;

    if (!handler) {
      throw new Error(`No default export found in ${handlerPath}`);
    }

    await handler(req, res);
  } catch (error) {
    console.error(`❌ API Error in ${handlerPath}:`, error);

    if (!res.headersSent) {
      res.status(500).json({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred'
      });
    }
  }
};

// Mount all API endpoints
app.post('/api/extract-fields', createApiHandler('extract-fields.ts'));
app.all('/api/forms', createApiHandler('forms.ts'));
app.all('/api/forms-publish', createApiHandler('forms-publish.ts'));
app.all('/api/form-versions', createApiHandler('form-versions.ts'));
app.all('/api/responses', createApiHandler('responses.ts'));
app.all('/api/generate-html', createApiHandler('generate-html.ts'));
app.all('/api/billing', createApiHandler('billing.ts'));
app.all('/api/plans', createApiHandler('plans.ts'));
app.all('/api/webhooks/clerk', createApiHandler('webhooks/clerk.ts'));
app.all('/api/webhooks/grow', createApiHandler('webhooks/grow.ts'));

// Health check endpoint (used by Railway)
app.get('/api/health', async (req, res) => {
  try {
    // Test database connection
    const { getDb } = await import('./src/lib/db.ts');
    const db = getDb();
    await db.raw('SELECT 1');

    res.json({
      status: 'ok',
      environment: process.env.NODE_ENV || 'development',
      database: 'connected',
      clerk: process.env.VITE_CLERK_PUBLISHABLE_KEY ? 'configured' : 'missing',
      gemini: process.env.GEMINI_API_KEY ? 'configured' : 'missing',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '2.3.2'
    });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(503).json({
      status: 'error',
      environment: process.env.NODE_ENV || 'development',
      database: 'disconnected',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ============================================================================
// STATIC FILE SERVING (Frontend)
// ============================================================================

// Serve static files from dist/ with caching headers (from vercel.json)
const distPath = join(__dirname, 'dist');

// Fonts - aggressive caching (1 year)
app.use('/fonts', express.static(join(distPath, 'fonts'), {
  maxAge: '1y',
  immutable: true,
  setHeaders: (res) => {
    res.set('Cache-Control', 'public, max-age=31536000, immutable');
  }
}));

// Assets (CSS, JS) - aggressive caching (1 year)
app.use('/assets', express.static(join(distPath, 'assets'), {
  maxAge: '1y',
  immutable: true,
  setHeaders: (res) => {
    res.set('Cache-Control', 'public, max-age=31536000, immutable');
  }
}));

// PDFs - no caching (always fresh)
app.get(/.*\.pdf$/, (req, res) => {
  res.set('Content-Type', 'application/pdf');
  res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.sendFile(join(distPath, req.path));
});

// All other static files
app.use(express.static(distPath, {
  maxAge: '1h',
  setHeaders: (res, path) => {
    // HTML files should not be cached
    if (path.endsWith('.html')) {
      res.set('Cache-Control', 'no-cache');
    }
  }
}));

// ============================================================================
// SPA FALLBACK (React Router)
// ============================================================================

/**
 * Fallback to index.html for all non-API routes
 * This enables React Router to handle client-side routing
 * Using middleware instead of route to avoid Express 5 path-to-regexp issues
 */
app.use((req, res) => {
  // Don't fallback for API routes
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }

  // Serve index.html for all other routes (SPA fallback)
  res.sendFile(join(distPath, 'index.html'));
});

// ============================================================================
// ERROR HANDLING
// ============================================================================

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `API endpoint ${req.method} ${req.path} not found`
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);

  res.status(err.status || 500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'An error occurred'
  });
});

// ============================================================================
// START SERVER
// ============================================================================

const server = createServer(app);

server.listen(PORT, () => {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 RightFlow Production Server');
  console.log('='.repeat(60));
  console.log(`Environment:  ${process.env.NODE_ENV || 'development'}`);
  console.log(`Server URL:   http://localhost:${PORT}`);
  console.log(`Health Check: http://localhost:${PORT}/api/health`);
  console.log('='.repeat(60));
  console.log('\n📡 API Endpoints:');
  console.log(`   POST   /api/extract-fields`);
  console.log(`   ALL    /api/forms`);
  console.log(`   ALL    /api/forms-publish`);
  console.log(`   ALL    /api/responses`);
  console.log(`   ALL    /api/generate-html`);
  console.log(`   ALL    /api/billing`);
  console.log(`   GET    /api/plans`);
  console.log(`   POST   /api/webhooks/clerk`);
  console.log(`   POST   /api/webhooks/grow`);
  console.log(`   GET    /api/health`);
  console.log('\n📁 Static Files:');
  console.log(`   Serving from: ${distPath}`);
  console.log(`   SPA fallback: Enabled (React Router)`);
  console.log('\n✅ Server ready!\n');
});

// ============================================================================
// GRACEFUL SHUTDOWN
// ============================================================================

const shutdown = async () => {
  console.log('\n\n👋 Shutting down gracefully...');

  server.close(async () => {
    console.log('✅ Server closed');

    // Close database connections
    try {
      const { closeDb } = await import('./src/lib/db.ts');
      await closeDb();
      console.log('✅ Database connections closed');
    } catch (error) {
      console.error('❌ Error closing database:', error.message);
    }

    process.exit(0);
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    console.error('❌ Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});
