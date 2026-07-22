// src/algorithms/sorting/bubbleSort.ts
import type { VisualizationState, AlgorithmGenerator } from '../../core/types';

export const BUBBLE_SORT_INFO = {
  name: 'Bubble Sort',
  description: 'Repeatedly steps through the list, compares adjacent elements, and swaps them if they are in the wrong order. The process repeats until no swaps are needed, meaning the list is sorted. It is known for its simplicity but is inefficient for large lists.',
  bestCase: 'O(n)',
  avgCase: 'O(n²)',
  worstCase: 'O(n²)',
  spaceComplexity: 'O(1)',
};

export function* bubbleSortGenerator(input: number[]): AlgorithmGenerator {
  const arr = [...input];
  let comparisons = 0;
  let swaps = 0;
  const sortedIndices: number[] = [];

  for (let i = 0; i < arr.length; i++) {
    for (let j = 0; j < arr.length - i - 1; j++) {
      comparisons++;

      // Step 1: Comparing (Yellow)
      yield {
        type: 'array',
        data: arr,
        highlights: {
          comparingIndices: [j, j + 1],
          sortedIndices: sortedIndices,
        },
        metadata: {
          comparisons,
          swaps,
          action: `Comparing ${arr[j]} and ${arr[j + 1]}`,
        },
      };

      if (arr[j] > arr[j + 1]) {
        swaps++;
        // Step 2: Swapping (Red)
        [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];

        yield {
          type: 'array',
          data: arr,
          highlights: {
            swappingIndices: [j, j + 1],
            sortedIndices: sortedIndices,
          },
          metadata: {
            comparisons,
            swaps,
            action: `Swapped ${arr[j + 1]} and ${arr[j]}`,
          },
        };
      }
    }

    // Step 3: Mark the last element as sorted (Green)
    const sortedIndex = arr.length - 1 - i;
    if (!sortedIndices.includes(sortedIndex)) {
      sortedIndices.push(sortedIndex);
    }

    yield {
      type: 'array',
      data: arr,
      highlights: {
        sortedIndices: sortedIndices,
      },
      metadata: {
        comparisons,
        swaps,
        action: `Sorted element at position ${sortedIndex}`,
      },
    };
  }

  // Final state: fully sorted (All Green)
  yield {
    type: 'array',
    data: arr,
    highlights: {
      sortedIndices: arr.map((_, i) => i),
    },
    metadata: {
      comparisons,
      swaps,
      action: 'Sort complete!',
    },
  };
}