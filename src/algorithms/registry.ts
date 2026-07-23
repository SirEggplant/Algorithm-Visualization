// src/algorithms/registry.ts
import type { AlgorithmGenerator } from '../core/types';

// ─── Sorting Algorithms ───
import { bubbleSortGenerator, BUBBLE_SORT_INFO } from './sorting/bubbleSort';
import { mergeSortGenerator, MERGE_SORT_INFO } from './sorting/mergeSort';
import { quickSortGenerator, QUICK_SORT_INFO } from './sorting/quickSort';
import { insertionSortGenerator, INSERTION_SORT_INFO } from './sorting/insertionSort';

// ─── Optimization Algorithms ───
import { hillClimbingGenerator } from './hillClimbing/peakFinder';

// ─── Types ───
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
  },
  optimization: {
    hillClimbing: {
      id: 'hillClimbing',
      displayName: 'Hill Climbing',
      generator: hillClimbingGenerator as any,
      info: {
        name: 'Hill Climbing',
        description: 'A greedy local search algorithm that iteratively moves to a neighboring solution with higher fitness. Can get stuck in local maxima.',
        bestCase: 'O(1)',
        avgCase: 'O(n)',
        worstCase: 'O(∞)',
        spaceComplexity: 'O(1)',
      },
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