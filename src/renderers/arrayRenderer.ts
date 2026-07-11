// src/renderers/arrayRenderer.ts
import type { VisualizationState } from '../core/types';

export function drawArray(canvas: HTMLCanvasElement, state: VisualizationState) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Use the canvas's actual pixel dimensions (800x400 by default)
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

  // --- DYNAMIC ADJUSTMENTS BASED ON ARRAY SIZE ---
  const count = arr.length;
  
  // 1. Bar width: distribute evenly across the canvas
  const barWidth = width / count;

  // 2. Padding: shrink gaps as bars get smaller
  //    - For < 30 bars: 4px gap
  //    - For 30-60 bars: 2px gap
  //    - For > 60 bars: 0px gap (bars touch each other)
  let padding = 4;
  if (count > 30) padding = 2;
  if (count > 60) padding = 0;

  // 3. Show text only if bars are wide enough (> 12px)
  const showLabels = barWidth > 12;

  // 4. Font size: shrink text dynamically, but keep it readable
  const fontSize = Math.max(8, Math.min(12, barWidth * 0.5));

  // 5. Minimum bar height (so tiny bars are still visible)
  const minBarHeight = 2;

  // Create sets for quick lookups
  const comparingSet = new Set(state.highlights.comparingIndices || []);
  const swappingSet = new Set(state.highlights.swappingIndices || []);
  const sortedSet = new Set(state.highlights.sortedIndices || []);

  arr.forEach((value, index) => {
    // Calculate bar height (with minimum)
    const rawHeight = (value / maxVal) * (height - 30);
    const barHeight = Math.max(minBarHeight, rawHeight);

    const x = index * barWidth;
    const y = height - barHeight - 10;

    // Determine color
    let color = '#38bdf8'; // Unsorted (Blue)
    let shadowColor = 'rgba(56, 189, 248, 0.2)';
    let glowIntensity = 5;

    if (swappingSet.has(index)) {
      color = '#f87171'; // Red
      shadowColor = 'rgba(248, 113, 113, 0.4)';
      glowIntensity = 15;
    } else if (comparingSet.has(index)) {
      color = '#facc15'; // Yellow
      shadowColor = 'rgba(250, 204, 21, 0.4)';
      glowIntensity = 15;
    } else if (sortedSet.has(index)) {
      color = '#4ade80'; // Green
      shadowColor = 'rgba(74, 222, 128, 0.2)';
      glowIntensity = 5;
    }

    // Draw bar with glow
    ctx.shadowColor = shadowColor;
    ctx.shadowBlur = glowIntensity;

    const grad = ctx.createLinearGradient(x, y, x + barWidth, y + barHeight);
    if (swappingSet.has(index)) {
      grad.addColorStop(0, '#f87171');
      grad.addColorStop(1, '#dc2626');
    } else if (comparingSet.has(index)) {
      grad.addColorStop(0, '#facc15');
      grad.addColorStop(1, '#eab308');
    } else if (sortedSet.has(index)) {
      grad.addColorStop(0, '#4ade80');
      grad.addColorStop(1, '#22c55e');
    } else {
      grad.addColorStop(0, '#38bdf8');
      grad.addColorStop(1, '#0284c7');
    }

    ctx.fillStyle = grad;
    ctx.fillRect(x + padding / 2, y, Math.max(1, barWidth - padding), barHeight);

    // Reset shadow for text
    ctx.shadowBlur = 0;

    // Draw the number label (only if enabled and bar is tall enough to fit the text)
    if (showLabels) {
      ctx.fillStyle = '#e2e8f0';
      ctx.font = `${fontSize}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(value.toString(), x + barWidth / 2, y - 4);
    }
  });

}