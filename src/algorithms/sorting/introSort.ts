// src/algorithms/sorting/introsort.ts
import type { VisualizationState, AlgorithmGenerator } from '../../core/types';

// ─── Algorithm Info ───
export const INTROSORT_INFO = {
  name: 'Introsort',
  description: 'A hybrid sorting algorithm that starts with quicksort, switches to heapsort when recursion depth exceeds log₂(n), and uses insertion sort for small subarrays. Guarantees O(n log n) worst-case performance.',
  bestCase: 'O(n log n)',
  avgCase: 'O(n log n)',
  worstCase: 'O(n log n)',
  spaceComplexity: 'O(log n)',
};

// ─── Helper: Insertion Sort on a subarray ───
function* insertionSortSubarray(
  arr: number[],
  low: number,
  high: number,
  sortedIndices: Set<number>
): AlgorithmGenerator {
  for (let i = low + 1; i <= high; i++) {
    const key = arr[i];
    let j = i - 1;
    yield {
      type: 'array',
      data: arr,
      highlights: {
        comparingIndices: [i],
        sortedIndices: Array.from(sortedIndices),
      },
      metadata: { action: `Inserting ${key}` },
    };
    while (j >= low && arr[j] > key) {
      yield {
        type: 'array',
        data: arr,
        highlights: {
          comparingIndices: [j, i],
          sortedIndices: Array.from(sortedIndices),
        },
        metadata: { action: `Comparing ${key} with ${arr[j]}` },
      };
      arr[j + 1] = arr[j];
      yield {
        type: 'array',
        data: arr,
        highlights: {
          swappingIndices: [j, j + 1],
          sortedIndices: Array.from(sortedIndices),
        },
        metadata: { action: `Shifting ${arr[j]}` },
      };
      j--;
    }
    arr[j + 1] = key;
    sortedIndices.add(i);
    yield {
      type: 'array',
      data: arr,
      highlights: {
        swappingIndices: [j + 1],
        sortedIndices: Array.from(sortedIndices),
      },
      metadata: { action: `Placed ${key}` },
    };
  }
}

// ─── Helper: Heapsort on a subarray ───
function* heapSortSubarray(
  arr: number[],
  low: number,
  high: number,
  sortedIndices: Set<number>
): AlgorithmGenerator {
  const n = high - low + 1;

  // Build max-heap
  for (let i = Math.floor(n / 2) - 1; i >= 0; i--) {
    yield* heapify(arr, low, i, n, sortedIndices);
  }

  // Extract elements
  for (let i = n - 1; i > 0; i--) {
    // Swap root (largest) with last element of the heap
    const rootIdx = low;
    const lastIdx = low + i;
    [arr[rootIdx], arr[lastIdx]] = [arr[lastIdx], arr[rootIdx]];
    sortedIndices.add(lastIdx);
    yield {
      type: 'array',
      data: arr,
      highlights: {
        swappingIndices: [rootIdx, lastIdx],
        sortedIndices: Array.from(sortedIndices),
      },
      metadata: { action: `Heap extract max to ${lastIdx}` },
    };
    yield* heapify(arr, low, 0, i, sortedIndices);
  }
  sortedIndices.add(low);
  yield {
    type: 'array',
    data: arr,
    highlights: {
      sortedIndices: Array.from(sortedIndices),
    },
    metadata: { action: 'Heapsort complete for subarray' },
  };
}

function* heapify(
  arr: number[],
  low: number,
  idx: number,
  heapSize: number,
  sortedIndices: Set<number>
): AlgorithmGenerator {
  let largest = idx;
  const left = 2 * idx + 1;
  const right = 2 * idx + 2;

  if (left < heapSize) {
    const leftIdx = low + left;
    const largestIdx = low + largest;
    yield {
      type: 'array',
      data: arr,
      highlights: {
        comparingIndices: [leftIdx, largestIdx],
        sortedIndices: Array.from(sortedIndices),
      },
      metadata: { action: `Heap compare` },
    };
    if (arr[leftIdx] > arr[largestIdx]) largest = left;
  }

  if (right < heapSize) {
    const rightIdx = low + right;
    const largestIdx = low + largest;
    yield {
      type: 'array',
      data: arr,
      highlights: {
        comparingIndices: [rightIdx, largestIdx],
        sortedIndices: Array.from(sortedIndices),
      },
      metadata: { action: `Heap compare` },
    };
    if (arr[rightIdx] > arr[largestIdx]) largest = right;
  }

  if (largest !== idx) {
    const largestIdx = low + largest;
    const idxIdx = low + idx;
    [arr[largestIdx], arr[idxIdx]] = [arr[idxIdx], arr[largestIdx]];
    yield {
      type: 'array',
      data: arr,
      highlights: {
        swappingIndices: [largestIdx, idxIdx],
        sortedIndices: Array.from(sortedIndices),
      },
      metadata: { action: `Heap swap` },
    };
    yield* heapify(arr, low, largest, heapSize, sortedIndices);
  }
}

// ─── Introsort recursive helper ───
function* introsortHelper(
  arr: number[],
  low: number,
  high: number,
  depthLimit: number,
  sortedIndices: Set<number>
): AlgorithmGenerator {
  const size = high - low + 1;

  // Small array: insertion sort
  if (size <= 16) {
    yield* insertionSortSubarray(arr, low, high, sortedIndices);
    return;
  }

  // If depth limit reached, use heapsort
  if (depthLimit === 0) {
    yield* heapSortSubarray(arr, low, high, sortedIndices);
    return;
  }

  // Quicksort partition (median-of-three)
  const pivotIndex = yield* partition(arr, low, high, sortedIndices);

  // Recursively sort left and right
  yield* introsortHelper(arr, low, pivotIndex - 1, depthLimit - 1, sortedIndices);
  yield* introsortHelper(arr, pivotIndex + 1, high, depthLimit - 1, sortedIndices);
}

// ─── Partition with median-of-three ───
function* partition(
  arr: number[],
  low: number,
  high: number,
  sortedIndices: Set<number>
): AlgorithmGenerator {
  // Median-of-three pivot selection
  const mid = Math.floor((low + high) / 2);
  if (arr[mid] < arr[low]) [arr[low], arr[mid]] = [arr[mid], arr[low]];
  if (arr[high] < arr[low]) [arr[low], arr[high]] = [arr[high], arr[low]];
  if (arr[high] < arr[mid]) [arr[mid], arr[high]] = [arr[high], arr[mid]];
  // Place pivot at high-1
  [arr[mid], arr[high - 1]] = [arr[high - 1], arr[mid]];
  const pivot = arr[high - 1];

  let i = low;
  let j = high - 1;

  while (true) {
    // Find element on left >= pivot
    while (arr[++i] < pivot) {
      yield {
        type: 'array',
        data: arr,
        highlights: {
          comparingIndices: [i, high - 1],
          sortedIndices: Array.from(sortedIndices),
        },
        metadata: { action: `Comparing ${arr[i]} with pivot ${pivot}` },
      };
    }
    // Find element on right <= pivot
    while (arr[--j] > pivot) {
      yield {
        type: 'array',
        data: arr,
        highlights: {
          comparingIndices: [j, high - 1],
          sortedIndices: Array.from(sortedIndices),
        },
        metadata: { action: `Comparing ${arr[j]} with pivot ${pivot}` },
      };
    }
    if (i >= j) break;
    // Swap
    [arr[i], arr[j]] = [arr[j], arr[i]];
    yield {
      type: 'array',
      data: arr,
      highlights: {
        swappingIndices: [i, j],
        sortedIndices: Array.from(sortedIndices),
      },
      metadata: { action: `Swapped ${arr[i]} and ${arr[j]}` },
    };
  }

  // Place pivot in correct position
  [arr[i], arr[high - 1]] = [arr[high - 1], arr[i]];
  yield {
    type: 'array',
    data: arr,
    highlights: {
      swappingIndices: [i, high - 1],
      sortedIndices: Array.from(sortedIndices),
    },
    metadata: { action: `Pivot ${pivot} placed at ${i}` },
  };
  return i;
}

// ─── Main Introsort Generator ───
export function* introsortGenerator(input: number[]): AlgorithmGenerator {
  const arr = [...input];
  const n = arr.length;
  if (n <= 1) {
    yield {
      type: 'array',
      data: arr,
      highlights: { sortedIndices: [0] },
      metadata: { action: '✅ Already sorted' },
    };
    return;
  }

  const sortedIndices = new Set<number>();
  const depthLimit = Math.floor(2 * Math.log2(n));

  yield* introsortHelper(arr, 0, n - 1, depthLimit, sortedIndices);

  // Final state
  yield {
    type: 'array',
    data: arr,
    highlights: {
      sortedIndices: arr.map((_, i) => i),
    },
    metadata: { action: '✅ Introsort complete!' },
  };
}