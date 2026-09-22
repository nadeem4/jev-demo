#!/usr/bin/env node
// Deploys the built static site. next build recreates out/, so the Vercel project
// link lives here in ui/.vercel and is copied in just before deploying.
import { cpSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";

cpSync(".vercel", "out/.vercel", { recursive: true });
rmSync("out/.env.local", { force: true });
execFileSync("npx", ["vercel@59", "deploy", "--prod", "--yes"], { cwd: "out", stdio: "inherit", shell: true });
