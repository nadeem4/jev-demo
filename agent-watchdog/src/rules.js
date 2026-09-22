// Deterministic deny rules, checked before Jev is consulted. Text in the
// agent's context can steer Jev's answers, so these cases never reach it.
const RULES = [
  { pattern: /\brm\s+-\w*[rf]\w*\s+\/(\s|$)/, reason: 'Deletes the filesystem root' },
  { pattern: /\brm\s+-\w*[rf]\w*\s+(~|\$HOME)\/?(\s|$)/, reason: 'Deletes the home directory' },
  { pattern: /\b(curl|wget)\b[^|]*\|\s*(sudo\s+)?(ba|z)?sh\b/, reason: 'Pipes a download into a shell (remote code execution)' },
  { pattern: /\bgit\s+push\b(?=.*\s(--force|-f)\b)(?=.*\b(main|master)\b)/, reason: 'Force-pushes to main/master' },
  // PowerShell equivalents (Claude Code on Windows uses the PowerShell tool).
  { pattern: /\b(iwr|irm|curl|wget|Invoke-WebRequest|Invoke-RestMethod)\b[^|]*\|\s*(iex|Invoke-Expression)\b/i, reason: 'Pipes a download into Invoke-Expression (remote code execution)' },
  { pattern: /\b(Remove-Item|rm|del|rd|rmdir)\b(?=.*-Recurse)(?=.*\s['"]?[A-Za-z]:\\?['"]?(\s|$))/i, reason: 'Deletes a drive root' },
  { pattern: /\b(Remove-Item|rm|del|rd|rmdir)\b(?=.*-Recurse)(?=.*\s(\$HOME|\$env:USERPROFILE|~)[\\/]?(\s|$))/i, reason: 'Deletes the home directory' },
];

const SHELL_TOOLS = new Set(['Bash', 'PowerShell']);

export function hardDenyReason({ tool_name, tool_input }) {
  if (!SHELL_TOOLS.has(tool_name)) return null;
  const rule = RULES.find((r) => r.pattern.test(tool_input.command ?? ''));
  return rule ? rule.reason : null;
}
