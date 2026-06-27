// src/renderers/arrayRenderer.ts
import type { VisualizationState } from '../core/types';

export function drawArray(canvas: HTMLCanvasElement, state: VisualizationState) {
  if (!canvas) {
    console.error("Canvas is null");
    return;
  }
  
  const ctx = canvas.getContext('2d')!;
  const width = canvas.width;
  const height = canvas.height;
  
  ctx.clearRect(0, 0, width, height);
  
  const arr = state.data as number[];
  const maxVal = Math.max(...arr);
  const barWidth = width / arr.length;
  const highlightSet = new Set(state.highlights.indices || []);

  arr.forEach((value, index) => {
    const barHeight = (value / maxVal) * (height - 20);
    const x = index * barWidth;
    const y = height - barHeight - 10;

    // Color logic: Highlighted = Red, else Blue
    ctx.fillStyle = highlightSet.has(index) ? '#ff4757' : '#3742fa';
    ctx.fillRect(x, y, barWidth - 2, barHeight);
    
    // Draw the number on top
    ctx.fillStyle = '#ffffff';
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(value.toString(), x + barWidth / 2, y - 5);
  });
}