// src/algorithms/sorting/bubbleSort.ts
import type { VisualizationState, AlgorithmGenerator } from '../../core/types';

export function* bubbleSortGenerator(input: number[]): AlgorithmGenerator {
  const arr = [...input];
  let comparisons = 0;
  let swaps = 0;

  for (let i = 0; i < arr.length; i++) {
    for (let j = 0; j < arr.length - i - 1; j++) {
      comparisons++;
      // Yield state for "Comparing" (highlight these two)
      yield {
        type: 'array',
        data: arr,
        highlights: { indices: [j, j + 1] },
        metadata: { comparisons, swaps }
      };

      if (arr[j] > arr[j + 1]) {
        swaps++;
        // Perform the swap
        [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
        // Yield state for "Just Swapped"
        yield {
          type: 'array',
          data: arr,
          highlights: { indices: [j, j + 1] },
          metadata: { comparisons, swaps }
        };
      }
    }
  }
  // Final state: fully sorted, no highlights
  yield {
    type: 'array',
    data: arr,
    highlights: { indices: [] },
    metadata: { comparisons, swaps }
  };
}