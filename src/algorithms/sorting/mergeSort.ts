// src/algorithms/sorting/mergeSort.ts
import type { VisualizationState, AlgorithmGenerator } from '../../core/types';

// Helper generator to merge two sorted halves
// NOTE: We DO NOT pass sortedIndices here – during merge,
// elements should appear as UNSORTED (blue) until the whole segment is merged.
function* merge(
  arr: number[],
  left: number,
  mid: number,
  right: number
): AlgorithmGenerator {
  const leftArr = arr.slice(left, mid);
  const rightArr = arr.slice(mid, right);
  let i = 0,
    j = 0,
    k = left;

  while (i < leftArr.length && j < rightArr.length) {
    // 1. COMPARING: Show yellow on the two elements being compared
    yield {
      type: 'array',
      data: arr,
      highlights: {
        comparingIndices: [left + i, mid + j],
        // No sortedIndices – elements appear as UNSORTED (blue)
      },
      metadata: {
        action: `Comparing ${leftArr[i]} and ${rightArr[j]}`,
      },
    };

    if (leftArr[i] <= rightArr[j]) {
      // 2. PLACING: Show red on the position being overwritten
      arr[k] = leftArr[i];
      yield {
        type: 'array',
        data: arr,
        highlights: {
          swappingIndices: [k],
          // No sortedIndices – elements appear as UNSORTED (blue)
        },
        metadata: {
          action: `Place ${leftArr[i]}`,
        },
      };
      i++;
    } else {
      arr[k] = rightArr[j];
      yield {
        type: 'array',
        data: arr,
        highlights: {
          swappingIndices: [k],
          // No sortedIndices – elements appear as UNSORTED (blue)
        },
        metadata: {
          action: `Place ${rightArr[j]}`,
        },
      };
      j++;
    }
    k++;
  }

  // Copy remaining elements from leftArr
  while (i < leftArr.length) {
    arr[k] = leftArr[i];
    yield {
      type: 'array',
      data: arr,
      highlights: {
        swappingIndices: [k],
        // No sortedIndices – elements appear as UNSORTED (blue)
      },
      metadata: {
        action: `Place ${leftArr[i]}`,
      },
    };
    i++;
    k++;
  }

  // Copy remaining elements from rightArr
  while (j < rightArr.length) {
    arr[k] = rightArr[j];
    yield {
      type: 'array',
      data: arr,
      highlights: {
        swappingIndices: [k],
        // No sortedIndices – elements appear as UNSORTED (blue)
      },
      metadata: {
        action: `Place ${rightArr[j]}`,
      },
    };
    j++;
    k++;
  }
}

// Recursive helper generator
function* mergeSortHelper(
  arr: number[],
  left: number,
  right: number,
  sortedIndices: Set<number>
): AlgorithmGenerator {
  // Base case: single element is already sorted
  if (right - left <= 1) {
    sortedIndices.add(left);
    yield {
      type: 'array',
      data: arr,
      highlights: {
        sortedIndices: Array.from(sortedIndices),
      },
      metadata: {
        action: `Element ${arr[left]} sorted`,
      },
    };
    return;
  }

  const mid = Math.floor((left + right) / 2);

  // Recursively sort left and right halves
  yield* mergeSortHelper(arr, left, mid, sortedIndices);
  yield* mergeSortHelper(arr, mid, right, sortedIndices);

  // ✅ FIX: Merge WITHOUT passing sortedIndices
  // This ensures elements appear as UNSORTED (blue) during the merge.
  yield* merge(arr, left, mid, right);

  // 🔑 KEY: Only now, after the merge is complete,
  // we mark the ENTIRE segment as sorted (green)
  for (let i = left; i < right; i++) {
    sortedIndices.add(i);
  }
  yield {
    type: 'array',
    data: arr,
    highlights: {
      sortedIndices: Array.from(sortedIndices),
    },
    metadata: {
      action: `Segment ${left}–${right - 1} sorted`,
    },
  };
}

// Main exported generator
export function* mergeSortGenerator(input: number[]): AlgorithmGenerator {
  const arr = [...input];
  const sortedIndices = new Set<number>();

  // Start the recursive sorting process
  yield* mergeSortHelper(arr, 0, arr.length, sortedIndices);

  // Final fully sorted state
  yield {
    type: 'array',
    data: arr,
    highlights: {
      sortedIndices: arr.map((_, i) => i),
    },
    metadata: {
      action: '✅ Merge Sort complete!',
    },
  };
}