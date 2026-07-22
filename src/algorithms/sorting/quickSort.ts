// src/algorithms/sorting/quickSort.ts
import type { VisualizationState, AlgorithmGenerator } from '../../core/types';

export const QUICK_SORT_INFO = {
  name: 'Quick Sort',
  description: 'A divide-and-conquer algorithm that selects a "pivot" element, partitions the array so that elements smaller than the pivot come before it and larger come after, and then recursively sorts the sub-arrays. It is highly efficient in practice.',
  bestCase: 'O(n log n)',
  avgCase: 'O(n log n)',
  worstCase: 'O(n²)',
  spaceComplexity: 'O(log n)',
};

// Partition function: places pivot in its correct position
// Returns the final index of the pivot
function* partition(
  arr: number[],
  low: number,
  high: number,
  sortedIndices: Set<number>
): AlgorithmGenerator {
  // Choose the rightmost element as pivot
  const pivot = arr[high];
  let i = low - 1; // Index of smaller element

  // 1. Show the pivot element in a special color (we'll use purple via swappingIndices)
  yield {
    type: 'array',
    data: arr,
    highlights: {
      swappingIndices: [high], // Temporary use for pivot highlight
      sortedIndices: Array.from(sortedIndices),
    },
    metadata: {
      action: `Pivot: ${pivot}`,
    },
  };

  for (let j = low; j < high; j++) {
    // 2. COMPARING: Show yellow on the element being compared with pivot
    yield {
      type: 'array',
      data: arr,
      highlights: {
        comparingIndices: [j, high], // Compare arr[j] with pivot
        swappingIndices: [], // Clear pivot highlight
        sortedIndices: Array.from(sortedIndices),
      },
      metadata: {
        action: `Comparing ${arr[j]} with pivot ${pivot}`,
      },
    };

    if (arr[j] < pivot) {
      i++;
      // 3. SWAPPING: Show red on the two elements being swapped
      [arr[i], arr[j]] = [arr[j], arr[i]];
      yield {
        type: 'array',
        data: arr,
        highlights: {
          swappingIndices: [i, j],
          sortedIndices: Array.from(sortedIndices),
        },
        metadata: {
          action: `Swapped ${arr[i]} and ${arr[j]}`,
        },
      };
    }
  }

  // 4. Place pivot in its correct position
  [arr[i + 1], arr[high]] = [arr[high], arr[i + 1]];
  const pivotIndex = i + 1;

  yield {
    type: 'array',
    data: arr,
    highlights: {
      swappingIndices: [pivotIndex, high],
      sortedIndices: Array.from(sortedIndices),
    },
    metadata: {
      action: `Pivot ${pivot} placed at position ${pivotIndex}`,
    },
  };

  // 5. Mark pivot as sorted (green)
  sortedIndices.add(pivotIndex);
  yield {
    type: 'array',
    data: arr,
    highlights: {
      sortedIndices: Array.from(sortedIndices),
    },
    metadata: {
      action: `Pivot ${pivot} is now sorted`,
    },
  };

  return pivotIndex;
}

// Recursive Quick Sort helper
function* quickSortHelper(
  arr: number[],
  low: number,
  high: number,
  sortedIndices: Set<number>
): AlgorithmGenerator {
  // Base case: if the subarray has 0 or 1 element, it's already sorted
  if (low >= high) {
    if (low === high) {
      sortedIndices.add(low);
      yield {
        type: 'array',
        data: arr,
        highlights: {
          sortedIndices: Array.from(sortedIndices),
        },
        metadata: {
          action: `Element ${arr[low]} sorted (single)`,
        },
      };
    }
    return;
  }

  // Partition the array and get the pivot index
  const pivotIndex = yield* partition(arr, low, high, sortedIndices);

  // Recursively sort elements before and after partition
  yield* quickSortHelper(arr, low, pivotIndex - 1, sortedIndices);
  yield* quickSortHelper(arr, pivotIndex + 1, high, sortedIndices);

  // After both halves are sorted, the entire segment [low, high] is sorted
  // But we only mark elements that aren't already marked (they should be already)
  // Just yield to show progress
  yield {
    type: 'array',
    data: arr,
    highlights: {
      sortedIndices: Array.from(sortedIndices),
    },
    metadata: {
      action: `Segment ${low}–${high} fully sorted`,
    },
  };
}

// Main exported generator
export function* quickSortGenerator(input: number[]): AlgorithmGenerator {
  const arr = [...input];
  const sortedIndices = new Set<number>();

  // Start the recursive sorting process
  yield* quickSortHelper(arr, 0, arr.length - 1, sortedIndices);

  // Final fully sorted state
  yield {
    type: 'array',
    data: arr,
    highlights: {
      sortedIndices: arr.map((_, i) => i),
    },
    metadata: {
      action: 'Quick Sort complete!',
    },
  };
}