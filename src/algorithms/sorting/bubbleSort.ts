// src/features/sorting/algorithms/bubbleSort.ts
import type { VisualizationState, AlgorithmGenerator } from '../../core/types';

export function* bubbleSortGenerator(input: number[]): AlgorithmGenerator {
  const arr = [...input];
  let comparisons = 0;
  let swaps = 0;
  let step = 0;

  for (let i = 0; i < arr.length; i++) {
    for (let j = 0; j < arr.length - i - 1; j++) {
      step++;
      comparisons++;

      // Yield: Comparing
      yield {
        type: 'array',
        data: arr,
        highlights: { indices: [j, j + 1] },
        metadata: {
          comparisons,
          swaps,
          action: `Compared ${arr[j]} and ${arr[j + 1]}`,
        },
      };

      if (arr[j] > arr[j + 1]) {
        swaps++;
        // Perform the swap
        [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];

        // Yield: Swapped
        yield {
          type: 'array',
          data: arr,
          highlights: { indices: [j, j + 1] },
          metadata: {
            comparisons,
            swaps,
            action: `Swapped ${arr[j + 1]} and ${arr[j]}`,
          },
        };
      }
    }
  }

  // Final state: fully sorted
  yield {
    type: 'array',
    data: arr,
    highlights: { indices: [] },
    metadata: {
      comparisons,
      swaps,
      action: '✅ Sort complete!',
    },
  };
}