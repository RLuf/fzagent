import { existsSync } from 'fs';
import { join } from 'path';
import { readJsonSafe } from '../utils/json-safe.js';

export function checkExistingInstallation(projectRoot) {
  const statePath = join(projectRoot, '.reversa', 'state.json');

  if (!existsSync(statePath)) {
    return { installed: false };
  }

  try {
    const state = readJsonSafe(statePath);
    return { installed: true, version: state.version ?? '?', state };
  } catch {
    return { installed: false };
  }
}

export function checkFileConflict(filePath) {
  return existsSync(filePath);
}
