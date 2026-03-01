import fs from 'node:fs';
import path from 'node:path';
import { app } from 'electron';

export type MainDebugLogger = (scope: string, message: string, details?: unknown) => void;

export type Diagnostics = {
  debugMain: MainDebugLogger;
  appendRendererLog: (line: string) => void;
};

const diagnosticsLogPath = (): string => path.join(app.getPath('userData'), 'logs', 'diagnostics.log');

const appendMainLog = (line: string): void => {
  try {
    const logPath = diagnosticsLogPath();
    fs.mkdirSync(path.dirname(logPath), { recursive: true });
    fs.appendFileSync(logPath, `${new Date().toISOString()} ${line}\n`, 'utf8');
  } catch {
    // Best-effort logging; do not crash app on log write failures.
  }
};

export const createDiagnostics = (isDev: boolean): Diagnostics => {
  const debugMain: MainDebugLogger = (scope, message, details) => {
    const serialized = details === undefined ? '' : ` ${JSON.stringify(details)}`;
    appendMainLog(`[main:${scope}] ${message}${serialized}`);
    if (!isDev) return;
    if (details === undefined) {
      console.info(`[main:${scope}] ${message}`);
      return;
    }
    console.info(`[main:${scope}] ${message}`, details);
  };

  return {
    debugMain,
    appendRendererLog: (line: string) => {
      appendMainLog(`[renderer] ${line}`);
    }
  };
};
