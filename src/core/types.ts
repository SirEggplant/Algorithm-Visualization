// src/core/types.ts
export type Point = { x: number; y: number };

export type VisualizationState = {
  type: 'array' | 'scatter' | 'grid' | 'graph';
  data: number[] | Point[]; // <-- Now supports both!
  highlights: {
    indices?: number[];
    coordinates?: Point[];
  };
  metadata: {
    comparisons?: number;
    swaps?: number;
    generation?: number;
    fitness?: number;
    currentLine?: number;
  };
};

export interface AlgorithmGenerator {
  next(): { done: boolean; value: VisualizationState };
}