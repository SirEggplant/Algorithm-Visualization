// src/algorithms/optimization/hillClimbingRestart.ts
import type { VisualizationState, AlgorithmGenerator, Point } from '../../core/types';

export const HILL_CLIMBING_RESTART_INFO = {
  name: 'Hill Climbing with Random Restarts',
  description: 'A greedy local search that runs Hill Climbing multiple times from different random starting positions. Each run climbs to a local peak. The best peak found across all runs is the final result.',
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

export function* hillClimbingRestartGenerator(
  stepSize: number = 0.15,
  restarts: number = 20,
  range: number = 6,
  scale: number = 1.8,
  fitnessFunction: (x: number, y: number) => number = fitnessFn
): AlgorithmGenerator {
  const rangeVal = range;
  fitnessFn = fitnessFunction;

  const allPeaks: Point[] = [];
  let bestOverall: Point | null = null;
  let bestOverallFitness = -Infinity;
  let allVisitedPoints: Point[] = [];
  let globalStepCount = 0;

  for (let restart = 0; restart < restarts; restart++) {
    let current = randomPoint(rangeVal);
    let currentFitness = fitnessFn(current.x, current.y);
    let improved = true;

    const climbPath: Point[] = [current];
    let localStepCount = 0;

    // ─── Initial state: show the starting point ───
    const initialHighlights: Point[] = [];
    if (bestOverall) initialHighlights.push(bestOverall);
    for (const peak of allPeaks) {
      if (peak !== bestOverall) initialHighlights.push(peak);
    }
    yield {
      type: 'scatter',
      data: allVisitedPoints.concat(climbPath),
      highlights: { coordinates: initialHighlights.concat([current]) },
      metadata: {
        generation: restart + 1,
        fitness: bestOverallFitness,
        action: `Restart ${restart + 1}/${restarts} | Step ${localStepCount}`,
      },
    };

    // ─── Climb step‑by‑step until local peak ───
    while (improved) {
      improved = false;
      localStepCount++;
      globalStepCount++;

      const directions = [
        { dx: stepSize, dy: 0 },
        { dx: stepSize, dy: stepSize },
        { dx: 0, dy: stepSize },
        { dx: -stepSize, dy: stepSize },
        { dx: -stepSize, dy: 0 },
        { dx: -stepSize, dy: -stepSize },
        { dx: 0, dy: -stepSize },
        { dx: stepSize, dy: -stepSize },
      ];

      let bestNeighbor: Point | null = null;
      let bestNeighborFitness = -Infinity;

      for (const dir of directions) {
        const candidate = clampPoint({
          x: current.x + dir.dx,
          y: current.y + dir.dy,
        }, rangeVal);
        const fitness = fitnessFn(candidate.x, candidate.y);

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

        // ─── YIELD AFTER EACH SUCCESSFUL STEP ───
        const stepHighlights: Point[] = [];
        if (bestOverall) stepHighlights.push(bestOverall);
        for (const peak of allPeaks) {
          if (peak !== bestOverall) stepHighlights.push(peak);
        }
        // Add current position as the active point (will be gold)
        stepHighlights.push(current);

        yield {
          type: 'scatter',
          data: allVisitedPoints.concat(climbPath),
          highlights: { coordinates: stepHighlights },
          metadata: {
            generation: restart + 1,
            fitness: bestOverallFitness,
            action: `Restart ${restart + 1}/${restarts} | Step ${localStepCount} | Fitness: ${currentFitness.toFixed(4)}`,
          },
        };
      }
    }

    // ─── Reached a local peak ───
    allPeaks.push(current);
    allVisitedPoints = allVisitedPoints.concat(climbPath);

    if (currentFitness > bestOverallFitness) {
      bestOverallFitness = currentFitness;
      bestOverall = current;
    }

    // ─── Yield at the end of the restart, showing all peaks ───
    const restartHighlights: Point[] = [];
    if (bestOverall) restartHighlights.push(bestOverall);
    for (const peak of allPeaks) {
      if (peak !== bestOverall) restartHighlights.push(peak);
    }

    yield {
      type: 'scatter',
      data: allVisitedPoints,
      highlights: { coordinates: restartHighlights },
      metadata: {
        generation: restart + 1,
        fitness: bestOverallFitness,
        action: `Restart ${restart + 1}/${restarts} complete! Best: ${bestOverallFitness.toFixed(4)}`,
      },
    };
  }

  // ─── FINAL YIELD ───
  const finalHighlights: Point[] = [];
  if (bestOverall) finalHighlights.push(bestOverall);
  for (const peak of allPeaks) {
    if (peak !== bestOverall) finalHighlights.push(peak);
  }

  yield {
    type: 'scatter',
    data: allVisitedPoints,
    highlights: { coordinates: finalHighlights },
    metadata: {
      generation: restarts,
      fitness: bestOverallFitness,
      action: `✅ Complete! Global peak found! Fitness: ${bestOverallFitness.toFixed(4)}`,
    },
  };
}