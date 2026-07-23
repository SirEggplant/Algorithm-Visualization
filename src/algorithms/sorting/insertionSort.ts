// src/algorithms/sorting/insertionSort.ts
import type { VisualizationState, AlgorithmGenerator } from '../../core/types';

// ─── Algorithm Info for the Details Popup ───
export const INSERTION_SORT_INFO = {
  name: 'Insertion Sort',
  description: 'Builds the final sorted array one element at a time by repeatedly inserting the next element into its correct position among the already sorted elements. Like sorting a hand of playing cards.',
  bestCase: 'O(n)',
  avgCase: 'O(n²)',
  worstCase: 'O(n²)',
  spaceComplexity: 'O(1)',
};

// ─── Insertion Sort Generator ───
export function* insertionSortGenerator(input: number[]): AlgorithmGenerator {
  const arr = [...input];
  const sortedIndices: Set<number> = new Set();

  // The first element is already sorted
  sortedIndices.add(0);
  yield {
    type: 'array',
    data: arr,
    highlights: {
      sortedIndices: Array.from(sortedIndices),
    },
    metadata: {
      action: `Element ${arr[0]} is already sorted`,
    },
  };

  for (let i = 1; i < arr.length; i++) {
    const key = arr[i];
    let j = i - 1;

    // 1. Highlight the element being inserted (key)
    yield {
      type: 'array',
      data: arr,
      highlights: {
        comparingIndices: [i],
        sortedIndices: Array.from(sortedIndices),
      },
      metadata: {
        action: `Inserting ${key}`,
      },
    };

    // 2. Compare and shift elements to the right
    while (j >= 0 && arr[j] > key) {
      // Show comparison (yellow) between key and arr[j]
      yield {
        type: 'array',
        data: arr,
        highlights: {
          comparingIndices: [j, i], // i is where key originated
          sortedIndices: Array.from(sortedIndices),
        },
        metadata: {
          action: `Comparing ${key} and ${arr[j]}`,
        },
      };

      // Shift arr[j] to the right (swap them visually)
      arr[j + 1] = arr[j];

      // Show the shift (red)
      yield {
        type: 'array',
        data: arr,
        highlights: {
          swappingIndices: [j, j + 1],
          sortedIndices: Array.from(sortedIndices),
        },
        metadata: {
          action: `Shifting ${arr[j]} right`,
        },
      };

      j--;
    }

    // 3. Place the key in its correct position
    arr[j + 1] = key;

    // Show the placement (key turns green immediately)
    sortedIndices.add(j + 1);

    yield {
      type: 'array',
      data: arr,
      highlights: {
        swappingIndices: [j + 1],
        sortedIndices: Array.from(sortedIndices),
      },
      metadata: {
        action: `Placed ${key} at position ${j + 1}`,
      },
    };
  }

  // Final state: fully sorted (all green)
  yield {
    type: 'array',
    data: arr,
    highlights: {
      sortedIndices: arr.map((_, i) => i),
    },
    metadata: {
      action: '✅ Insertion Sort complete!',
    },
  };
}