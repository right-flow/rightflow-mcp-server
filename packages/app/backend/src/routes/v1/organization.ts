/**
 * Organization API Routes
 *
 * Endpoints for organization-level operations including MCP server installation
 */

import express, { Request, Response, NextFunction } from 'express';
import archiver from 'archiver';
import fs from 'fs';
import path from 'path';
import { authenticateJWT } from '../../middleware/auth';
import logger from '../../utils/logger';

const router = express.Router();

// Apply authentication to all organization routes
router.use(authenticateJWT);

/**
 * GET /api/v1/organization/mcp-download
 * Generate and download a personalized MCP server installer package
 *
 * Returns: ZIP file containing:
 * - setup-mcp.ps1 (pre-configured PowerShell installation script)
 * - dist/ (compiled MCP server)
 * - fonts/ (Hebrew fonts)
 * - templates/ (PDF templates)
 * - package.json, package-lock.json
 * - README.md
 */
router.get('/mcp-download', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user;

    if (!user || !user.organizationId) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Organization ID not found. Please ensure you are logged in.',
        },
      });
    }

    const { organizationId } = user;

    // Get or generate API key for this organization
    // For now, we'll use a placeholder - this should fetch from database
    const apiKey = process.env.DEFAULT_MCP_API_KEY || 'rfc_sk_placeholder';

    // Determine backend URL based on environment
    // Development: use localhost:3003
    // Production: use RAILWAY_PUBLIC_DOMAIN or BACKEND_URL or fallback
    let backendUrl: string;
    if (process.env.NODE_ENV === 'development') {
      backendUrl = 'http://localhost:3003';
    } else if (process.env.RAILWAY_PUBLIC_DOMAIN) {
      backendUrl = `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`;
    } else {
      backendUrl = process.env.BACKEND_URL || 'https://app.rightflow.co.il';
    }

    logger.info('Generating MCP installer package', {
      organizationId,
      backendUrl: backendUrl.replace(/https?:\/\//, ''), // Log without protocol for privacy
    });

    // Generate PowerShell setup script with user's credentials
    const setupScript = generateSetupScript({
      backendUrl,
      apiKey,
      organizationId,
    });

    // Generate README
    const readme = generateReadme({
      organizationId,
      backendUrl,
    });

    // Set response headers for file download
    const filename = `rightflow-mcp-installer-${organizationId.substring(0, 8)}.zip`;
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Create ZIP archive
    const archive = archiver('zip', {
      zlib: { level: 9 }, // Maximum compression
    });

    // Handle errors
    archive.on('error', (err) => {
      logger.error('Archive creation error', { error: err.message });
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: {
            code: 'ARCHIVE_ERROR',
            message: 'Failed to create installer package',
          },
        });
      }
    });

    // Log archive events for debugging
    archive.on('warning', (err) => {
      if (err.code === 'ENOENT') {
        logger.warn('Archive warning (file not found)', { error: err.message });
      } else {
        logger.error('Archive warning', { error: err.message });
      }
    });

    archive.on('entry', (entry) => {
      logger.info('Archive entry added', { name: entry.name });
    });

    // Pipe archive to response
    archive.pipe(res);

    // Add generated files
    archive.append(setupScript, { name: 'setup-mcp.ps1' });
    archive.append(readme, { name: 'README.md' });

    // Path to MCP server package
    // When running, __dirname is in dist/routes/v1/
    // dist/routes/v1 -> dist/routes -> dist -> backend -> app -> packages -> RightFlow
    // So we need to go up 6 levels to reach RightFlow root
    const projectRoot = path.join(__dirname, '../../../../../..');
    const mcpServerPath = path.join(projectRoot, 'packages', 'mcp-server');

    logger.info('MCP server path resolved', {
      mcpServerPath,
      exists: fs.existsSync(mcpServerPath),
    });

    // Add MCP server files to archive
    const filesToInclude = [
      { src: path.join(mcpServerPath, 'dist'), dest: 'dist' },
      { src: path.join(mcpServerPath, 'fonts'), dest: 'fonts' },
      { src: path.join(mcpServerPath, 'templates'), dest: 'templates' },
      { src: path.join(mcpServerPath, 'package.json'), dest: 'package.json' },
      { src: path.join(mcpServerPath, 'package-lock.json'), dest: 'package-lock.json' },
    ];

    logger.info('Starting to add MCP server files to archive', {
      totalFiles: filesToInclude.length,
    });

    for (const file of filesToInclude) {
      const exists = fs.existsSync(file.src);

      logger.info('Checking MCP server file', {
        src: file.src,
        dest: file.dest,
        exists,
      });

      if (exists) {
        const stats = fs.statSync(file.src);
        const isDirectory = stats.isDirectory();

        logger.info('Adding to archive', {
          src: file.src,
          dest: file.dest,
          type: isDirectory ? 'directory' : 'file',
          size: isDirectory ? 'N/A' : stats.size,
        });

        if (isDirectory) {
          archive.directory(file.src, file.dest);
        } else {
          archive.file(file.src, { name: file.dest });
        }
      } else {
        logger.warn('MCP server file not found', {
          src: file.src,
          dest: file.dest,
        });
      }
    }

    logger.info('Finished adding MCP server files to archive');

    // Finalize the archive
    await archive.finalize();

    const archiveStats = {
      totalBytes: archive.pointer(),
      organizationId,
      filename,
    };

    logger.info('MCP installer package generated successfully', archiveStats);

  } catch (error) {
    logger.error('Failed to generate MCP installer', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    next(error);
  }
});

/**
 * Generate PowerShell setup script with pre-configured credentials
 */
function generateSetupScript(config: {
  backendUrl: string;
  apiKey: string;
  organizationId: string;
}): string {
  const { backendUrl, apiKey, organizationId } = config;
  const apiUrl = `${backendUrl}/api/v1`;
  const timestamp = new Date().toISOString();

  return `<#
.SYNOPSIS
    Install RightFlow CoWork MCP Server (Pre-Configured)

.DESCRIPTION
    This script installs the MCP server with pre-configured settings
    for your organization. No manual configuration needed!

.NOTES
    Organization: ${organizationId}
    Backend: ${backendUrl}
    Generated: ${timestamp}
#>

# Pre-configured settings (DO NOT MODIFY)
$ApiUrl = "${apiUrl}"
$ApiKey = "${apiKey}"
$OrganizationId = "${organizationId}"

# Installation configuration
$InstallPath = "C:\\Program Files\\RightFlow-MCP"
$ClaudeConfigPath = "$env:APPDATA\\Claude\\claude_desktop_config.json"

Write-Host "=== RightFlow CoWork MCP Server Setup ===" -ForegroundColor Cyan
Write-Host "Organization: $OrganizationId" -ForegroundColor Gray
Write-Host ""

# Step 1: Check prerequisites
Write-Host "[1/8] Checking prerequisites..." -ForegroundColor Yellow

# Check Node.js
try {
    $nodeVersion = node --version
    Write-Host "  [OK] Node.js installed: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "  [X] Node.js not found. Please install Node.js 18+ first." -ForegroundColor Red
    Write-Host "    Download from: https://nodejs.org" -ForegroundColor Yellow
    exit 1
}

# Check Claude Desktop
if (Test-Path $ClaudeConfigPath) {
    Write-Host "  [OK] Claude Desktop found" -ForegroundColor Green
} else {
    Write-Host "  [!] Claude Desktop not found" -ForegroundColor Yellow
    Write-Host "    Install from: https://claude.ai/download" -ForegroundColor Yellow
    Write-Host "    Continuing anyway..." -ForegroundColor Yellow
}

# Step 2: Create installation directory
Write-Host "[2/8] Creating installation directory..." -ForegroundColor Yellow

if (Test-Path $InstallPath) {
    Write-Host "  ! Installation directory exists. Removing old version..." -ForegroundColor Yellow
    Remove-Item -Path $InstallPath -Recurse -Force -ErrorAction SilentlyContinue
}

New-Item -ItemType Directory -Path $InstallPath -Force | Out-Null
Write-Host "  [OK] Created: $InstallPath" -ForegroundColor Green

# Step 3: Copy files
Write-Host "[3/8] Copying MCP server files..." -ForegroundColor Yellow

$RequiredPaths = @("dist", "fonts", "templates", "package.json", "package-lock.json")
$CurrentDir = Get-Location

foreach ($path in $RequiredPaths) {
    $SourcePath = Join-Path $CurrentDir $path
    if (Test-Path $SourcePath) {
        Copy-Item -Path $SourcePath -Destination "$InstallPath\\" -Recurse -Force
        Write-Host "  [OK] Copied: $path" -ForegroundColor Green
    } else {
        Write-Host "  [!] Missing: $path (optional)" -ForegroundColor Yellow
    }
}

# Step 4: Install dependencies
Write-Host "[4/8] Installing Node.js dependencies..." -ForegroundColor Yellow
Write-Host "  This may take 1-2 minutes..." -ForegroundColor Gray

Push-Location $InstallPath
try {
    $npmOutput = npm ci --production --silent 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  [OK] Dependencies installed successfully" -ForegroundColor Green
    } else {
        Write-Host "  [!] npm ci failed, trying npm install..." -ForegroundColor Yellow
        npm install --production --silent
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  [OK] Dependencies installed successfully" -ForegroundColor Green
        } else {
            Write-Host "  [X] Failed to install dependencies" -ForegroundColor Red
            Pop-Location
            exit 1
        }
    }
} finally {
    Pop-Location
}

# Step 5: Test backend connectivity
Write-Host "[5/8] Testing backend connectivity..." -ForegroundColor Yellow

try {
    $headers = @{
        "Authorization" = "Bearer $ApiKey"
    }
    $response = Invoke-RestMethod -Uri "$ApiUrl/mcp/health" -Headers $headers -Method Get -TimeoutSec 10 -ErrorAction Stop
    Write-Host "  [OK] Backend reachable" -ForegroundColor Green
} catch {
    Write-Host "  [!] Cannot reach backend: $ApiUrl" -ForegroundColor Yellow
    Write-Host "    Error: $($_.Exception.Message)" -ForegroundColor Yellow
    Write-Host "    Installation will continue - please check connectivity later" -ForegroundColor Yellow
}

# Step 6: Configure Claude Desktop
Write-Host "[6/8] Configuring Claude Desktop..." -ForegroundColor Yellow

# Ensure Claude config directory exists
$claudeDir = Split-Path -Parent $ClaudeConfigPath
if (-not (Test-Path $claudeDir)) {
    New-Item -ItemType Directory -Path $claudeDir -Force | Out-Null
}

# Backup existing config
if (Test-Path $ClaudeConfigPath) {
    $BackupPath = "$ClaudeConfigPath.backup.$(Get-Date -Format 'yyyyMMdd-HHmmss')"
    Copy-Item $ClaudeConfigPath $BackupPath -Force
    Write-Host "  [OK] Backed up existing config" -ForegroundColor Green
}

# Read existing config
$config = @{}
if (Test-Path $ClaudeConfigPath) {
    try {
        $configJson = Get-Content $ClaudeConfigPath -Raw
        $config = $configJson | ConvertFrom-Json -AsHashtable
    } catch {
        Write-Host "  [!] Could not parse existing config, creating new one" -ForegroundColor Yellow
        $config = @{}
    }
}

# Ensure mcpServers exists
if (-not $config.ContainsKey('mcpServers')) {
    $config['mcpServers'] = @{}
}

# Add RightFlow MCP server configuration with CORRECT environment variables
$config['mcpServers']['rightflow-cowork'] = @{
    command = "node"
    args = @("$InstallPath\\dist\\index.js")
    env = @{
        NODE_ENV = "production"
        RIGHTFLOW_API_URL = $ApiUrl
        RIGHTFLOW_API_KEY = $ApiKey
    }
}

# Write config back
try {
    $config | ConvertTo-Json -Depth 10 | Set-Content $ClaudeConfigPath -Force
    Write-Host "  [OK] Claude Desktop configured" -ForegroundColor Green
} catch {
    Write-Host "  [X] Failed to write config: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Step 7: Create uninstall script
Write-Host "[7/8] Creating uninstall script..." -ForegroundColor Yellow

$uninstallScript = @"
# Uninstall RightFlow CoWork MCP Server
Write-Host "Removing RightFlow MCP Server..." -ForegroundColor Yellow

if (Test-Path "$InstallPath") {
    Remove-Item -Path "$InstallPath" -Recurse -Force
    Write-Host "[OK] MCP Server removed from $InstallPath" -ForegroundColor Green
} else {
    Write-Host "[!] MCP Server not found at $InstallPath" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Note: Claude Desktop configuration not modified." -ForegroundColor Yellow
Write-Host "To remove manually, edit: $ClaudeConfigPath" -ForegroundColor Yellow
Write-Host "And remove the 'rightflow-cowork' entry from mcpServers" -ForegroundColor Yellow
"@

$uninstallScript | Set-Content "$InstallPath\\uninstall.ps1" -Force
Write-Host "  [OK] Uninstall script created" -ForegroundColor Green

# Step 8: Test installation
Write-Host "[8/8] Testing installation..." -ForegroundColor Yellow

try {
    $process = Start-Process -FilePath "node" -ArgumentList "$InstallPath\\dist\\index.js" -PassThru -WindowStyle Hidden
    Start-Sleep -Seconds 2

    if (-not $process.HasExited) {
        Stop-Process -Id $process.Id -Force
        Write-Host "  [OK] MCP server starts successfully" -ForegroundColor Green
    } else {
        Write-Host "  [!] MCP server exited immediately - check logs" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  [!] Could not test MCP server: $($_.Exception.Message)" -ForegroundColor Yellow
}

# Final instructions
Write-Host ""
Write-Host "=== Setup Complete! ===" -ForegroundColor Green
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "1. Close Claude Desktop if it's running" -ForegroundColor White
Write-Host "2. Restart Claude Desktop" -ForegroundColor White
Write-Host "3. In Claude Desktop, ask: 'Show me available PDF templates'" -ForegroundColor White
Write-Host "4. You should see Hebrew PDF templates available" -ForegroundColor White
Write-Host ""
Write-Host "Installation Details:" -ForegroundColor Cyan
Write-Host "  Location: $InstallPath" -ForegroundColor Gray
Write-Host "  Organization: $OrganizationId" -ForegroundColor Gray
Write-Host "  Backend: $ApiUrl" -ForegroundColor Gray
Write-Host "  Config: $ClaudeConfigPath" -ForegroundColor Gray
Write-Host ""
Write-Host "To uninstall: powershell -File \\"$InstallPath\\uninstall.ps1\\"" -ForegroundColor Gray
Write-Host ""
Write-Host "Support: https://rightflow.co.il/support" -ForegroundColor Gray
`;
}

/**
 * Generate README file for the installer package
 */
function generateReadme(config: {
  organizationId: string;
  backendUrl: string;
}): string {
  const { organizationId, backendUrl } = config;

  return `# RightFlow CoWork MCP Server Installer

**Pre-configured for your organization**

Organization ID: \`${organizationId}\`
Backend: \`${backendUrl}\`

## Quick Start

1. **Extract this ZIP file** to any temporary location
2. **Run the installer** (right-click → Run with PowerShell):
   \`\`\`
   .\\setup-mcp.ps1
   \`\`\`
3. **Restart Claude Desktop**
4. **Test the integration** by asking Claude:
   > "Show me available PDF templates"

## What's Included

- ✅ **setup-mcp.ps1** - Automated installation script (pre-configured)
- ✅ **MCP Server** - Full Hebrew PDF generation server
- ✅ **Hebrew Fonts** - Noto Sans Hebrew (Regular + Bold)
- ✅ **PDF Templates** - 20+ ready-to-use templates
- ✅ **uninstall.ps1** - Easy removal (created during installation)

## System Requirements

- **Windows 10/11** (macOS/Linux support coming soon)
- **Node.js 18+** ([Download](https://nodejs.org))
- **Claude Desktop** ([Download](https://claude.ai/download))
- **200MB** free disk space

## Installation Location

The MCP server will be installed to:
\`C:\\Program Files\\RightFlow-MCP\`

Claude Desktop configuration:
\`%APPDATA%\\Claude\\claude_desktop_config.json\`

## Features

- 📄 **Hebrew PDF Generation** - Proper RTL text handling
- 🎨 **20+ Templates** - Employment, legal, accounting, HR, real estate
- 🔄 **CRM Integration** - Connect with your existing CRM
- 📊 **Form Filling** - Auto-fill PDF forms with data
- 🌐 **Multi-language** - Hebrew, English, mixed content

## Troubleshooting

### "Node.js not found"
Install Node.js 18+ from https://nodejs.org

### "Claude Desktop not found"
Install Claude Desktop from https://claude.ai/download

### "Cannot reach backend"
- Check internet connection
- Verify firewall settings allow outbound connections
- Contact support if issue persists

### "MCP server not appearing in Claude"
1. Completely quit Claude Desktop (not just minimize)
2. Restart Claude Desktop
3. Wait 5-10 seconds for MCP server to initialize
4. Try asking: "Show me PDF templates"

## Uninstallation

To remove the MCP server:
\`\`\`powershell
powershell -File "C:\\Program Files\\RightFlow-MCP\\uninstall.ps1"
\`\`\`

Or manually:
1. Delete \`C:\\Program Files\\RightFlow-MCP\`
2. Edit \`%APPDATA%\\Claude\\claude_desktop_config.json\`
3. Remove the \`rightflow-cowork\` entry from \`mcpServers\`

## Support

- 📧 Email: support@rightflow.co.il
- 🌐 Website: https://rightflow.co.il
- 📚 Documentation: https://docs.rightflow.co.il

---

**Version**: 2.0.0
**Generated**: ${new Date().toISOString()}
**Organization**: ${organizationId}
`;
}

export default router;
