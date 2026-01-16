/**
 * Production Server Tests
 * Tests for server.mjs production setup
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { exec } from 'child_process';
import { promisify } from 'util';
import { existsSync } from 'fs';
import { join } from 'path';

const execAsync = promisify(exec);

describe('Production Build', () => {
  describe('API Compilation', () => {
    it('should compile API handlers to JavaScript', async () => {
      const { stdout, stderr } = await execAsync('npm run build:api');

      expect(stderr).not.toContain('error TS');
      expect(existsSync('dist-api')).toBe(true);
    });

    it('should output compiled files to dist-api/api/', () => {
      const expectedFiles = [
        'dist-api/api/billing.js',
        'dist-api/api/extract-fields.js',
        'dist-api/api/forms.js',
        'dist-api/api/forms-publish.js',
        'dist-api/api/generate-html.js',
        'dist-api/api/plans.js',
        'dist-api/api/responses.js',
        'dist-api/api/webhooks/clerk.js',
        'dist-api/api/webhooks/grow.js',
      ];

      expectedFiles.forEach(file => {
        expect(existsSync(file)).toBe(true);
      });
    });

    it('should compile service dependencies', () => {
      const expectedServices = [
        'dist-api/src/lib/db.js',
        'dist-api/src/services/auth/clerk.service.js',
        'dist-api/src/services/billing/grow.service.js',
        'dist-api/src/services/forms/forms.service.js',
        'dist-api/src/services/responses/responses.service.js',
      ];

      expectedServices.forEach(file => {
        expect(existsSync(file)).toBe(true);
      });
    });

    it('should generate source maps', () => {
      expect(existsSync('dist-api/api/forms.js.map')).toBe(true);
    });
  });

  describe('Frontend Build', () => {
    it('should build React app for production', async () => {
      const { stdout, stderr } = await execAsync('npm run build');

      expect(stderr).not.toContain('error');
      expect(existsSync('dist')).toBe(true);
    });

    it('should generate index.html', () => {
      expect(existsSync('dist/index.html')).toBe(true);
    });

    it('should bundle assets', () => {
      expect(existsSync('dist/assets')).toBe(true);
    });

    it('should include fonts', () => {
      // Fonts directory should exist if Hebrew fonts are included
      const fontsExist = existsSync('dist/fonts');
      expect(fontsExist).toBe(true);
    });
  });

  describe('Railway Configuration', () => {
    it('should have railway.json with correct structure', () => {
      const railwayConfig = JSON.parse(
        require('fs').readFileSync('railway.json', 'utf8')
      );

      expect(railwayConfig.build).toBeDefined();
      expect(railwayConfig.build.buildCommand).toBe('npm run build:railway');
      expect(railwayConfig.deploy).toBeDefined();
      expect(railwayConfig.deploy.startCommand).toBe('npm run start:railway');
      expect(railwayConfig.deploy.healthcheckPath).toBe('/api/health');
    });

    it('should have required npm scripts', () => {
      const packageJson = JSON.parse(
        require('fs').readFileSync('package.json', 'utf8')
      );

      expect(packageJson.scripts['build:api']).toBeDefined();
      expect(packageJson.scripts['build:railway']).toBeDefined();
      expect(packageJson.scripts['start']).toBeDefined();
      expect(packageJson.scripts['start:railway']).toBeDefined();
    });

    it('should have production dependencies', () => {
      const packageJson = JSON.parse(
        require('fs').readFileSync('package.json', 'utf8')
      );

      expect(packageJson.dependencies['compression']).toBeDefined();
      expect(packageJson.dependencies['express']).toBeDefined();
      expect(packageJson.dependencies['dotenv']).toBeDefined();
    });
  });

  describe('TypeScript Configuration', () => {
    it('should have tsconfig.api.json for API compilation', () => {
      expect(existsSync('tsconfig.api.json')).toBe(true);

      const config = JSON.parse(
        require('fs').readFileSync('tsconfig.api.json', 'utf8')
      );

      expect(config.compilerOptions.outDir).toBe('./dist-api');
      expect(config.compilerOptions.noEmit).toBe(false);
      expect(config.include).toContain('api/**/*');
      expect(config.include).toContain('src/lib/**/*');
      expect(config.include).toContain('src/services/**/*');
    });
  });

  describe('Production Server File', () => {
    it('should have server.mjs', () => {
      expect(existsSync('server.mjs')).toBe(true);
    });

    it('should import required modules', () => {
      const serverContent = require('fs').readFileSync('server.mjs', 'utf8');

      expect(serverContent).toContain("import express from 'express'");
      expect(serverContent).toContain("import compression from 'compression'");
      expect(serverContent).toContain("import dotenv from 'dotenv'");
    });

    it('should define API handler creation', () => {
      const serverContent = require('fs').readFileSync('server.mjs', 'utf8');

      expect(serverContent).toContain('createApiHandler');
      expect(serverContent).toContain('dist-api/api');
    });

    it('should mount all API endpoints', () => {
      const serverContent = require('fs').readFileSync('server.mjs', 'utf8');

      const endpoints = [
        '/api/extract-fields',
        '/api/forms',
        '/api/forms-publish',
        '/api/responses',
        '/api/generate-html',
        '/api/billing',
        '/api/plans',
        '/api/webhooks/clerk',
        '/api/webhooks/grow',
        '/api/health',
      ];

      endpoints.forEach(endpoint => {
        expect(serverContent).toContain(endpoint);
      });
    });

    it('should have health check endpoint', () => {
      const serverContent = require('fs').readFileSync('server.mjs', 'utf8');

      expect(serverContent).toContain("app.get('/api/health'");
      expect(serverContent).toContain('status');
      expect(serverContent).toContain('database');
    });

    it('should serve static files from dist/', () => {
      const serverContent = require('fs').readFileSync('server.mjs', 'utf8');

      expect(serverContent).toContain("express.static(distPath");
    });

    it('should have SPA fallback', () => {
      const serverContent = require('fs').readFileSync('server.mjs', 'utf8');

      expect(serverContent).toContain("app.get('*'");
      expect(serverContent).toContain('index.html');
    });

    it('should have caching headers configuration', () => {
      const serverContent = require('fs').readFileSync('server.mjs', 'utf8');

      expect(serverContent).toContain('/fonts');
      expect(serverContent).toContain('/assets');
      expect(serverContent).toContain('Cache-Control');
      expect(serverContent).toContain('immutable');
    });

    it('should have graceful shutdown handlers', () => {
      const serverContent = require('fs').readFileSync('server.mjs', 'utf8');

      expect(serverContent).toContain('SIGTERM');
      expect(serverContent).toContain('SIGINT');
      expect(serverContent).toContain('shutdown');
    });
  });
});
