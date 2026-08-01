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

type CoolingSchedule = 'fast' | 'medium' | 'slow';

export function* simulatedAnnealingGenerator(
  initialTemp: number = 100,
  schedule: CoolingSchedule = 'medium',
  range: number = 6,
  fitnessFunction: (x: number, y: number) => number = fitnessFn
): AlgorithmGenerator {
  fitnessFn = fitnessFunction;
  const rangeVal = range;

  const coolingFactors: Record<CoolingSchedule, number> = {
    fast: 0.85,
    medium: 0.95,
    slow: 0.99,
  };
  const coolingFactor = coolingFactors[schedule];

  let current = randomPoint(rangeVal);
  let currentFitness = fitnessFn(current.x, current.y);
  let best = { ...current };
  let bestFitness = currentFitness;
  let bestStep = 0;
  let temperature = initialTemp;
  let step = 0;

  const visited: Point[] = [current];

  yield {
    type: 'scatter',
    data: visited,
    highlights: { coordinates: [best] },
    metadata: {
      generation: 0,
      fitness: bestFitness,
      action: `Temp: ${temperature.toFixed(1)} | Best found ${bestFitness.toFixed(4)} at step ${bestStep}`,
    },
  };

  while (temperature > 0.01 && step < 1000) {
    step++;

    const stepSize = temperature / 100 * 0.5 + 0.05;
    let candidate = {
      x: current.x + (Math.random() - 0.5) * stepSize * 2,
      y: current.y + (Math.random() - 0.5) * stepSize * 2,
    };
    candidate = clampPoint(candidate, rangeVal);

    const candidateFitness = fitnessFn(candidate.x, candidate.y);
    const delta = candidateFitness - currentFitness;

    let accepted = false;
    if (delta > 0 || Math.random() < Math.exp(delta / temperature)) {
      current = candidate;
      currentFitness = candidateFitness;
      accepted = true;
      visited.push(current);
    }

    if (currentFitness > bestFitness) {
      best = { ...current };
      bestFitness = currentFitness;
      bestStep = step;
    }

    temperature *= coolingFactor;

    if (step % 2 === 0 || accepted) {
      const highlights = [best];
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
          action: `Temp: ${temperature.toFixed(1)} | Best found ${bestFitness.toFixed(4)} at step ${bestStep}`,
        },
      };
    }
  }

  yield {
    type: 'scatter',
    data: visited,
    highlights: { coordinates: [best] },
    metadata: {
      generation: step,
      fitness: bestFitness,
      action: `✅ Complete! Best found ${bestFitness.toFixed(4)} at step ${bestStep}`,
      final: true,
    },
  };
}