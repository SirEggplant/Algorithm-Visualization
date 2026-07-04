// src/algorithms/genetic/peakFinder.ts
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

// Crossover: Blend two parents
const crossover = (p1: Point, p2: Point): Point => {
  const alpha = Math.random();
  return {
    x: p1.x * alpha + p2.x * (1 - alpha),
    y: p1.y * alpha + p2.y * (1 - alpha),
  };
};

// Mutation: Add small random noise
const mutate = (p: Point, rate: number): Point => {
  if (Math.random() < rate) {
    p.x += (Math.random() - 0.5) * 0.5;
    p.y += (Math.random() - 0.5) * 0.5;
  }
  return p;
};

export function* peakFinderGenerator(): AlgorithmGenerator {
  const POP_SIZE = 60;
  const GENERATIONS = 150;
  const MUTATION_RATE = 0.2;

  // 1. Initialize population
  let population: Point[] = Array.from({ length: POP_SIZE }, randomPoint);

  for (let gen = 0; gen < GENERATIONS; gen++) {
    // 2. Evaluate fitness
    const fitnesses = population.map((p) => fitnessFunction(p.x, p.y));
    const bestFitness = Math.max(...fitnesses);
    const bestIndex = fitnesses.indexOf(bestFitness);
    const bestPoint = population[bestIndex];

    // 3. YIELD the current state (This is what makes the animation!)
    yield {
      type: 'scatter',
      data: population,
      highlights: {
        coordinates: [bestPoint], // Highlight the absolute best
      },
      metadata: {
        generation: gen + 1,
        fitness: bestFitness,
      },
    };

    // 4. Create next generation (Tournament Selection + Crossover + Mutation)
    const nextPopulation: Point[] = [];

    // Elitism: Keep the absolute best solution
    nextPopulation.push({ ...bestPoint });

    while (nextPopulation.length < POP_SIZE) {
      // Tournament Selection (pick 3 random, keep the best)
      const tournament = () => {
        const idx1 = Math.floor(Math.random() * POP_SIZE);
        const idx2 = Math.floor(Math.random() * POP_SIZE);
        const idx3 = Math.floor(Math.random() * POP_SIZE);
        const f1 = fitnessFunction(population[idx1].x, population[idx1].y);
        const f2 = fitnessFunction(population[idx2].x, population[idx2].y);
        const f3 = fitnessFunction(population[idx3].x, population[idx3].y);
        if (f1 >= f2 && f1 >= f3) return population[idx1];
        if (f2 >= f1 && f2 >= f3) return population[idx2];
        return population[idx3];
      };

      const parent1 = tournament();
      const parent2 = tournament();
      let child = crossover(parent1, parent2);
      child = mutate(child, MUTATION_RATE);
      
      // Clamp to bounds (-6 to 6)
      child.x = Math.min(6, Math.max(-6, child.x));
      child.y = Math.min(6, Math.max(-6, child.y));
      nextPopulation.push(child);
    }

    population = nextPopulation;
  }

  // Final yield after all generations
  const fitnesses = population.map((p) => fitnessFunction(p.x, p.y));
  const bestFitness = Math.max(...fitnesses);
  const bestIndex = fitnesses.indexOf(bestFitness);
  yield {
    type: 'scatter',
    data: population,
    highlights: { coordinates: [population[bestIndex]] },
    metadata: { generation: GENERATIONS, fitness: bestFitness },
  };
}