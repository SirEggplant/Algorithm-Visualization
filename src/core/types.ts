// src/core/types.ts
export type Point = { x: number; y: number };

export type VisualizationState = {
  type: 'array' | 'scatter' | 'grid' | 'graph' | 'ecosystem';
  data: number[] | Point[] | unknown;
  highlights: {
    indices?: number[];
    coordinates?: Point[];
  };
  metadata: {
    comparisons?: number;
    swaps?: number;
    generation?: number;
    fitness?: number;
    population?: number;
    avgSpeed?: number;
    avgSize?: number;
    currentLine?: number;
    action?: string; // 👈 NEW: describes the operation (e.g., "Swapped 7 and 3")
  };
};

export interface AlgorithmGenerator {
  next(): { done: boolean; value: VisualizationState };
}