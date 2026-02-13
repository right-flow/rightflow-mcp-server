#!/usr/bin/env node
/**
 * Clean Dev Server Starter
 * 1. Kills any processes on ports 3000 and 3002
 * 2. Starts backend (port 3002)
 * 3. Starts frontend with Vite (port 3000)
 */

import { spawn } from 'child_process';
import { killPorts } from './kill-ports.js';

const isWindows = process.platform === 'win32';

async function startDev() {
  console.log('🧹 RightFlow Clean Dev Starter\n');

  // Step 1: Kill existing processes on 3000, 3002 only
  // Note: Do NOT kill 3003 - the backend may already be running separately
  const killPortsCustom = async () => {
    const ports = [3000, 3002];
    console.log('🔍 Checking for processes on ports:', ports.join(', '));
    let killedCount = 0;

    for (const port of ports) {
      try {
        if (isWindows) {
          const { stdout } = await import('child_process').then(m =>
            new Promise((resolve, reject) => {
              m.exec(`netstat -ano | findstr ":${port}"`, (err, stdout) => {
                if (err && !stdout) resolve({ stdout: '' });
                else resolve({ stdout });
              });
            })
          );
          const lines = stdout.split('\n').filter(line => line.includes('LISTENING'));
          for (const line of lines) {
            const parts = line.trim().split(/\s+/);
            const pid = parts[parts.length - 1];
            if (pid && !isNaN(pid)) {
              try {
                await import('child_process').then(m =>
                  new Promise(resolve => m.exec(`taskkill /F /PID ${pid}`, () => resolve()))
                );
                console.log(`   ✓ Killed process ${pid} on port ${port}`);
                killedCount++;
              } catch {}
            }
          }
        }
      } catch {}
    }

    if (killedCount > 0) {
      console.log(`\n✅ Killed ${killedCount} process(es)\n`);
      await new Promise(resolve => setTimeout(resolve, 1500));
    } else {
      console.log('\n✅ All ports are free\n');
    }
  };

  await killPortsCustom();

  console.log('🚀 Starting development servers...\n');

  // Step 2: Check if WhatsApp Backend is already running on port 3003
  const isPort3003InUse = await (async () => {
    try {
      if (isWindows) {
        const { stdout } = await import('child_process').then(m =>
          new Promise((resolve, reject) => {
            m.exec(`netstat -ano | findstr ":3003"`, (err, stdout) => {
              if (err && !stdout) resolve({ stdout: '' });
              else resolve({ stdout });
            });
          })
        );
        return stdout.includes('LISTENING');
      }
      return false;
    } catch {
      return false;
    }
  })();

  let whatsappBackend = null;

  if (isPort3003InUse) {
    console.log('📱 WhatsApp Backend already running on port 3003 (skipping start)\n');
  } else {
    console.log('📱 Starting WhatsApp Backend (port 3003)...');
    whatsappBackend = spawn(
      isWindows ? 'npm.cmd' : 'npm',
      ['run', 'dev'],
      {
        cwd: 'packages/app/backend',
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: true,
      }
    );

    whatsappBackend.stdout.on('data', (data) => {
      const output = data.toString();
      if (output.includes('Server running') || output.includes('Connected')) {
        process.stdout.write(`[WhatsApp] ${output}`);
      }
    });

    whatsappBackend.stderr.on('data', (data) => {
      const output = data.toString();
      if (!output.includes('nodemon')) { // Skip nodemon noise
        process.stderr.write(`[WhatsApp] ${data}`);
      }
    });

    // Wait for WhatsApp backend to start
    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  // Step 3: Start dev-server.mjs (API + Vite on ports 3002 + 3000)
  console.log('📦 Starting Dev Server (API + Frontend on 3002 + 3000)...\n');
  const devServer = spawn(
    isWindows ? 'node.exe' : 'node',
    ['dev-server.mjs'],
    {
      stdio: ['ignore', 'inherit', 'inherit'],
      shell: true,
    }
  );

  const backend = devServer; // For cleanup
  const frontend = null; // dev-server.mjs handles both

  // Handle graceful shutdown
  const cleanup = () => {
    console.log('\n\n👋 Shutting down servers...');
    if (whatsappBackend) whatsappBackend.kill('SIGTERM');
    backend.kill('SIGTERM');
    if (frontend) frontend.kill('SIGTERM');
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  // Handle process errors
  backend.on('error', (err) => {
    console.error('❌ Dev server error:', err);
    cleanup();
  });

  // Handle process exits
  backend.on('exit', (code) => {
    if (code !== 0 && code !== null) {
      console.error(`❌ Dev server exited with code ${code}`);
      cleanup();
    }
  });

  console.log('\n✅ Development servers running:');
  console.log('   Frontend:     http://localhost:3000');
  console.log('   API (old):    http://localhost:3002 (/api/forms, /api/billing, etc.)');
  console.log('   API (new):    http://localhost:3003 (/api/v1/whatsapp, /api/v1/webhooks)');
  console.log('\nPress Ctrl+C to stop\n');
}

startDev().catch(error => {
  console.error('❌ Failed to start:', error.message);
  process.exit(1);
});
