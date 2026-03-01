import fs from 'node:fs';
import path from 'node:path';
import { app } from 'electron';
import { DEFAULT_SETTINGS } from '../shared/defaults';
import { sanitizeSettings } from '../shared/settingsSanitizer';
import type { AppSettings } from '../shared/types';

type SettingsSchema = { settings: AppSettings };

const settingsPath = (): string => path.join(app.getPath('userData'), 'ceiling-flights-settings.json');
const tempSettingsPath = (): string => `${settingsPath()}.tmp`;

const readStore = (): SettingsSchema => {
  try {
    const file = fs.readFileSync(settingsPath(), 'utf8');
    const parsed = JSON.parse(file) as Partial<SettingsSchema>;
    return {
      settings: sanitizeSettings(parsed.settings)
    };
  } catch {
    return { settings: DEFAULT_SETTINGS };
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
  const sanitized = sanitizeSettings(settings);
  writeStore({ settings: sanitized });
  return sanitized;
};
