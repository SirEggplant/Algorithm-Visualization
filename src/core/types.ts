// src/core/types.ts
export type Point = { x: number; y: number };

export type VisualizationState = {
  type: 'array' | 'scatter' | 'grid' | 'graph' | 'ecosystem';
  data: number[] | Point[] | unknown;
  highlights: {
    indices?: number[];                 // For general use
    comparingIndices?: number[];        // 🟨 Currently comparing
    swappingIndices?: number[];         // 🟥 Currently swapping
    sortedIndices?: number[];           // 🟩 Already sorted
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
    action?: string;
  };
};

export interface AlgorithmGenerator {
  next(): { done: boolean; value: VisualizationState };
}