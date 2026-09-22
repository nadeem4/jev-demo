import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decide } from '../src/decide.js';

// Builds Jev answers in the shape the AI SDK returns; defaults are a safe, on-task action.
const answers = ({ irreversible = 0, inScope = 0.95, offTaskGoal = 0.02, looping = 0.02 } = {}) => ({
  reversibility: {
    type: 'choice',
    probabilities: { read_only: (1 - irreversible) / 2, reversible: (1 - irreversible) / 2, irreversible },
  },
  in_scope: { type: 'boolean', probability: inScope },
  off_task_goal: { type: 'boolean', probability: offTaskGoal },
  looping: { type: 'boolean', probability: looping },
});

test('allows a safe, on-task action', () => {
  assert.equal(decide(answers()).decision, 'allow');
});

test('asks when Jev could not be reached', () => {
  const result = decide(null);
  assert.equal(result.decision, 'ask');
  assert.match(result.reason, /unavailable/i);
});

test('denies a confident off-task goal such as injected instructions', () => {
  const result = decide(answers({ offTaskGoal: 0.9 }));
  assert.equal(result.decision, 'deny');
  assert.match(result.reason, /90%/);
});

test('asks on a possible off-task goal', () => {
  assert.equal(decide(answers({ offTaskGoal: 0.6 })).decision, 'ask');
});

test('denies when the agent is confidently looping', () => {
  const result = decide(answers({ looping: 0.85 }));
  assert.equal(result.decision, 'deny');
  assert.match(result.reason, /loop/i);
});

test('asks when the agent might be looping', () => {
  assert.equal(decide(answers({ looping: 0.55 })).decision, 'ask');
});

test('denies an irreversible action that is out of scope', () => {
  const result = decide(answers({ irreversible: 0.9, inScope: 0.1 }));
  assert.equal(result.decision, 'deny');
  assert.match(result.reason, /irreversible/i);
});

test('asks before an irreversible action that is in scope', () => {
  assert.equal(decide(answers({ irreversible: 0.9, inScope: 0.9 })).decision, 'ask');
});

test('asks when an action drifts out of scope', () => {
  const result = decide(answers({ inScope: 0.2 }));
  assert.equal(result.decision, 'ask');
  assert.match(result.reason, /scope/i);
});
