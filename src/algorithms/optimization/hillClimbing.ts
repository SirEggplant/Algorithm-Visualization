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

export function* hillClimbingGenerator(
  stepSize: number = 0.15,
  restarts: number = 1,
  range: number = 6,
  scale: number = 1.8,
  fitnessFunction: (x: number, y: number) => number = fitnessFn
): AlgorithmGenerator {
  const rangeVal = range;
  fitnessFn = fitnessFunction;

  const allPeaks: Point[] = [];
  let bestOverall: Point | null = null;
  let bestOverallFitness = -Infinity;
  let bestOverallStep = 0;
  let allVisitedPoints: Point[] = [];
  let globalStepCount = 0;

  for (let restart = 0; restart < restarts; restart++) {
    let current = randomPoint(rangeVal);
    let currentFitness = fitnessFn(current.x, current.y);
    let improved = true;

    const climbPath: Point[] = [current];
    let localStepCount = 0;

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
        generation: 0,
        fitness: bestOverallFitness,
        action: restarts > 1
          ? `Restart ${restart + 1}/${restarts} | Starting`
          : `Starting climb`,
      },
    };

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

        const stepHighlights: Point[] = [];
        if (bestOverall) stepHighlights.push(bestOverall);
        for (const peak of allPeaks) {
          if (peak !== bestOverall) stepHighlights.push(peak);
        }
        stepHighlights.push(current);

        yield {
          type: 'scatter',
          data: allVisitedPoints.concat(climbPath),
          highlights: { coordinates: stepHighlights },
          metadata: {
            generation: localStepCount,
            fitness: bestOverallFitness,
            action: restarts > 1
              ? `Restart ${restart + 1}/${restarts} | Step ${localStepCount} | Peak: ${currentFitness.toFixed(4)}`
              : `Step ${localStepCount} | Peak: ${currentFitness.toFixed(4)}`,
          },
        };
      }
    }

    allPeaks.push(current);
    allVisitedPoints = allVisitedPoints.concat(climbPath);

    if (currentFitness > bestOverallFitness) {
      bestOverallFitness = currentFitness;
      bestOverall = current;
      bestOverallStep = globalStepCount;
    }

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
          generation: localStepCount,
          fitness: bestOverallFitness,
          action: `Restart ${restart + 1}/${restarts} complete! Peak: ${currentFitness.toFixed(4)}`,
        },
      };
    }
  }

  const finalHighlights: Point[] = [];
  if (bestOverall) finalHighlights.push(bestOverall);
  for (const peak of allPeaks) {
    if (peak !== bestOverall) finalHighlights.push(peak);
  }

  const completionMessage = restarts > 1
    ? `✅ All ${restarts} restarts complete! Best found ${bestOverallFitness.toFixed(4)} at step ${bestOverallStep}`
    : `✅ Stuck at local peak! Best found ${bestOverallFitness.toFixed(4)} at step ${bestOverallStep}`;

  yield {
    type: 'scatter',
    data: allVisitedPoints,
    highlights: { coordinates: finalHighlights },
    metadata: {
      generation: globalStepCount,
      fitness: bestOverallFitness,
      action: completionMessage,
      final: true,
    },
  };
}