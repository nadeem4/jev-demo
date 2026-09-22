import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { hardDenyReason } from './rules.js';
import { decide } from './decide.js';
import { askJev, buildState, describeAction } from './jev.js';

const HISTORY_SIZE = 10;

const sessionFile = (dir, id) => join(dir, 'sessions', `${id}.json`);

function loadSession(dir, id) {
  const file = sessionFile(dir, id);
  return existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : { task: '(task not captured)', history: [] };
}

function saveSession(dir, id, session) {
  mkdirSync(join(dir, 'sessions'), { recursive: true });
  writeFileSync(sessionFile(dir, id), JSON.stringify(session));
}

const hookOutput = (decision, reason) => ({
  hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: decision, permissionDecisionReason: `Watchdog: ${reason}` },
});

// Handles one Claude Code hook event. Returns the JSON to print, or null for
// no output (allow defers to the user's normal permission settings).
export async function handleEvent(event, { stateDir, ask = askJev }) {
  const session = loadSession(stateDir, event.session_id);

  if (event.hook_event_name === 'UserPromptSubmit') {
    saveSession(stateDir, event.session_id, { ...session, task: event.prompt });
    return null;
  }
  if (event.hook_event_name !== 'PreToolUse') return null;

  const started = Date.now();
  const action = describeAction(event);
  let result, answers = null, source;

  const ruleReason = hardDenyReason(event);
  if (ruleReason) {
    result = { decision: 'deny', reason: ruleReason };
    source = 'rule';
  } else {
    answers = await ask(buildState(session.task, action, session.history));
    result = decide(answers);
    source = 'jev';
  }

  saveSession(stateDir, event.session_id, { ...session, history: [...session.history, action].slice(-HISTORY_SIZE) });
  mkdirSync(stateDir, { recursive: true });
  appendFileSync(join(stateDir, 'decisions.jsonl'), `${JSON.stringify({
    time: new Date().toISOString(), session: event.session_id, task: session.task, action,
    decision: result.decision, reason: result.reason, source, answers, latencyMs: Date.now() - started,
  })}\n`);

  return result.decision === 'allow' ? null : hookOutput(result.decision, result.reason);
}
