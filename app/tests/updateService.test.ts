import { afterEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';

const { getVersionMock } = vi.hoisted(() => ({
  getVersionMock: vi.fn(() => '0.1.0')
}));
const { getPathMock } = vi.hoisted(() => ({
  getPathMock: vi.fn(() => '/tmp/ceiling-flights-test-user-data')
}));

vi.mock('electron', () => ({
  app: {
    getVersion: getVersionMock,
    getPath: getPathMock
  }
}));

import {
  checkForAppUpdate,
  compareVersions,
  getUpdateOverridePath,
  loadUpdateOverride,
  parseVersion,
  selectLatestRelease
} from '../main/services/updateService';

const noopDebug = vi.fn();

const makeJsonResponse = (payload: unknown, status = 200): Response =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });

describe('parseVersion', () => {
  it('parses stable versions with a leading v', () => {
    expect(parseVersion('v1.2.3')).toMatchObject({
      major: 1,
      minor: 2,
      patch: 3,
      prerelease: []
    });
  });

  it('normalizes compact beta suffixes into prerelease identifiers', () => {
    expect(parseVersion('1.2.3b4')).toMatchObject({
      major: 1,
      minor: 2,
      patch: 3,
      prerelease: ['b4']
    });
  });
});

describe('compareVersions', () => {
  it('treats stable versions as newer than prereleases of the same core version', () => {
    const stable = parseVersion('1.2.3');
    const beta = parseVersion('1.2.3-beta.1');
    expect(stable).not.toBeNull();
    expect(beta).not.toBeNull();
    expect(compareVersions(stable!, beta!)).toBe(1);
  });
});

describe('selectLatestRelease', () => {
  afterEach(() => {
    getVersionMock.mockReturnValue('0.1.0');
  });

  it('returns the highest semver release even when published order differs', () => {
    const update = selectLatestRelease([
      {
        tag_name: 'v0.2.0-beta.1',
        name: '0.2.0 beta 1',
        html_url: 'https://github.com/Raj-R1/ceiling-flights/releases/tag/v0.2.0-beta.1',
        prerelease: true
      },
      {
        tag_name: 'v0.1.5',
        name: '0.1.5',
        html_url: 'https://github.com/Raj-R1/ceiling-flights/releases/tag/v0.1.5',
        prerelease: false
      }
    ]);

    expect(update?.latestVersion).toBe('v0.2.0-beta.1');
    expect(update?.isPrerelease).toBe(true);
    expect(update?.isBeta).toBe(true);
  });

  it('returns null when no release is newer than the installed version', () => {
    getVersionMock.mockReturnValue('0.2.0');

    const update = selectLatestRelease([
      {
        tag_name: 'v0.1.9',
        name: '0.1.9',
        html_url: 'https://github.com/Raj-R1/ceiling-flights/releases/tag/v0.1.9',
        prerelease: false
      }
    ]);

    expect(update).toBeNull();
  });
});

describe('loadUpdateOverride', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    getVersionMock.mockReturnValue('0.1.0');
  });

  it('loads a valid staged update override when it is newer than the installed version', () => {
    vi.spyOn(fs, 'readFileSync').mockImplementation((filePath) => {
      if (String(filePath) === getUpdateOverridePath()) {
        return JSON.stringify({
          latestVersion: '0.1.1-beta.1',
          releaseName: '0.1.1 beta 1',
          body: 'staged notes',
          isPrerelease: true
        });
      }
      throw new Error('Unexpected file read');
    });

    const update = loadUpdateOverride('0.1.0');
    expect(update?.latestVersion).toBe('0.1.1-beta.1');
    expect(update?.isPrerelease).toBe(true);
    expect(update?.isBeta).toBe(true);
  });

  it('ignores overrides that are not newer than the installed version', () => {
    vi.spyOn(fs, 'readFileSync').mockImplementation((filePath) => {
      if (String(filePath) === getUpdateOverridePath()) {
        return JSON.stringify({
          latestVersion: '0.1.0',
          releaseName: '0.1.0 staged test'
        });
      }
      throw new Error('Unexpected file read');
    });

    expect(loadUpdateOverride('0.1.0')).toBeNull();
  });
});

describe('checkForAppUpdate', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    noopDebug.mockClear();
    getVersionMock.mockReturnValue('0.1.0');
    vi.restoreAllMocks();
  });

  it('suppresses prompting for a skipped release', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        makeJsonResponse([
          {
            tag_name: 'v0.2.0',
            name: '0.2.0',
            html_url: 'https://github.com/Raj-R1/ceiling-flights/releases/tag/v0.2.0',
            prerelease: false,
            body: 'Fresh release notes'
          }
        ])
      )
    );

    const result = await checkForAppUpdate(noopDebug, 'v0.2.0');
    expect(result.update).toBeNull();
  });

  it('returns a newer prerelease when it outranks the installed version', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        makeJsonResponse([
          {
            tag_name: 'v0.2.0-beta.2',
            name: '0.2.0 beta 2',
            html_url: 'https://github.com/Raj-R1/ceiling-flights/releases/tag/v0.2.0-beta.2',
            prerelease: true,
            body: '- test changelog'
          }
        ])
      )
    );

    const result = await checkForAppUpdate(noopDebug);
    expect(result.update?.latestVersion).toBe('v0.2.0-beta.2');
    expect(result.update?.isPrerelease).toBe(true);
  });

  it('prefers the local staged update override over GitHub releases', async () => {
    vi.spyOn(fs, 'readFileSync').mockImplementation((filePath) => {
      if (String(filePath) === getUpdateOverridePath()) {
        return JSON.stringify({
          latestVersion: '0.1.1',
          releaseName: '0.1.1 staged test',
          body: 'local override notes'
        });
      }
      throw new Error('Unexpected file read');
    });

    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const result = await checkForAppUpdate(noopDebug);
    expect(result.update?.latestVersion).toBe('0.1.1');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('does not suppress the local staged update override when that version was skipped', async () => {
    vi.spyOn(fs, 'readFileSync').mockImplementation((filePath) => {
      if (String(filePath) === getUpdateOverridePath()) {
        return JSON.stringify({
          latestVersion: '0.1.1',
          releaseName: '0.1.1 staged test'
        });
      }
      throw new Error('Unexpected file read');
    });

    const result = await checkForAppUpdate(noopDebug, '0.1.1');
    expect(result.update?.latestVersion).toBe('0.1.1');
  });

  it('fails safely on non-200 responses', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(makeJsonResponse({}, 500)));

    const result = await checkForAppUpdate(noopDebug);
    expect(result).toEqual({
      currentVersion: '0.1.0',
      update: null
    });
  });
});
