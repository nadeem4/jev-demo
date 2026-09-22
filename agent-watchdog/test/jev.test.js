import { test } from 'node:test';
import assert from 'node:assert/strict';
import { describeAction, buildState, askJev } from '../src/jev.js';

test('describes a Bash call by its command', () => {
  assert.equal(describeAction({ tool_name: 'Bash', tool_input: { command: 'npm test' } }), 'Bash: npm test');
});

test('describes a PowerShell call by its command', () => {
  assert.equal(describeAction({ tool_name: 'PowerShell', tool_input: { command: 'Get-ChildItem' } }), 'PowerShell: Get-ChildItem');
});

test('describes a Write call by path and a truncated excerpt', () => {
  const text = describeAction({ tool_name: 'Write', tool_input: { file_path: 'a.js', content: 'x'.repeat(1000) } });
  assert.match(text, /^Write a\.js: x+/);
  assert.ok(text.length < 400);
});

test('describes an Edit call by path and replacement', () => {
  const text = describeAction({ tool_name: 'Edit', tool_input: { file_path: 'a.js', old_string: 'foo', new_string: 'bar' } });
  assert.equal(text, 'Edit a.js: replace "foo" with "bar"');
});

test('state counts how often the exact action already ran, since Jev cannot count', () => {
  const state = buildState('Fix the test', 'Bash: npm test', ['Bash: npm test', 'Edit a.js: x', 'Bash: npm test']);
  assert.equal(state.task, 'Fix the test');
  assert.equal(state.proposed_action, 'Bash: npm test');
  assert.equal(state.times_exact_action_already_ran, 2);
  assert.deepEqual(state.recent_actions, ['Bash: npm test', 'Edit a.js: x', 'Bash: npm test']);
});

test('asks Jev the four watchdog questions and returns its answers', async () => {
  let request;
  const fakeEvaluate = async (req) => { request = req; return { answers: { ok: true } }; };
  const answers = await askJev({ task: 't' }, { evaluate: fakeEvaluate });
  assert.deepEqual(answers, { ok: true });
  assert.equal(request.model, 'typesafe-ai/jev');
  assert.deepEqual(Object.keys(request.questions).sort(), ['in_scope', 'looping', 'off_task_goal', 'reversibility']);
});

test('returns null when Jev errors', async () => {
  const failing = async () => { throw new Error('529 overloaded'); };
  assert.equal(await askJev({}, { evaluate: failing }), null);
});

test('returns null when Jev is too slow', async () => {
  const slow = () => new Promise((resolve) => setTimeout(() => resolve({ answers: {} }), 200));
  assert.equal(await askJev({}, { evaluate: slow, timeoutMs: 20 }), null);
});
