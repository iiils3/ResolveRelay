import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
const readme = readFileSync(new URL('../README.md', import.meta.url), 'utf8');
const toolNames = [...app.matchAll(/reg\(\s*['"]([^'"]+)['"]/g)].map((match) => match[1]);

test('registers a non-trivial, unique WebMCP tool surface', () => {
  assert.ok(toolNames.length >= 15, `expected at least 15 tools, found ${toolNames.length}`);
  assert.equal(new Set(toolNames).size, toolNames.length, 'tool names must be unique');
});

test('keeps consequential consumer and merchant tools confirmation-gated', () => {
  for (const name of [
    'create_merchant_invitation', 'submit_case_to_merchant', 'accept_resolution',
    'decline_resolution', 'log_contact_attempt', 'merchant_request_evidence',
    'merchant_offer_resolution', 'merchant_reject_case',
  ]) {
    const start = app.search(new RegExp(`reg\\(\\s*['"]${name}['"]`));
    const registration = app.slice(start, start + 1800);
    assert.ok(start >= 0, `${name} must be registered`);
    assert.match(registration, /confirmed|confirmWrap/, `${name} must require confirmation`);
  }
});

test('removes stale tool registrations with an AbortSignal', () => {
  assert.match(app, /new AbortController\(\)/);
  assert.match(app, /registerTool\(tool,\s*\{\s*signal:\s*controller\.signal\s*\}\)/);
  assert.match(app, /controller\.abort\(\)/);
});

test('documents the working challenge deployment', () => {
  assert.match(readme, /https:\/\/resolverelay-recovery-gxngvu\.v2\.appdeploy\.ai\//);
  assert.doesNotMatch(readme, /https:\/\/iiils3\.github\.io\/ResolveRelay\//);
});
