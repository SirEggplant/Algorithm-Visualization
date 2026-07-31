// src/algorithms/optimization/simulatedAnnealing.ts
import type { VisualizationState, AlgorithmGenerator, Point } from '../../core/types';

export const SIMULATED_ANNEALING_INFO = {
  name: 'Simulated Annealing',
  description: 'A probabilistic local search that mimics the cooling of metals. It accepts worse moves with a probability that decreases over time, allowing it to escape local peaks and find the global maximum.',
  bestCase: 'O(1)',
  avgCase: 'O(n)',
  worstCase: 'O(∞)',
  spaceComplexity: 'O(1)',
};

let fitnessFn: (x: number, y: number) => number = (x, y) =>
  Math.sin(x) * Math.cos(y) * Math.exp(-Math.sqrt(x * x + y * y) / 4);

const randomPoint = (range: number): Point => ({
  x: (Math.random() - 0.5) * range * 2,
  y: (Math.random() - 0.5) * range * 2,
});

const clampPoint = (p: Point, range: number): Point => ({
  x: Math.min(range, Math.max(-range, p.x)),
  y: Math.min(range, Math.max(-range, p.y)),
});

// Cooling schedule types
type CoolingSchedule = 'fast' | 'medium' | 'slow';

export function* simulatedAnnealingGenerator(
  initialTemp: number = 100,
  schedule: CoolingSchedule = 'medium',
  range: number = 6,
  fitnessFunction: (x: number, y: number) => number = fitnessFn
): AlgorithmGenerator {
  fitnessFn = fitnessFunction;
  const rangeVal = range;

  // ─── Cooling schedule factors ───
  const coolingFactors: Record<CoolingSchedule, number> = {
    fast: 0.85,
    medium: 0.95,
    slow: 0.99,
  };
  const coolingFactor = coolingFactors[schedule];

  // ─── Initial state ───
  let current = randomPoint(rangeVal);
  let currentFitness = fitnessFn(current.x, current.y);
  let best = { ...current };
  let bestFitness = currentFitness;
  let temperature = initialTemp;
  let step = 0;

  const path: Point[] = [current];
  const visited: Point[] = [current];

  // ─── Yield initial state ───
  yield {
    type: 'scatter',
    data: visited,
    highlights: { coordinates: [best] },
    metadata: {
      generation: step,
      fitness: bestFitness,
      action: `Temp: ${temperature.toFixed(1)} | Fitness: ${currentFitness.toFixed(4)}`,
    },
  };

  // ─── Main loop ───
  while (temperature > 0.01 && step < 1000) {
    step++;

    // ─── Generate neighbor (random step) ───
    const stepSize = temperature / 100 * 0.5 + 0.05;
    let candidate = {
      x: current.x + (Math.random() - 0.5) * stepSize * 2,
      y: current.y + (Math.random() - 0.5) * stepSize * 2,
    };
    candidate = clampPoint(candidate, rangeVal);

    const candidateFitness = fitnessFn(candidate.x, candidate.y);
    const delta = candidateFitness - currentFitness;

    // ─── Accept or reject ───
    let accepted = false;
    if (delta > 0 || Math.random() < Math.exp(delta / temperature)) {
      current = candidate;
      currentFitness = candidateFitness;
      accepted = true;
      visited.push(current);
    }

    // ─── Update best ───
    if (currentFitness > bestFitness) {
      best = { ...current };
      bestFitness = currentFitness;
    }

    // ─── Cool down ───
    temperature *= coolingFactor;

    // ─── Yield every few steps ───
    if (step % 2 === 0 || accepted) {
      const highlights = [best];
      // Highlight current position (the gold star)
      // We'll show current as a gold star only if it's better? Actually we want to show best as gold and current as another color.
      // We'll push current as an extra highlight (will be drawn as a red dot if not the best)
      if (current !== best) {
        highlights.push(current);
      }
      yield {
        type: 'scatter',
        data: visited,
        highlights: { coordinates: highlights },
        metadata: {
          generation: step,
          fitness: bestFitness,
          action: `Temp: ${temperature.toFixed(1)} | Best: ${bestFitness.toFixed(4)}`,
        },
      };
    }
  }

  // ─── Final yield ───
  yield {
    type: 'scatter',
    data: visited,
    highlights: { coordinates: [best] },
    metadata: {
      generation: step,
      fitness: bestFitness,
      action: `✅ Complete! Best fitness: ${bestFitness.toFixed(4)}`,
      final: true,
    },
  };
}