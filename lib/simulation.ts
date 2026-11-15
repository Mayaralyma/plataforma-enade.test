export type SimulationAnswerInput = {
  id: string;
  selected: string | null;
  snapshot: { correctOption?: string | null; annulled?: boolean } | null;
};

export type SimulationWithSnapshots = {
  status: string;
  answers: Array<Record<string, unknown> & { snapshot: unknown }>;
};

export function sanitizeSimulationForStudent<T extends SimulationWithSnapshots>(simulation: T): T {
  if (simulation.status === "FINISHED") return simulation;
  return {
    ...simulation,
    answers: simulation.answers.map((answer) => {
      const { snapshot, ...rest } = answer;
      if (!snapshot || typeof snapshot !== "object") return { ...rest, snapshot } as T["answers"][number];
      const safeSnapshot = { ...(snapshot as Record<string, unknown>) };
      delete safeSnapshot.correctOption;
      return { ...rest, snapshot: safeSnapshot } as T["answers"][number];
    }),
  };
}

export function calculateSimulationResult(answers: SimulationAnswerInput[]) {
  let score = 0;
  let total = 0;
  const scoredAnswers = answers.map((answer) => {
    const snapshot = answer.snapshot;
    const annulled = Boolean(snapshot?.annulled);
    const isCorrect = !annulled && Boolean(answer.selected && snapshot?.correctOption === answer.selected);
    if (!annulled) {
      total++;
      if (isCorrect) score++;
    }
    return { id: answer.id, isCorrect };
  });
  return { score, total, answers: scoredAnswers };
}
