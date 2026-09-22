#!/usr/bin/env node
// Claude Code hook entry point (PreToolUse + UserPromptSubmit). Reads the
// event from stdin and prints a decision to stdout. stdout must carry only
// the hook JSON, so dotenv runs quietly.
import { config } from 'dotenv';
import { fileURLToPath } from 'node:url';
import { handleEvent } from '../src/watchdog.js';

config({ path: fileURLToPath(new URL('../../.env', import.meta.url)), quiet: true });
const stateDir = process.env.WATCHDOG_STATE_DIR ?? fileURLToPath(new URL('../.watchdog', import.meta.url));

let input = '';
for await (const chunk of process.stdin) input += chunk;

const output = await handleEvent(JSON.parse(input), { stateDir });
if (output) process.stdout.write(JSON.stringify(output));
