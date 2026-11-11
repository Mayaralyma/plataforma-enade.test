import { describe, expect, it } from "vitest";
import { calculateSimulationResult } from "../lib/simulation";

describe("correção de simulados", () => {
it("scores correct answers and excludes annulled questions from the denominator", () => {
  const result = calculateSimulationResult([
    { id: "correct", selected: "B", snapshot: { correctOption: "B" } },
    { id: "wrong", selected: "A", snapshot: { correctOption: "C" } },
    { id: "annulled", selected: null, snapshot: { correctOption: null, annulled: true } },
  ]);

  expect(result.score).toBe(1);
  expect(result.total).toBe(2);
  expect(result.answers).toEqual([
    { id: "correct", isCorrect: true },
    { id: "wrong", isCorrect: false },
    { id: "annulled", isCorrect: false },
  ]);
});

it("counts an unanswered non-annulled question as incorrect", () => {
  const result = calculateSimulationResult([
    { id: "unanswered", selected: null, snapshot: { correctOption: "D" } },
  ]);

  expect(result.score).toBe(0);
  expect(result.total).toBe(1);
  expect(result.answers[0].isCorrect).toBe(false);
});

it("allows an all-annulled exam without inventing valid questions", () => {
  const result = calculateSimulationResult([
    { id: "annulled-1", selected: "A", snapshot: { annulled: true } },
  ]);

  expect(result.score).toBe(0);
  expect(result.total).toBe(0);
});
});
