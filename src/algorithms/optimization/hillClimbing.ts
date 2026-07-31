// src/algorithms/optimization/hillClimbing.ts
import type { VisualizationState, AlgorithmGenerator, Point } from '../../core/types';

export const HILL_CLIMBING_INFO = {
  name: 'Hill Climbing',
  description: 'A greedy local search that starts from random points and repeatedly moves to the best neighboring position with higher fitness. With multiple restarts, it explores more of the landscape and is more likely to find the global peak.',
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

/**
 * Hill Climbing with configurable restarts.
 * 
 * @param stepSize - How far to move each step (default: 0.15)
 * @param restarts - Number of attempts (1 = basic, 5, 10, 20)
 * @param range - The bounds of the search space
 * @param scale - Vertical scaling of the terrain
 * @param fitnessFunction - The function to optimize
 */
export function* hillClimbingGenerator(
  stepSize: number = 0.15,
  restarts: number = 1,
  range: number = 6,
  scale: number = 1.8,
  fitnessFunction: (x: number, y: number) => number = fitnessFn
): AlgorithmGenerator {
  const rangeVal = range;
  fitnessFn = fitnessFunction;

  // ─── Store all peaks found across all restarts ───
  const allPeaks: Point[] = [];
  let bestOverall: Point | null = null;
  let bestOverallFitness = -Infinity;
  let allVisitedPoints: Point[] = [];
  let globalStepCount = 0;

  for (let restart = 0; restart < restarts; restart++) {
    // ─── Start at a random position ───
    let current = randomPoint(rangeVal);
    let currentFitness = fitnessFn(current.x, current.y);
    let improved = true;

    const climbPath: Point[] = [current];
    let localStepCount = 0;

    // ─── Show the starting point ───
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
        action: restarts > 1 
          ? `Restart ${restart + 1}/${restarts} | Starting`
          : `Starting climb`,
      },
    };

    // ─── Greedy ascent until stuck at a local peak ───
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

        // ─── Yield after each successful step ───
        const stepHighlights: Point[] = [];
        if (bestOverall) stepHighlights.push(bestOverall);
        for (const peak of allPeaks) {
          if (peak !== bestOverall) stepHighlights.push(peak);
        }
        // Add the current position (will be gold/red depending on best)
        stepHighlights.push(current);

        yield {
          type: 'scatter',
          data: allVisitedPoints.concat(climbPath),
          highlights: { coordinates: stepHighlights },
          metadata: {
            generation: restart + 1,
            fitness: bestOverallFitness,
            action: restarts > 1
              ? `Restart ${restart + 1}/${restarts} | Step ${localStepCount} | Fitness: ${currentFitness.toFixed(4)}`
              : `Step ${localStepCount} | Fitness: ${currentFitness.toFixed(4)}`,
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

    // ─── Yield at the end of this restart ───
    const restartHighlights: Point[] = [];
    if (bestOverall) restartHighlights.push(bestOverall);
    for (const peak of allPeaks) {
      if (peak !== bestOverall) restartHighlights.push(peak);
    }

    if (restarts > 1) {
      yield {
        type: 'scatter',
        data: allVisitedPoints,
        highlights: { coordinates: restartHighlights },
        metadata: {
          generation: restart + 1,
          fitness: bestOverallFitness,
          action: `Restart ${restart + 1}/${restarts} complete! Peak fitness: ${currentFitness.toFixed(4)}`,
        },
      };
    }
  }

  // ─── FINAL YIELD ───
  const finalHighlights: Point[] = [];
  if (bestOverall) finalHighlights.push(bestOverall);
  for (const peak of allPeaks) {
    if (peak !== bestOverall) finalHighlights.push(peak);
  }

  const completionMessage = restarts > 1
    ? `✅ All ${restarts} restarts complete! Best fitness: ${bestOverallFitness.toFixed(4)}`
    : `✅ Stuck at local peak! Fitness: ${bestOverallFitness.toFixed(4)}`;

  yield {
    type: 'scatter',
    data: allVisitedPoints,
    highlights: { coordinates: finalHighlights },
    metadata: {
      generation: restarts,
      fitness: bestOverallFitness,
      action: completionMessage,
      final: true, // 👈 Only on the very last yield
    },
  };
}