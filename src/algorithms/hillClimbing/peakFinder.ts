// src/algorithms/hillClimbing/hillClimbing.ts
import type { VisualizationState, AlgorithmGenerator, Point } from '../../core/types';

// The fitness function: f(x,y) = sin(x) * cos(y) * e^( -sqrt(x^2+y^2)/4 )
// This creates a beautiful "peak" with multiple local hills.
const fitnessFunction = (x: number, y: number): number => {
  return Math.sin(x) * Math.cos(y) * Math.exp(-Math.sqrt(x * x + y * y) / 4);
};

// Generate a random point within bounds
const randomPoint = (): Point => ({
  x: (Math.random() - 0.5) * 10, // -5 to 5
  y: (Math.random() - 0.5) * 10,
});

// Clamp a point to the bounds (-6 to 6)
const clampPoint = (p: Point): Point => ({
  x: Math.min(6, Math.max(-6, p.x)),
  y: Math.min(6, Math.max(-6, p.y)),
});

/**
 * Greedy Hill Climbing with Random Restarts
 * 
 * How it works:
 * 1. Start at a random position on the mountain.
 * 2. Check 8 neighboring positions (N, NE, E, SE, S, SW, W, NW).
 * 3. If any neighbor has higher fitness, move to the best neighbor.
 * 4. Repeat until no neighbor is better (reached a local peak).
 * 5. Record the found peak, then "restart" at a random new position.
 * 6. Continue for a fixed number of restarts.
 */
export function* hillClimbingGenerator(): AlgorithmGenerator {
  const RESTARTS = 20;           // Number of random restarts
  const STEP_SIZE = 0.15;        // How far to move each step
  const MAX_STEPS_PER_RESTART = 80; // Safety limit

  const allPeaks: Point[] = [];
  let bestOverall: Point | null = null;
  let bestOverallFitness = -Infinity;
  let visitedPoints: Point[] = [];

  for (let restart = 0; restart < RESTARTS; restart++) {
    // 1. Start at a random position
    let current = randomPoint();
    let currentFitness = fitnessFunction(current.x, current.y);
    let steps = 0;
    let improved = true;

    const climbPath: Point[] = [current];

    // 2. Greedy ascent (hill climbing)
    while (improved && steps < MAX_STEPS_PER_RESTART) {
      improved = false;
      steps++;

      const directions = [
        { dx: STEP_SIZE, dy: 0 },        // Right
        { dx: STEP_SIZE, dy: STEP_SIZE }, // Top-Right
        { dx: 0, dy: STEP_SIZE },        // Top
        { dx: -STEP_SIZE, dy: STEP_SIZE }, // Top-Left
        { dx: -STEP_SIZE, dy: 0 },       // Left
        { dx: -STEP_SIZE, dy: -STEP_SIZE }, // Bottom-Left
        { dx: 0, dy: -STEP_SIZE },       // Bottom
        { dx: STEP_SIZE, dy: -STEP_SIZE }, // Bottom-Right
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

    // 3. Record the peak found
    allPeaks.push(current);
    visitedPoints = visitedPoints.concat(climbPath);

    if (currentFitness > bestOverallFitness) {
      bestOverallFitness = currentFitness;
      bestOverall = current;
    }

    // 4. YIELD the current state for visualization
    const highlights: Point[] = [];
    if (bestOverall) highlights.push(bestOverall);
    for (const peak of allPeaks) {
      if (peak !== bestOverall) highlights.push(peak);
    }

    yield {
      type: 'scatter',
      data: visitedPoints,
      highlights: { coordinates: highlights },
      metadata: {
        generation: restart + 1,
        fitness: bestOverallFitness,
      },
    };
  }

  // Final yield
  yield {
    type: 'scatter',
    data: visitedPoints,
    highlights: { coordinates: bestOverall ? [bestOverall] : [] },
    metadata: {
      generation: RESTARTS,
      fitness: bestOverallFitness,
    },
  };
}