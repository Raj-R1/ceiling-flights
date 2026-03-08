import fs from 'node:fs';
import path from 'node:path';
import { app } from 'electron';
import { DEFAULT_SETTINGS } from '../shared/defaults';
import { sanitizeSettings } from '../shared/settingsSanitizer';
import type { AppSettings, UpdaterState } from '../shared/types';

type SettingsSchema = {
  settings: AppSettings;
  updater: UpdaterState;
};

const settingsPath = (): string => path.join(app.getPath('userData'), 'ceiling-flights-settings.json');
const tempSettingsPath = (): string => `${settingsPath()}.tmp`;

const sanitizeUpdaterState = (value: unknown): UpdaterState => {
  if (!value || typeof value !== 'object') {
    return {};
  }

  const candidate = value as { skippedVersion?: unknown };
  if (typeof candidate.skippedVersion === 'string' && candidate.skippedVersion.trim().length > 0) {
    return { skippedVersion: candidate.skippedVersion.trim() };
  }

  return {};
};

const readStore = (): SettingsSchema => {
  try {
    const file = fs.readFileSync(settingsPath(), 'utf8');
    const parsed = JSON.parse(file) as Partial<SettingsSchema>;
    return {
      settings: sanitizeSettings(parsed.settings),
      updater: sanitizeUpdaterState(parsed.updater)
    };
  } catch {
    return { settings: DEFAULT_SETTINGS, updater: {} };
  }
};

const writeStore = (value: SettingsSchema): void => {
  // Write-to-temp then rename lowers corruption risk during abrupt exits.
  const tempPath = tempSettingsPath();
  const finalPath = settingsPath();
  fs.mkdirSync(path.dirname(finalPath), { recursive: true });
  fs.writeFileSync(tempPath, JSON.stringify(value, null, 2), 'utf8');
  fs.renameSync(tempPath, finalPath);
};

export const getSettings = (): AppSettings => readStore().settings;

export const setSettings = (settings: AppSettings): AppSettings => {
  const current = readStore();
  const sanitized = sanitizeSettings(settings);
  writeStore({ settings: sanitized, updater: current.updater });
  return sanitized;
};

export const getUpdaterState = (): UpdaterState => readStore().updater;

export const setSkippedUpdateVersion = (version?: string): void => {
  const current = readStore();
  const skippedVersion = typeof version === 'string' && version.trim().length > 0 ? version.trim() : undefined;
  writeStore({
    settings: current.settings,
    updater: skippedVersion ? { skippedVersion } : {}
  });
};
