// src/algorithms/optimization/particleSwarm.ts
import type { VisualizationState, AlgorithmGenerator, Point } from '../../core/types';

export const PARTICLE_SWARM_INFO = {
  name: 'Particle Swarm Optimization',
  description: 'A swarm intelligence algorithm where particles move through the landscape, influenced by their own best position and the global best. It efficiently converges on high-fitness regions.',
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

type Particle = {
  position: Point;
  velocity: Point;
  bestPosition: Point;
  bestFitness: number;
};

export function* particleSwarmGenerator(
  popSize: number = 50,
  inertia: number = 0.7,
  cognitive: number = 1.4,
  social: number = 1.4,
  range: number = 6,
  fitnessFunction: (x: number, y: number) => number = fitnessFn
): AlgorithmGenerator {
  fitnessFn = fitnessFunction;
  const rangeVal = range;
  const generations = 100;

  // ─── Initialize particles ───
  let particles: Particle[] = [];
  let globalBest: Point | null = null;
  let globalBestFitness = -Infinity;

  for (let i = 0; i < popSize; i++) {
    const pos = randomPoint(rangeVal);
    const fitness = fitnessFn(pos.x, pos.y);
    const particle: Particle = {
      position: { ...pos },
      velocity: { x: (Math.random() - 0.5) * 0.5, y: (Math.random() - 0.5) * 0.5 },
      bestPosition: { ...pos },
      bestFitness: fitness,
    };
    particles.push(particle);
    if (fitness > globalBestFitness) {
      globalBestFitness = fitness;
      globalBest = { ...pos };
    }
  }

  for (let gen = 0; gen < generations; gen++) {
    // ─── Update particles ───
    for (const p of particles) {
      // Update velocity
      const r1 = Math.random();
      const r2 = Math.random();
      p.velocity.x = inertia * p.velocity.x +
        cognitive * r1 * (p.bestPosition.x - p.position.x) +
        social * r2 * (globalBest!.x - p.position.x);
      p.velocity.y = inertia * p.velocity.y +
        cognitive * r1 * (p.bestPosition.y - p.position.y) +
        social * r2 * (globalBest!.y - p.position.y);

      // Clamp velocity to prevent wild jumps
      const maxVel = 0.5;
      p.velocity.x = Math.min(maxVel, Math.max(-maxVel, p.velocity.x));
      p.velocity.y = Math.min(maxVel, Math.max(-maxVel, p.velocity.y));

      // Update position
      p.position.x += p.velocity.x;
      p.position.y += p.velocity.y;
      p.position = clampPoint(p.position, rangeVal);

      // Evaluate
      const fitness = fitnessFn(p.position.x, p.position.y);
      if (fitness > p.bestFitness) {
        p.bestFitness = fitness;
        p.bestPosition = { ...p.position };
      }
      if (fitness > globalBestFitness) {
        globalBestFitness = fitness;
        globalBest = { ...p.position };
      }
    }

    // ─── Yield state ───
    const positions = particles.map(p => p.position);
    yield {
      type: 'scatter',
      data: positions,
      highlights: { coordinates: globalBest ? [globalBest] : [] },
      metadata: {
        generation: gen + 1,
        fitness: globalBestFitness,
        action: `Gen ${gen + 1}/${generations} | Best: ${globalBestFitness.toFixed(4)}`,
      },
    };
  }

  // ─── Final yield ───
  const positions = particles.map(p => p.position);
  yield {
    type: 'scatter',
    data: positions,
    highlights: { coordinates: globalBest ? [globalBest] : [] },
    metadata: {
      generation: generations,
      fitness: globalBestFitness,
      action: `✅ Complete! Best fitness: ${globalBestFitness.toFixed(4)}`,
      final: true,
    },
  };
}