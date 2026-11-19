import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../ops/sync-public-cloudflare.mjs', import.meta.url), 'utf8');
const writer = source.slice(source.indexOf('function readPreviousStatus('), source.indexOf('async function main()'));
const unchangedStart = source.indexOf('  if (!snapshotsChanged && !retrySkippedMedia) {');
const unchanged = source.slice(unchangedStart, source.indexOf('\n  if (!publicContentChanged', unchangedStart));

test('atomic sanitized receipt: published, unchanged preserving media warning, failure preserving last success', () => {
  const root = fs.mkdtempSync(join(tmpdir(), 'sync-status-test-'));
  const statusPath = join(root, '.public-sync/production.json');
  try {
    const context = vm.createContext({ ...fs, Buffer, dirname, statusPath, process: { pid: process.pid }, console: { log() {} } });
    vm.runInContext(writer, context);
    vm.runInContext('writeStatus("success", {outcome:"published",media_objects_checked:3,skipped_objects:2})', context);
    let result = JSON.parse(fs.readFileSync(statusPath));
    assert.equal(result.skipped_objects, 2);
    const lastSuccess = result.last_success_at;
    // Execute the production unchanged branch. A media-warning retry deliberately bypasses it.
    vm.runInContext(`(function(){let snapshotsChanged=false,retrySkippedMedia=false;${unchanged}})()`, context);
    result = JSON.parse(fs.readFileSync(statusPath));
    assert.equal(result.outcome, 'unchanged');
    assert.equal(result.skipped_objects, 2);
    vm.runInContext('writeStatus("failed", {error_code:"sync_failed"})', context);
    result = JSON.parse(fs.readFileSync(statusPath));
    assert.equal(result.status, 'failed');
    assert.ok(result.last_success_at >= lastSuccess);
    assert.equal(result.error_code, 'sync_failed');
    assert.equal(result.skipped_objects, 2);
    assert.equal(Object.keys(result).length, 6);
    assert.equal(fs.readdirSync(dirname(statusPath)).length, 1);
    assert.equal(fs.statSync(statusPath).mode & 0o777, 0o600);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test('first unchanged check keeps missing media history unknown', () => {
  const root = fs.mkdtempSync(join(tmpdir(), 'sync-status-test-'));
  try {
    const statusPath = join(root, 'status.json');
    const context = vm.createContext({ ...fs, Buffer, dirname, statusPath, process: { pid: process.pid } });
    vm.runInContext(writer + '\nwriteStatus("success", {outcome:"unchanged",skipped_objects:0})', context);
    assert.equal(JSON.parse(fs.readFileSync(statusPath)).skipped_objects, null);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test('prior receipts reject null, array, oversized and forged fields without payload leakage', () => {
  const root = fs.mkdtempSync(join(tmpdir(), 'sync-status-test-'));
  const statusPath = join(root, 'status.json');
  const context = vm.createContext({ ...fs, Buffer, dirname, statusPath, process: { pid: process.pid } });
  try {
    vm.runInContext(writer, context);
    for (const raw of ['null', '[]', '{', ' '.repeat(65537), JSON.stringify({last_success_at: {secret: 'SECRET'}, skipped_objects: 'SECRET'}), JSON.stringify({last_success_at: 'SECRET', skipped_objects: -1})]) {
      fs.writeFileSync(statusPath, raw);
      vm.runInContext('writeStatus("failed", {error_code:"sync_failed"})', context);
      const output = fs.readFileSync(statusPath, 'utf8');
      const result = JSON.parse(output);
      assert.equal(result.last_success_at, null);
      assert.equal(result.skipped_objects, null);
      assert.ok(!output.includes('SECRET'));
      assert.ok(output.length < 512);
    }
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
