import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const HOOK = new URL('../bin/hook.mjs', import.meta.url);
const run = (event) => execFileSync('node', [HOOK.pathname.replace(/^\/(\w:)/, '$1')], {
  input: JSON.stringify(event),
  env: { ...process.env, WATCHDOG_STATE_DIR: mkdtempSync(join(tmpdir(), 'hook-')) },
  encoding: 'utf8',
});

test('prints a deny decision as JSON on stdout', () => {
  const out = JSON.parse(run({ hook_event_name: 'PreToolUse', session_id: 's', tool_name: 'Bash', tool_input: { command: 'rm -rf /' } }));
  assert.equal(out.hookSpecificOutput.permissionDecision, 'deny');
});

test('prints nothing for events it does not act on', () => {
  assert.equal(run({ hook_event_name: 'UserPromptSubmit', session_id: 's', prompt: 'hi' }), '');
});
