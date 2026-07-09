// src/features/sorting/renderers/arrayRenderer.ts
import type { VisualizationState } from '../core/types';

export function drawArray(canvas: HTMLCanvasElement, state: VisualizationState) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const width = canvas.width;
  const height = canvas.height;
  const arr = state.data as number[];

  ctx.clearRect(0, 0, width, height);

  if (!arr || arr.length === 0) {
    ctx.fillStyle = '#64748b';
    ctx.font = '20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Generate an array to start!', width / 2, height / 2);
    return;
  }

  const maxVal = Math.max(...arr);
  if (maxVal === 0) {
    ctx.fillStyle = '#64748b';
    ctx.font = '20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('All values are zero!', width / 2, height / 2);
    return;
  }

  const barWidth = width / arr.length;
  const highlightSet = new Set(state.highlights.indices || []);
  const padding = 4;

  arr.forEach((value, index) => {
    const barHeight = (value / maxVal) * (height - 30);
    const x = index * barWidth;
    const y = height - barHeight - 10;

    // Determine color based on state
    let color = '#38bdf8'; // Unsorted (Cyan)
    if (highlightSet.has(index)) {
      // If it's the last element being sorted? Just a guess.
      // Usually comparing and swapping are different colors.
      // We'll use yellow for comparing, red for swapping.
      // Since we don't know which operation, we'll default to yellow for highlights.
      // To differentiate, we could check metadata, but for now let's use a gradient.
      color = '#facc15'; // Comparing (Yellow)
      // If there are exactly two highlighted, they are likely being compared/swapped.
      // We'll make the second one slightly different if needed, but keep it simple.
    }

    // Check if this bar is part of the sorted suffix (for Bubble Sort, it's the end)
    // We'll assume sorted if all bars after this are in order? That's complex.
    // For now, just rely on highlights.

    // Gradient fill for depth
    const grad = ctx.createLinearGradient(x, y, x + barWidth, y + barHeight);
    if (highlightSet.has(index)) {
      grad.addColorStop(0, '#facc15');
      grad.addColorStop(1, '#f59e0b');
    } else {
      grad.addColorStop(0, '#38bdf8');
      grad.addColorStop(1, '#0284c7');
    }

    ctx.fillStyle = grad;
    ctx.shadowColor = highlightSet.has(index) ? 'rgba(250, 204, 21, 0.4)' : 'rgba(56, 189, 248, 0.2)';
    ctx.shadowBlur = highlightSet.has(index) ? 15 : 5;
    ctx.fillRect(x + padding / 2, y, barWidth - padding, barHeight);
    ctx.shadowBlur = 0;

    // Value label
    ctx.fillStyle = '#e2e8f0';
    ctx.font = `${Math.min(12, barWidth * 0.6)}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    if (barHeight > 20) {
      ctx.fillText(value.toString(), x + barWidth / 2, y - 4);
    }
  });
}