// src/algorithms/registry.ts
import type { AlgorithmGenerator } from '../core/types';

// ─── Sorting Algorithms ───
import { bubbleSortGenerator, BUBBLE_SORT_INFO } from './sorting/bubbleSort';
import { mergeSortGenerator, MERGE_SORT_INFO } from './sorting/mergeSort';
import { quickSortGenerator, QUICK_SORT_INFO } from './sorting/quickSort';
import { insertionSortGenerator, INSERTION_SORT_INFO } from './sorting/insertionSort';
import { timsortGenerator, TIMSORT_INFO } from './sorting/timSort';
import { introsortGenerator, INTROSORT_INFO } from './sorting/introSort';

// ─── Optimization Algorithms ───
import { hillClimbingGenerator, HILL_CLIMBING_INFO } from './optimization/hillClimbing';
import { simulatedAnnealingGenerator, SIMULATED_ANNEALING_INFO } from './optimization/simulatedAnnealing';
import { geneticAlgorithmGenerator, GENETIC_ALGORITHM_INFO } from './optimization/geneticAlgorithm';
import { particleSwarmGenerator, PARTICLE_SWARM_INFO } from './optimization/particleSwarm';// ─── Types ───
export type Feature = 'sorting' | 'optimization';

type AlgorithmEntry = {
  id: string;
  displayName: string;
  generator: (data: any) => AlgorithmGenerator;
  info?: {
    name: string;
    description: string;
    bestCase: string;
    avgCase: string;
    worstCase: string;
    spaceComplexity: string;
  };
};

// ─── The Master Registry ───
const algorithmRegistry: Record<Feature, Record<string, AlgorithmEntry>> = {
  sorting: {
    bubble: {
      id: 'bubble',
      displayName: 'Bubble Sort',
      generator: bubbleSortGenerator as any,
      info: BUBBLE_SORT_INFO,
    },
    merge: {
      id: 'merge',
      displayName: 'Merge Sort',
      generator: mergeSortGenerator as any,
      info: MERGE_SORT_INFO,
    },
    quick: {
      id: 'quick',
      displayName: 'Quick Sort',
      generator: quickSortGenerator as any,
      info: QUICK_SORT_INFO,
    },
    insertion: {
      id: 'insertion',
      displayName: 'Insertion Sort',
      generator: insertionSortGenerator as any,
      info: INSERTION_SORT_INFO,
    },
    timsort: {
      id: 'timsort',
      displayName: 'Timsort',
      generator: timsortGenerator as any,
      info: TIMSORT_INFO,
    },
    introsort: {
      id: 'introsort',
      displayName: 'Introsort',
      generator: introsortGenerator as any,
      info: INTROSORT_INFO,
    },
  },
  
  optimization: {
  hillClimbing: {
    id: 'hillClimbing',
    displayName: '⛰️ Hill Climbing',
    generator: hillClimbingGenerator as any,
    info: HILL_CLIMBING_INFO,
  },
  simulatedAnnealing: {
    id: 'simulatedAnnealing',
    displayName: '🔥 Simulated Annealing',
    generator: simulatedAnnealingGenerator as any,
    info: SIMULATED_ANNEALING_INFO,
  },
  geneticAlgorithm: {
    id: 'geneticAlgorithm',
    displayName: '🧬 Genetic Algorithm',
    generator: geneticAlgorithmGenerator as any,
    info: GENETIC_ALGORITHM_INFO,
  },
  particleSwarm: {
    id: 'particleSwarm',
    displayName: '🐝 Particle Swarm',
    generator: particleSwarmGenerator as any,
    info: PARTICLE_SWARM_INFO,
  },
},
  
};

// ─── Public Helpers ───
export const getAlgorithmIds = (feature: Feature): string[] => {
  return Object.keys(algorithmRegistry[feature] || {});
};

export const getAlgorithm = (feature: Feature, id: string): AlgorithmEntry | undefined => {
  return algorithmRegistry[feature]?.[id];
};

export const getGenerator = (feature: Feature, id: string, data: any) => {
  const entry = getAlgorithm(feature, id);
  return entry ? entry.generator(data) : null;
};

export const getDisplayName = (feature: Feature, id: string): string => {
  const entry = getAlgorithm(feature, id);
  return entry ? entry.displayName : id;
};

export const getInfo = (feature: Feature, id: string) => {
  const entry = getAlgorithm(feature, id);
  return entry ? entry.info : null;
};

export const getDefaultAlgorithm = (feature: Feature): string => {
  const ids = getAlgorithmIds(feature);
  return ids.length > 0 ? ids[0] : '';
};