// src/algorithms/optimization/hillClimbing.ts
import type { VisualizationState, AlgorithmGenerator, Point } from '../../core/types';

export const HILL_CLIMBING_INFO = {
  name: 'Hill Climbing (Basic)',
  description: 'A greedy local search that starts from a random point and repeatedly moves to the best neighboring position with higher fitness. Gets stuck on the first local peak it finds, often missing the global maximum.',
  bestCase: 'O(1)',
  avgCase: 'O(n)',
  worstCase: 'O(∞)',
  spaceComplexity: 'O(1)',
};

const fitnessFunction = (x: number, y: number): number => {
  return Math.sin(x) * Math.cos(y) * Math.exp(-Math.sqrt(x * x + y * y) / 4);
};

const randomPoint = (): Point => ({
  x: (Math.random() - 0.5) * 10,
  y: (Math.random() - 0.5) * 10,
});

const clampPoint = (p: Point): Point => ({
  x: Math.min(6, Math.max(-6, p.x)),
  y: Math.min(6, Math.max(-6, p.y)),
});

export function* hillClimbingGenerator(): AlgorithmGenerator {
  const STEP_SIZE = 0.15;
  const MAX_STEPS = 200;

  // 1. Start at a random position
  let current = randomPoint();
  let currentFitness = fitnessFunction(current.x, current.y);
  let steps = 0;
  let improved = true;

  const path: Point[] = [current];

  // 2. Greedy ascent until stuck
  while (improved && steps < MAX_STEPS) {
    improved = false;
    steps++;

    const directions = [
      { dx: STEP_SIZE, dy: 0 },
      { dx: STEP_SIZE, dy: STEP_SIZE },
      { dx: 0, dy: STEP_SIZE },
      { dx: -STEP_SIZE, dy: STEP_SIZE },
      { dx: -STEP_SIZE, dy: 0 },
      { dx: -STEP_SIZE, dy: -STEP_SIZE },
      { dx: 0, dy: -STEP_SIZE },
      { dx: STEP_SIZE, dy: -STEP_SIZE },
    ];

    let bestNeighbor: Point | null = null;
    let bestNeighborFitness = -Infinity;

    for (const dir of directions) {
      const candidate = clampPoint({
        x: current.x + dir.dx,
        y: current.y + dir.dy,
      });
      const fitness = fitnessFunction(candidate.x, candidate.y);

      if (fitness > bestNeighborFitness) {
        bestNeighborFitness = fitness;
        bestNeighbor = candidate;
      }
    }

    if (bestNeighbor && bestNeighborFitness > currentFitness) {
      current = bestNeighbor;
      currentFitness = bestNeighborFitness;
      path.push(current);
      improved = true;
    }

    // Yield after each step so the user sees the climb
    yield {
      type: 'scatter',
      data: path,
      highlights: {
        coordinates: [current], // Highlight current position
      },
      metadata: {
        generation: steps,
        fitness: currentFitness,
        action: `Step ${steps} | Fitness: ${currentFitness.toFixed(4)}`,
      },
    };
  }

  // Final state: stuck at a local peak
  yield {
    type: 'scatter',
    data: path,
    highlights: {
      coordinates: [current], // Best (only) peak found
    },
    metadata: {
      generation: steps,
      fitness: currentFitness,
      action: `✅ Stuck at local peak! Fitness: ${currentFitness.toFixed(4)}`,
    },
  };
}