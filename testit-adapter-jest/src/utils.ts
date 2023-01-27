import { createHash, randomUUID } from 'crypto';
import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { dirname, join, normalize, parse } from 'path';
import axios from 'axios';
import { debug } from './debug';

const log = debug.extend('utils');

export function isDefined<T>(value: T | undefined | null): value is T {
  return value !== undefined && value !== null;
}

export function nullToUndefined<T>(value: T | undefined | null): T | undefined {
  return value ?? undefined;
}

export function excludePath(source: string, toRemove: string): string {
  return source.replace(toRemove, '');
}

export function normalizePath(path: string): string {
  return normalize(path);
}

export function getHash(input: string): string {
  return createHash('md5').update(input).digest('hex');
}

export function getDir(file: string): string {
  return dirname(file);
}

export function getFileName(file: string): string {
  return parse(file).base;
}

const dirPrefix = 'testit-';
let tempDir: string;

export function createTempDir() {
  log('Creating temp dir');
  tempDir = mkdtempSync(join(tmpdir(), dirPrefix));
  log('Created temp dir %s', tempDir);
}

export function createTempFile(name: string, content: string): string {
  if (!tempDir) {
    throw new Error('Temp dir is not created');
  }
  log('Creating temp file %s in %s', name, tempDir);
  const path = join(tempDir, name);
  writeFileSync(path, content);
  return path;
}

export function removeTempDir(): void {
  if (tempDir) {
    log('Removing temp dir %s', tempDir);
    rmSync(tempDir, { recursive: true });
  }
}

export function generateExternalId(path: string, testName: string) {
  return getHash(
    JSON.stringify({
      path: path,
      name: testName,
    })
  );
}

export function generateFileName() {
  return `${randomUUID()}-attachment.txt`;
}

export function formatError(error: any) {
  return axios.isAxiosError(error)
    ? error.response?.data ?? error.response?.statusText ?? error.message
    : error instanceof Error
    ? error.message
    : error;
}
