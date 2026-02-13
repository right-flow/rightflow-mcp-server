/**
 * Script to split monolithic translation files into namespace modules
 * Run with: node scripts/split-translations.js
 */

const fs = require('fs');
const path = require('path');

const i18nPath = path.join(__dirname, '../packages/app/src/i18n');
const translationsPath = path.join(i18nPath, 'translations');

const languages = ['he', 'ar'];

// Namespace definitions with key patterns
const namespacePatterns = {
  common: {
    prefixes: ['common.', 'language.'],
    flatKeys: [
      'appTitle', 'poweredBy', 'save', 'cancel', 'delete', 'confirm', 'close',
      'add', 'remove', 'edit', 'overview', 'myForms', 'analytics', 'responses',
      'automation', 'teamManagement', 'billing', 'settingsTitle', 'helpCenter',
      'untitledForm', 'language', 'hebrew', 'english', 'arabic', 'darkMode',
      'lightMode', 'featuresLabel', 'useCasesLabel', 'integrationsLabel',
      'loginLabel', 'getStarted', 'heroTitle', 'heroSubtitle', 'viewDemo',
      'satisfiedTeams', 'trulyIntelligentForms', 'offlineReady',
      'rightToolsForField', 'builtFromScratch', 'anyNicheAnywhere',
      'readUseCase', 'connectToYourWorld', 'streamDataDirectly',
      'socialProofTitle', 'readyToGoPaperless', 'joinMobileFirst',
      'contactUs', 'noCreditCard', 'online', 'offline', 'pendingItems',
      'syncNow', 'syncError', 'lastSynced', 'noConnection',
      'connectionRestored', 'itemsWaitingToSync', 'syncing',
      'pwaNewVersionTitle', 'pwaNewVersionMessage', 'pwaOfflineReady',
      'pwaRegistered', 'pwaRegistrationError', 'backToDashboard',
      'backToSettings', 'loadingDashboard', 'freePlan', 'publish',
      'publishing', 'draft', 'published', 'archived', 'export'
    ]
  },
  dashboard: {
    prefixes: ['dashboard.'],
    flatKeys: ['loadingDashboard']
  },
  billing: {
    prefixes: ['billing.'],
    flatKeys: []
  },
  workflow: {
    prefixes: ['workflow.'],
    flatKeys: []
  },
  help: {
    prefixes: ['help.'],
    flatKeys: []
  },
  editor: {
    prefixes: [],
    flatKeys: [
      // All remaining keys go to editor namespace
    ],
    isDefault: true
  }
};

// Parse TypeScript file to extract translations object
function parseTranslationFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');

  // Extract the object content
  const match = content.match(/export const \w+: Translations = \{([\s\S]*)\};/);
  if (!match) {
    console.error('Could not parse file:', filePath);
    return {};
  }

  const objectContent = match[1];
  const translations = {};

  // Parse key-value pairs - handle both 'key': 'value' and key: 'value' formats
  // Also handles multi-line strings and escaped quotes
  const keyValueRegex = /['"]?([^'":\s]+)['"]?\s*:\s*(['"`])((?:[^\\]|\\.)*?)\2/g;
  let m;

  while ((m = keyValueRegex.exec(objectContent)) !== null) {
    const key = m[1];
    const value = m[3];
    translations[key] = value;
  }

  return translations;
}

// Determine which namespace a key belongs to
function getNamespace(key) {
  for (const [namespace, config] of Object.entries(namespacePatterns)) {
    // Check prefixes
    for (const prefix of config.prefixes || []) {
      if (key.startsWith(prefix)) {
        return namespace;
      }
    }

    // Check flat keys
    if ((config.flatKeys || []).includes(key)) {
      return namespace;
    }
  }

  // Default to editor
  return 'editor';
}

// Split translations by namespace
function splitTranslations(translations) {
  const namespaces = {
    common: {},
    dashboard: {},
    billing: {},
    workflow: {},
    help: {},
    editor: {}
  };

  for (const [key, value] of Object.entries(translations)) {
    const namespace = getNamespace(key);
    namespaces[namespace][key] = value;
  }

  return namespaces;
}

// Convert flat keys with prefixes to nested structure
function convertToNestedStructure(namespace, translations) {
  const result = {};

  for (const [key, value] of Object.entries(translations)) {
    // Remove namespace prefix if present
    let cleanKey = key;
    const prefixPatterns = namespacePatterns[namespace]?.prefixes || [];

    for (const prefix of prefixPatterns) {
      if (key.startsWith(prefix)) {
        cleanKey = key.slice(prefix.length);
        break;
      }
    }

    // For now, keep flat structure to maintain backward compatibility
    // The types use nested structure, but translation files use flat keys
    result[key] = value;
  }

  return result;
}

// Generate TypeScript file content
function generateTsContent(namespace, translations, lang) {
  const typeImport = namespace.charAt(0).toUpperCase() + namespace.slice(1) + 'Translations';

  let content = `import type { ${typeImport} } from '../../types/${namespace}.types';

const ${namespace}: ${typeImport} = {\n`;

  // Sort keys for consistency
  const sortedKeys = Object.keys(translations).sort();

  for (const key of sortedKeys) {
    const value = translations[key]
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'")
      .replace(/\n/g, '\\n');

    if (key.includes('.') || key.includes('-')) {
      content += `  '${key}': '${value}',\n`;
    } else {
      content += `  ${key}: '${value}',\n`;
    }
  }

  content += `};

export default ${namespace};
`;

  return content;
}

// Main execution
async function main() {
  console.log('Splitting translations into namespaces...\n');

  for (const lang of languages) {
    console.log(`Processing ${lang}...`);

    const sourceFile = path.join(translationsPath, `${lang}.ts`);
    if (!fs.existsSync(sourceFile)) {
      console.log(`  Skipping ${lang} - file not found`);
      continue;
    }

    // Read and parse translations
    const translations = parseTranslationFile(sourceFile);
    console.log(`  Found ${Object.keys(translations).length} keys`);

    // Split by namespace
    const namespaces = splitTranslations(translations);

    // Create output directory
    const outputDir = path.join(translationsPath, lang);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Write namespace files
    for (const [namespace, nsTranslations] of Object.entries(namespaces)) {
      const keyCount = Object.keys(nsTranslations).length;
      if (keyCount === 0) continue;

      console.log(`  Writing ${namespace}.ts (${keyCount} keys)`);

      // Note: We can't generate proper nested structure without more complex parsing
      // For now, we'll create stub files that need manual adjustment
      const outputFile = path.join(outputDir, `${namespace}.ts`);

      const content = `// Auto-generated - needs manual adjustment to match type structure
// ${keyCount} keys from ${lang}.ts

import type { ${namespace.charAt(0).toUpperCase() + namespace.slice(1)}Translations } from '../../types/${namespace}.types';

// TODO: Convert flat keys to nested structure matching the type definition
// Example: 'dashboard.header.search' -> header: { search: '...' }

const ${namespace} = {
${Object.entries(nsTranslations).map(([k, v]) => {
  const escaped = v.replace(/'/g, "\\'").replace(/\n/g, '\\n');
  return `  '${k}': '${escaped}',`;
}).join('\n')}
};

export default ${namespace};
`;

      fs.writeFileSync(outputFile, content);
    }

    // Create index.ts
    const indexContent = `/**
 * ${lang.toUpperCase()} translations - namespace exports
 */
export { default as common } from './common';
export { default as dashboard } from './dashboard';
export { default as billing } from './billing';
export { default as workflow } from './workflow';
export { default as editor } from './editor';
export { default as help } from './help';
`;

    fs.writeFileSync(path.join(outputDir, 'index.ts'), indexContent);
    console.log(`  Created index.ts`);
  }

  console.log('\nDone! Please manually adjust the generated files to match type definitions.');
}

main().catch(console.error);
