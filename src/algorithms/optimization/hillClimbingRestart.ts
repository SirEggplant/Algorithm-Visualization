// src/algorithms/optimization/hillClimbingRestart.ts
import type { VisualizationState, AlgorithmGenerator, Point } from '../../core/types';

export const HILL_CLIMBING_RESTART_INFO = {
  name: 'Hill Climbing with Random Restarts',
  description: 'A greedy local search that runs Hill Climbing multiple times from different random starting positions. Each run climbs to a local peak. The best peak found across all runs is the final result. Effectively explores more of the landscape than basic Hill Climbing.',
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

export function* hillClimbingRestartGenerator(): AlgorithmGenerator {
  const RESTARTS = 20;
  const STEP_SIZE = 0.15;
  const MAX_STEPS_PER_RESTART = 80;

  const allPeaks: Point[] = [];
  let bestOverall: Point | null = null;
  let bestOverallFitness = -Infinity;
  let allVisitedPoints: Point[] = [];

  for (let restart = 0; restart < RESTARTS; restart++) {
    let current = randomPoint();
    let currentFitness = fitnessFunction(current.x, current.y);
    let steps = 0;
    let improved = true;

    const climbPath: Point[] = [current];

    while (improved && steps < MAX_STEPS_PER_RESTART) {
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
        climbPath.push(current);
        improved = true;
      }
    }

    // Record the peak found
    allPeaks.push(current);
    allVisitedPoints = allVisitedPoints.concat(climbPath);

    if (currentFitness > bestOverallFitness) {
      bestOverallFitness = currentFitness;
      bestOverall = current;
    }

    // Yield after each restart
    const highlights: Point[] = [];
    if (bestOverall) highlights.push(bestOverall);
    for (const peak of allPeaks) {
      if (peak !== bestOverall) highlights.push(peak);
    }

    yield {
      type: 'scatter',
      data: allVisitedPoints,
      highlights: { coordinates: highlights },
      metadata: {
        generation: restart + 1,
        fitness: bestOverallFitness,
        action: `Restart ${restart + 1}/${RESTARTS} | Best: ${bestOverallFitness.toFixed(4)}`,
      },
    };
  }

  // Final state
  yield {
    type: 'scatter',
    data: allVisitedPoints,
    highlights: { coordinates: bestOverall ? [bestOverall] : [] },
    metadata: {
      generation: RESTARTS,
      fitness: bestOverallFitness,
      action: `✅ Global peak found! Fitness: ${bestOverallFitness.toFixed(4)}`,
    },
  };
}