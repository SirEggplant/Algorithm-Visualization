// src/algorithms/sorting/timsort.ts
import type { VisualizationState, AlgorithmGenerator } from '../../core/types';

// ─── Algorithm Info ───
export const TIMSORT_INFO = {
  name: 'Timsort',
  description: 'A hybrid stable sorting algorithm derived from merge sort and insertion sort. It finds runs (naturally ordered sequences) and merges them efficiently. Used in Python and Java.',
  bestCase: 'O(n)',
  avgCase: 'O(n log n)',
  worstCase: 'O(n log n)',
  spaceComplexity: 'O(n)',
};

// ─── Helper: Insertion Sort on a range ───
function* insertionSortRange(
  arr: number[],
  left: number,
  right: number,
  sortedIndices: Set<number>
): AlgorithmGenerator {
  for (let i = left + 1; i <= right; i++) {
    const key = arr[i];
    let j = i - 1;

    // Highlight key
    yield {
      type: 'array',
      data: arr,
      highlights: {
        comparingIndices: [i],
        sortedIndices: Array.from(sortedIndices),
      },
      metadata: { action: `Inserting ${key}` },
    };

    while (j >= left && arr[j] > key) {
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
        metadata: { action: `Shifting ${arr[j]} right` },
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

// ─── Helper: Merge two adjacent runs ───
function* mergeRuns(
  arr: number[],
  left: number,
  mid: number,
  right: number,
  sortedIndices: Set<number>
): AlgorithmGenerator {
  const leftArr = arr.slice(left, mid + 1);
  const rightArr = arr.slice(mid + 1, right + 1);
  let i = 0,
    j = 0,
    k = left;

  while (i < leftArr.length && j < rightArr.length) {
    yield {
      type: 'array',
      data: arr,
      highlights: {
        comparingIndices: [left + i, mid + 1 + j],
        sortedIndices: Array.from(sortedIndices),
      },
      metadata: { action: `Comparing ${leftArr[i]} and ${rightArr[j]}` },
    };

    if (leftArr[i] <= rightArr[j]) {
      arr[k] = leftArr[i];
      yield {
        type: 'array',
        data: arr,
        highlights: {
          swappingIndices: [k],
          sortedIndices: Array.from(sortedIndices),
        },
        metadata: { action: `Place ${leftArr[i]}` },
      };
      i++;
    } else {
      arr[k] = rightArr[j];
      yield {
        type: 'array',
        data: arr,
        highlights: {
          swappingIndices: [k],
          sortedIndices: Array.from(sortedIndices),
        },
        metadata: { action: `Place ${rightArr[j]}` },
      };
      j++;
    }
    k++;
  }

  while (i < leftArr.length) {
    arr[k] = leftArr[i];
    yield {
      type: 'array',
      data: arr,
      highlights: {
        swappingIndices: [k],
        sortedIndices: Array.from(sortedIndices),
      },
      metadata: { action: `Place ${leftArr[i]}` },
    };
    i++;
    k++;
  }

  while (j < rightArr.length) {
    arr[k] = rightArr[j];
    yield {
      type: 'array',
      data: arr,
      highlights: {
        swappingIndices: [k],
        sortedIndices: Array.from(sortedIndices),
      },
      metadata: { action: `Place ${rightArr[j]}` },
    };
    j++;
    k++;
  }

  // Mark the merged segment as sorted (green)
  for (let idx = left; idx <= right; idx++) {
    sortedIndices.add(idx);
  }
  yield {
    type: 'array',
    data: arr,
    highlights: {
      sortedIndices: Array.from(sortedIndices),
    },
    metadata: { action: `Merged ${left}–${right}` },
  };
}

// ─── Main Timsort Generator ───
export function* timsortGenerator(input: number[]): AlgorithmGenerator {
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

  // Determine min run size (between 16 and 32)
  let minRun = 32;
  while (minRun >= n) minRun >>= 1;
  if (minRun < 16) minRun = 16;

  const sortedIndices = new Set<number>();

  // 1. Build runs and sort them with insertion sort
  let runs: Array<{ start: number; end: number }> = [];
  for (let start = 0; start < n; start += minRun) {
    const end = Math.min(start + minRun - 1, n - 1);
    yield* insertionSortRange(arr, start, end, sortedIndices);
    runs.push({ start, end });
  }

  // 2. Merge runs (bottom-up merge)
  while (runs.length > 1) {
    const newRuns: Array<{ start: number; end: number }> = [];
    for (let i = 0; i < runs.length; i += 2) {
      if (i + 1 < runs.length) {
        const leftRun = runs[i];
        const rightRun = runs[i + 1];
        yield* mergeRuns(arr, leftRun.start, leftRun.end, rightRun.end, sortedIndices);
        newRuns.push({ start: leftRun.start, end: rightRun.end });
      } else {
        newRuns.push(runs[i]);
      }
    }
    runs = newRuns;
  }

  // Final state
  yield {
    type: 'array',
    data: arr,
    highlights: {
      sortedIndices: arr.map((_, i) => i),
    },
    metadata: { action: '✅ Timsort complete!' },
  };
}