#!/usr/bin/env node

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const packageJson = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const appName = packageJson.name;
const command = process.argv[2];
const args = process.argv.slice(3);

const getUserDataDir = () => {
  if (process.platform === 'darwin') {
    return path.join(os.homedir(), 'Library', 'Application Support', appName);
  }
  if (process.platform === 'win32') {
    return path.join(process.env.APPDATA ?? path.join(os.homedir(), 'AppData', 'Roaming'), appName);
  }
  return path.join(process.env.XDG_CONFIG_HOME ?? path.join(os.homedir(), '.config'), appName);
};

const overridePath = path.join(getUserDataDir(), 'update-override.json');

const readFlag = (name, fallback) => {
  const index = args.indexOf(name);
  if (index === -1) return fallback;
  return args[index + 1] ?? fallback;
};

const printUsage = () => {
  console.log(`Usage:
  pnpm update:test:stage [--version 0.1.1-beta.1] [--name "0.1.1 beta 1"] [--notes "text"] [--prerelease true]
  pnpm update:test:clear

Override file:
  ${overridePath}`);
};

if (!command || command === '--help' || command === '-h') {
  printUsage();
  process.exit(0);
}

if (command === 'stage') {
  const version = readFlag('--version', '0.1.1-beta.1');
  const releaseName = readFlag('--name', `${version} staged test`);
  const body = readFlag(
    '--notes',
    [
      'Staged update test.',
      '',
      '- Verifies startup check',
      '- Verifies version transition UI',
      '- Verifies manual update release-page flow'
    ].join('\n')
  );
  const prereleaseRaw = String(readFlag('--prerelease', 'true')).toLowerCase();
  const prerelease = prereleaseRaw === 'true' || prereleaseRaw === '1' || prereleaseRaw === 'yes';

  fs.mkdirSync(path.dirname(overridePath), { recursive: true });
  fs.writeFileSync(
    overridePath,
    JSON.stringify(
      {
        latestVersion: version,
        releaseName,
        releaseUrl: 'https://github.com/Raj-R1/ceiling-flights/releases',
        body,
        publishedAt: new Date().toISOString(),
        isPrerelease: prerelease
      },
      null,
      2
    ),
    'utf8'
  );

  console.log(`Staged update override written to:
${overridePath}

Relaunch the app to force the update modal.`);
  process.exit(0);
}

if (command === 'clear') {
  if (fs.existsSync(overridePath)) {
    fs.unlinkSync(overridePath);
    console.log(`Removed update override:
${overridePath}`);
  } else {
    console.log(`No update override found at:
${overridePath}`);
  }
  process.exit(0);
}

printUsage();
process.exit(1);
