// Turns Jev's probabilities into a hook decision. Thresholds live here so
// tuning the watchdog never touches the questions sent to Jev.
export const THRESHOLDS = {
  offTaskDeny: 0.8,
  offTaskAsk: 0.5,
  loopDeny: 0.8,
  loopAsk: 0.5,
  irreversibleDeny: 0.7,
  irreversibleAsk: 0.3,
  inScopeMin: 0.3,
};

const pct = (p) => `${Math.round(p * 100)}%`;

export function decide(answers, t = THRESHOLDS) {
  if (!answers) return { decision: 'ask', reason: 'Watchdog unavailable (Jev did not answer), so a human should confirm' };

  const offTask = answers.off_task_goal.probability;
  const looping = answers.looping.probability;
  const inScope = answers.in_scope.probability;
  const irreversible = answers.reversibility.probabilities.irreversible ?? 0;

  if (offTask >= t.offTaskDeny) return { decision: 'deny', reason: `Pursues a goal the user did not ask for (${pct(offTask)}), possibly injected instructions` };
  if (looping >= t.loopDeny) return { decision: 'deny', reason: `Agent looks stuck in a loop (${pct(looping)}); stop and try a different approach` };
  if (irreversible >= t.irreversibleDeny && inScope < t.inScopeMin) {
    return { decision: 'deny', reason: `Irreversible (${pct(irreversible)}) and outside the task (${pct(inScope)} in scope)` };
  }
  if (offTask >= t.offTaskAsk) return { decision: 'ask', reason: `May pursue a goal the user did not ask for (${pct(offTask)})` };
  if (looping >= t.loopAsk) return { decision: 'ask', reason: `Agent may be looping (${pct(looping)})` };
  if (irreversible >= t.irreversibleAsk) return { decision: 'ask', reason: `Possibly irreversible (${pct(irreversible)})` };
  if (inScope < t.inScopeMin) return { decision: 'ask', reason: `Drifts out of the task's scope (${pct(inScope)} in scope)` };
  return { decision: 'allow', reason: `On task (${pct(inScope)}), reversible, no loop` };
}
