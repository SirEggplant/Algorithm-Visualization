import type { AlgorithmGenerator, VisualizationState } from './types';

export class VisualizerEngine {
  private generator: AlgorithmGenerator | null = null;
  private timerId: number | null = null;
  public onUpdate: (state: VisualizationState) => void = () => {};

  load(generator: AlgorithmGenerator) {
    this.generator = generator;
  }

  step(): VisualizationState | null {
    if (!this.generator) return null;
    const result = this.generator.next();
    if (!result.done && result.value) {
      this.onUpdate(result.value);
      return result.value;
    }
    return null;
  }

  play(speedMs: number) {
    if (this.timerId) return;
    this.timerId = window.setInterval(() => {
      const result = this.step();
      if (!result) this.pause();
    }, speedMs);
  }

  pause() {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  reset() {
    this.pause();
    this.generator = null;
  }
}