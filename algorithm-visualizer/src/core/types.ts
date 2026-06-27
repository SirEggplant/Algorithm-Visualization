// src/core/types.ts
export type VisualizationState = {
  type: 'array' | 'scatter' | 'grid' | 'graph';
  data: number[];
  highlights: {
    indices?: number[];
    coordinates?: { x: number; y: number }[];
  };
  metadata: {
    comparisons?: number;
    swaps?: number;
    generation?: number;
    currentLine?: number;
  };
};

// Use a simpler type definition that Vite can understand
export type AlgorithmGenerator = {
  next(): { done: boolean; value: VisualizationState };
  return?(value: any): { done: boolean; value: any };
  throw?(e: any): { done: boolean; value: any };
};