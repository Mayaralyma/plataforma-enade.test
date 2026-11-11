export type SimulationAnswerInput = {
  id: string;
  selected: string | null;
  snapshot: { correctOption?: string | null; annulled?: boolean } | null;
};

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
