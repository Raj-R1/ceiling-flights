import fs from 'node:fs';
import path from 'node:path';
import { app } from 'electron';
import type { UpdateCheckResult, UpdateInfo } from '../../shared/types';
import type { MainDebugLogger } from './diagnostics';

const RELEASES_URL = 'https://api.github.com/repos/Raj-R1/ceiling-flights/releases';
const UPDATE_OVERRIDE_FILENAME = 'update-override.json';
const RELEASE_HEADERS = {
  Accept: 'application/vnd.github+json',
  'User-Agent': 'CeilingFlights-Updater/0.1'
} as const;

type GitHubRelease = {
  tag_name?: string;
  name?: string;
  body?: string;
  html_url?: string;
  prerelease?: boolean;
  draft?: boolean;
  published_at?: string;
};

type ParsedVersion = {
  raw: string;
  major: number;
  minor: number;
  patch: number;
  prerelease: Array<string | number>;
};

type UpdateOverrideFile = {
  latestVersion?: string;
  releaseName?: string;
  releaseUrl?: string;
  body?: string;
  publishedAt?: string;
  isPrerelease?: boolean;
};

const fetchWithTimeout = async (url: string, timeoutMs: number, init?: RequestInit): Promise<Response> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
};

export const getUpdateOverridePath = (): string => path.join(app.getPath('userData'), UPDATE_OVERRIDE_FILENAME);

const normalizeVersion = (value: string): string => {
  const trimmed = value.trim().replace(/^v/i, '');
  const withSyntheticPrereleaseDash = trimmed.replace(
    /^(\d+\.\d+\.\d+)([a-zA-Z][a-zA-Z0-9.-]*)$/,
    '$1-$2'
  );
  return withSyntheticPrereleaseDash.split('+')[0] ?? withSyntheticPrereleaseDash;
};

export const parseVersion = (value: string): ParsedVersion | null => {
  const normalized = normalizeVersion(value);
  const match = normalized.match(/^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/);
  if (!match) {
    return null;
  }

  const [, majorRaw, minorRaw, patchRaw, prereleaseRaw] = match;
  const prerelease = prereleaseRaw
    ? prereleaseRaw
        .split('.')
        .filter(Boolean)
        .map((part) => (/^\d+$/.test(part) ? Number(part) : part.toLowerCase()))
    : [];

  return {
    raw: value,
    major: Number(majorRaw),
    minor: Number(minorRaw),
    patch: Number(patchRaw),
    prerelease
  };
};

const comparePrerelease = (left: Array<string | number>, right: Array<string | number>): number => {
  const max = Math.max(left.length, right.length);
  for (let index = 0; index < max; index += 1) {
    const leftPart = left[index];
    const rightPart = right[index];

    if (leftPart === undefined) return -1;
    if (rightPart === undefined) return 1;
    if (leftPart === rightPart) continue;

    const leftIsNumber = typeof leftPart === 'number';
    const rightIsNumber = typeof rightPart === 'number';
    if (leftIsNumber && rightIsNumber) {
      return leftPart > rightPart ? 1 : -1;
    }
    if (leftIsNumber) return -1;
    if (rightIsNumber) return 1;
    return leftPart > rightPart ? 1 : -1;
  }

  return 0;
};

export const compareVersions = (left: ParsedVersion, right: ParsedVersion): number => {
  if (left.major !== right.major) return left.major > right.major ? 1 : -1;
  if (left.minor !== right.minor) return left.minor > right.minor ? 1 : -1;
  if (left.patch !== right.patch) return left.patch > right.patch ? 1 : -1;

  const leftStable = left.prerelease.length === 0;
  const rightStable = right.prerelease.length === 0;
  if (leftStable && rightStable) return 0;
  if (leftStable) return 1;
  if (rightStable) return -1;

  return comparePrerelease(left.prerelease, right.prerelease);
};

const getReleaseVersionString = (release: GitHubRelease): string | null => {
  if (typeof release.tag_name === 'string' && release.tag_name.trim().length > 0) {
    return release.tag_name.trim();
  }
  if (typeof release.name === 'string' && release.name.trim().length > 0) {
    return release.name.trim();
  }
  return null;
};

const isBetaVersion = (value: string): boolean => /\bbeta\b|b\d*/i.test(value);

const normalizeReleaseUrl = (value: unknown): string => {
  if (typeof value !== 'string') {
    return 'https://github.com/Raj-R1/ceiling-flights/releases';
  }

  const trimmed = value.trim();
  if (/^https:\/\/github\.com\/Raj-R1\/ceiling-flights\/releases/i.test(trimmed)) {
    return trimmed;
  }

  return 'https://github.com/Raj-R1/ceiling-flights/releases';
};

export const loadUpdateOverride = (currentVersion: string): UpdateInfo | null => {
  try {
    const raw = fs.readFileSync(getUpdateOverridePath(), 'utf8');
    const parsed = JSON.parse(raw) as UpdateOverrideFile;
    const latestVersion = typeof parsed.latestVersion === 'string' ? parsed.latestVersion.trim() : '';
    if (!latestVersion) {
      return null;
    }

    const parsedCurrent = parseVersion(currentVersion);
    const parsedLatest = parseVersion(latestVersion);
    if (!parsedCurrent || !parsedLatest || compareVersions(parsedLatest, parsedCurrent) <= 0) {
      return null;
    }

    const releaseName =
      typeof parsed.releaseName === 'string' && parsed.releaseName.trim().length > 0
        ? parsed.releaseName.trim()
        : latestVersion;

    return {
      currentVersion,
      latestVersion,
      releaseName,
      releaseUrl: normalizeReleaseUrl(parsed.releaseUrl),
      publishedAt: typeof parsed.publishedAt === 'string' ? parsed.publishedAt : undefined,
      body:
        typeof parsed.body === 'string' && parsed.body.trim().length > 0
          ? parsed.body
          : 'Local staged update test.\n\nNo changelog was provided in update-override.json.',
      isPrerelease: parsed.isPrerelease === true,
      isBeta: isBetaVersion(latestVersion) || isBetaVersion(releaseName)
    };
  } catch {
    return null;
  }
};

export const selectLatestRelease = (releases: GitHubRelease[]): UpdateInfo | null => {
  const currentVersion = app.getVersion();
  const parsedCurrentVersion = parseVersion(currentVersion);
  if (!parsedCurrentVersion) {
    return null;
  }

  let best:
    | {
        release: GitHubRelease;
        parsed: ParsedVersion;
        version: string;
      }
    | undefined;

  for (const release of releases) {
    if (release.draft) continue;
    const version = getReleaseVersionString(release);
    if (!version) continue;

    const parsed = parseVersion(version);
    if (!parsed) continue;

    if (!best || compareVersions(parsed, best.parsed) > 0) {
      best = { release, parsed, version };
    }
  }

  if (!best || compareVersions(best.parsed, parsedCurrentVersion) <= 0) {
    return null;
  }

  const releaseName =
    (typeof best.release.name === 'string' && best.release.name.trim().length > 0 ? best.release.name.trim() : best.version);

  return {
    currentVersion,
    latestVersion: best.version,
    releaseName,
    releaseUrl: best.release.html_url ?? 'https://github.com/Raj-R1/ceiling-flights/releases',
    publishedAt: best.release.published_at,
    body: best.release.body ?? 'No changelog was provided for this release.',
    isPrerelease: best.release.prerelease === true,
    isBeta: isBetaVersion(best.version) || isBetaVersion(releaseName)
  };
};

export const checkForAppUpdate = async (
  debugMain: MainDebugLogger,
  skippedVersion?: string
): Promise<UpdateCheckResult> => {
  const currentVersion = app.getVersion();
  const override = loadUpdateOverride(currentVersion);

  if (override) {
    debugMain('updater', 'Using local update override', {
      currentVersion,
      latestVersion: override.latestVersion,
      overridePath: getUpdateOverridePath(),
      bypassedSkippedVersion: skippedVersion
    });
    return { currentVersion, update: override };
  }

  try {
    debugMain('updater', 'Checking GitHub releases for updates', { currentVersion, skippedVersion });
    const response = await fetchWithTimeout(RELEASES_URL, 8000, { headers: RELEASE_HEADERS });
    if (!response.ok) {
      debugMain('updater', 'Update check failed', { status: response.status });
      return { currentVersion, update: null };
    }

    const payload = (await response.json()) as unknown;
    const releases = Array.isArray(payload) ? (payload as GitHubRelease[]) : [];
    const update = selectLatestRelease(releases);
    if (!update) {
      debugMain('updater', 'No newer release found', { currentVersion });
      return { currentVersion, update: null };
    }

    if (skippedVersion && skippedVersion === update.latestVersion) {
      debugMain('updater', 'Newest release was skipped previously', {
        currentVersion,
        latestVersion: update.latestVersion
      });
      return { currentVersion, update: null };
    }

    debugMain('updater', 'Newer release found', {
      currentVersion,
      latestVersion: update.latestVersion,
      prerelease: update.isPrerelease
    });
    return { currentVersion, update };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown update-check error';
    debugMain('updater', 'Update check errored', { currentVersion, message });
    return { currentVersion, update: null };
  }
};
