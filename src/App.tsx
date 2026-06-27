// src/App.tsx
import React, { useRef, useState, useEffect } from 'react';
import { VisualizerEngine } from './core/engine';
import { drawArray } from './renderers/arrayRenderer';
import { bubbleSortGenerator } from './algorithms/sorting/bubbleSort';
import type { VisualizationState } from './core/types';

const ARRAY_SIZE = 15;

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<VisualizerEngine>(new VisualizerEngine());
  const [array, setArray] = useState<number[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(100); // milliseconds per step

  // Generate a random array
  const generateArray = () => {
    const newArr = Array.from({ length: ARRAY_SIZE }, () => Math.floor(Math.random() * 100) + 5);
    setArray(newArr);
    engineRef.current.pause();
    setIsPlaying(false);
    // Immediately draw the new array
    drawArray(canvasRef.current!, {
      type: 'array',
      data: newArr,
      highlights: { indices: [] },
      metadata: {}
    });
  };

  // Start sorting
  const startSorting = () => {
    if (array.length === 0) return;
    engineRef.current.pause(); // Stop any current run
    const gen = bubbleSortGenerator(array);
    engineRef.current.load(gen);
    
    // When the engine updates, draw the state and update the array state
    engineRef.current.onUpdate = (state: VisualizationState) => {
      setArray(state.data as number[]);
      drawArray(canvasRef.current!, state);
      // Update metadata display (optional)
      const metaEl = document.getElementById('metadata');
      if (metaEl) {
        metaEl.innerText = `Comparisons: ${state.metadata.comparisons || 0} | Swaps: ${state.metadata.swaps || 0}`;
      }
    };

    setIsPlaying(true);
    engineRef.current.play(speed);
  };

  const stepForward = () => {
    if (array.length === 0) return;
    engineRef.current.pause();
    setIsPlaying(false);
    if (!engineRef.current['generator']) {
      // If no generator is loaded, load one
      const gen = bubbleSortGenerator(array);
      engineRef.current.load(gen);
      engineRef.current.onUpdate = (state: VisualizationState) => {
        setArray(state.data as number[]);
        drawArray(canvasRef.current!, state);
        const metaEl = document.getElementById('metadata');
        if (metaEl) metaEl.innerText = `Comparisons: ${state.metadata.comparisons || 0} | Swaps: ${state.metadata.swaps || 0}`;
      };
    }
    engineRef.current.step();
  };

  const togglePlayPause = () => {
    if (isPlaying) {
      engineRef.current.pause();
      setIsPlaying(false);
    } else {
      if (!engineRef.current['generator']) {
        startSorting(); // If finished, restart
      } else {
        setIsPlaying(true);
        engineRef.current.play(speed);
      }
    }
  };

  // Initialize with random array on mount
  useEffect(() => {
    generateArray();
    // Cleanup on unmount
    return () => engineRef.current.pause();
  }, []);

  // If speed changes while playing, restart the playback loop
  useEffect(() => {
    if (isPlaying) {
      engineRef.current.pause();
      engineRef.current.play(speed);
    }
  }, [speed]);

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', background: '#1e272e', minHeight: '100vh', color: 'white' }}>
      <h1 style={{ textAlign: 'center' }}>⚡ Algorithm Visualizer</h1>
      
      <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '20px' }}>
        <button onClick={generateArray} style={btnStyle}>🔄 New Array</button>
        <button onClick={startSorting} style={{...btnStyle, background: '#2ed573'}}>▶ Play Full</button>
        <button onClick={togglePlayPause} style={{...btnStyle, background: isPlaying ? '#ffa502' : '#2ed573'}}>
          {isPlaying ? '⏸ Pause' : '▶ Resume'}
        </button>
        <button onClick={stepForward} style={{...btnStyle, background: '#1e90ff'}}>⏭ Step</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <label>Speed: {speed}ms</label>
          <input 
            type="range" 
            min="10" 
            max="500" 
            value={speed} 
            onChange={(e) => setSpeed(Number(e.target.value))}
            style={{ width: '100px' }}
          />
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <canvas 
          ref={canvasRef} 
          width={800} 
          height={400} 
          style={{ background: '#2f3542', borderRadius: '8px', width: '100%', maxWidth: '800px', height: '400px' }}
        />
      </div>
      
      <div id="metadata" style={{ textAlign: 'center', marginTop: '20px', fontSize: '18px', color: '#a4b0be' }}>
        Comparisons: 0 | Swaps: 0
      </div>
      <div style={{ textAlign: 'center', marginTop: '10px', fontSize: '14px', color: '#747d8c' }}>
        🟦 Unsorted &nbsp;|&nbsp; 🟥 Comparing / Swapping
      </div>
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  padding: '10px 20px',
  border: 'none',
  borderRadius: '5px',
  color: 'white',
  fontWeight: 'bold',
  cursor: 'pointer',
  fontSize: '16px',
  background: '#3742fa',
  transition: '0.2s'
};

export default App;