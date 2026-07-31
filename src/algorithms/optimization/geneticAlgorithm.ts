// src/algorithms/optimization/geneticAlgorithm.ts
import type { VisualizationState, AlgorithmGenerator, Point } from '../../core/types';

export const GENETIC_ALGORITHM_INFO = {
  name: 'Genetic Algorithm',
  description: 'A population-based optimization inspired by natural selection. Individuals are selected based on fitness, recombine via crossover, and mutate to explore the landscape, converging on high-fitness regions.',
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

// Crossover: Blend two parents
const crossover = (p1: Point, p2: Point): Point => {
  const alpha = Math.random();
  return {
    x: p1.x * alpha + p2.x * (1 - alpha),
    y: p1.y * alpha + p2.y * (1 - alpha),
  };
};

// Mutation: Add Gaussian noise
const mutate = (p: Point, rate: number, range: number): Point => {
  if (Math.random() < rate) {
    p.x += (Math.random() - 0.5) * 0.5;
    p.y += (Math.random() - 0.5) * 0.5;
  }
  return clampPoint(p, range);
};

export function* geneticAlgorithmGenerator(
  popSize: number = 50,
  mutationRate: number = 0.1,
  range: number = 6,
  fitnessFunction: (x: number, y: number) => number = fitnessFn
): AlgorithmGenerator {
  fitnessFn = fitnessFunction;
  const rangeVal = range;
  const generations = 100; // Fixed for now, but could be made configurable

  // ─── Initialize population ───
  let population: Point[] = Array.from({ length: popSize }, () => randomPoint(rangeVal));

  for (let gen = 0; gen < generations; gen++) {
    // ─── Evaluate fitness ───
    const fitnesses = population.map(p => fitnessFn(p.x, p.y));
    const bestIdx = fitnesses.indexOf(Math.max(...fitnesses));
    const best = population[bestIdx];
    const bestFitness = fitnesses[bestIdx];

    // ─── Yield current state ───
    yield {
      type: 'scatter',
      data: population,
      highlights: { coordinates: [best] },
      metadata: {
        generation: gen + 1,
        fitness: bestFitness,
        action: `Gen ${gen + 1}/${generations} | Best: ${bestFitness.toFixed(4)}`,
      },
    };

    // ─── Selection (Tournament) ───
    const nextPopulation: Point[] = [];
    // Elitism: keep the best
    nextPopulation.push({ ...best });

    while (nextPopulation.length < popSize) {
      // Tournament selection: pick 3 random individuals, keep the fittest
      const tournament = () => {
        const idx1 = Math.floor(Math.random() * popSize);
        const idx2 = Math.floor(Math.random() * popSize);
        const idx3 = Math.floor(Math.random() * popSize);
        const f1 = fitnesses[idx1];
        const f2 = fitnesses[idx2];
        const f3 = fitnesses[idx3];
        if (f1 >= f2 && f1 >= f3) return population[idx1];
        if (f2 >= f1 && f2 >= f3) return population[idx2];
        return population[idx3];
      };

      const parent1 = tournament();
      const parent2 = tournament();
      let child = crossover(parent1, parent2);
      child = mutate(child, mutationRate, rangeVal);
      nextPopulation.push(child);
    }

    population = nextPopulation;
  }

  // ─── Final yield ───
  const finalFitnesses = population.map(p => fitnessFn(p.x, p.y));
  const bestIdx = finalFitnesses.indexOf(Math.max(...finalFitnesses));
  const best = population[bestIdx];
  const bestFitness = finalFitnesses[bestIdx];
  yield {
    type: 'scatter',
    data: population,
    highlights: { coordinates: [best] },
    metadata: {
      generation: generations,
      fitness: bestFitness,
      action: `✅ Complete! Best fitness: ${bestFitness.toFixed(4)}`,
      final: true,
    },
  };
}