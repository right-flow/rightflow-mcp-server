#!/usr/bin/env node
/**
 * Kill Ports Utility
 * Kills processes running on specified ports (3000, 3002)
 * Works on both Windows and Unix-like systems
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const PORTS = [3000, 3002];
const isWindows = process.platform === 'win32';

/**
 * Find PIDs using a port
 */
async function findPIDsOnPort(port) {
  try {
    if (isWindows) {
      // Windows: netstat -ano | findstr :<port>
      const { stdout } = await execAsync(`netstat -ano | findstr ":${port}"`);
      const lines = stdout.split('\n').filter(line => line.includes('LISTENING'));
      const pids = new Set();

      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (pid && !isNaN(pid)) {
          pids.add(pid);
        }
      }

      return Array.from(pids);
    } else {
      // Unix: lsof -ti :<port>
      const { stdout } = await execAsync(`lsof -ti :${port}`);
      return stdout.trim().split('\n').filter(pid => pid);
    }
  } catch (error) {
    // Port not in use or command failed
    return [];
  }
}

/**
 * Kill a process by PID
 */
async function killPID(pid) {
  try {
    if (isWindows) {
      await execAsync(`taskkill /F /PID ${pid}`);
    } else {
      await execAsync(`kill -9 ${pid}`);
    }
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Kill all processes on specified ports
 */
async function killPorts() {
  console.log('🔍 Checking for processes on ports:', PORTS.join(', '));

  let killedCount = 0;

  for (const port of PORTS) {
    const pids = await findPIDsOnPort(port);

    if (pids.length === 0) {
      console.log(`✓ Port ${port} is free`);
      continue;
    }

    console.log(`⚠️  Port ${port} is in use by ${pids.length} process(es)`);

    for (const pid of pids) {
      const killed = await killPID(pid);
      if (killed) {
        console.log(`   ✓ Killed process ${pid}`);
        killedCount++;
      } else {
        console.log(`   ✗ Failed to kill process ${pid}`);
      }
    }
  }

  if (killedCount > 0) {
    console.log(`\n✅ Killed ${killedCount} process(es)`);
    // Wait a bit for ports to be released
    await new Promise(resolve => setTimeout(resolve, 1000));
  } else {
    console.log('\n✅ All ports are free');
  }
}

// Run if called directly
const isMain = import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'));
if (isMain || process.argv[1].includes('kill-ports')) {
  killPorts()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('❌ Error:', error.message);
      process.exit(1);
    });
}

export { killPorts, findPIDsOnPort, killPID };
