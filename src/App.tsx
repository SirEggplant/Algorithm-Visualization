// src/App.tsx
import React, { useRef, useState, useEffect } from 'react';
import { VisualizerEngine } from './core/engine';
import { drawArray } from './renderers/arrayRenderer';
import { bubbleSortGenerator } from './algorithms/sorting/bubbleSort';
import { peakFinderGenerator } from './algorithms/genetic/peakFinder';
import { drawScatter, disposeScatterRenderer } from './renderers/scatterRenderer';

import type { VisualizationState } from './core/types';

const ARRAY_SIZE = 15;

type AlgorithmOption = 'bubble' | 'peak';

function App() {
  const canvas2DRef = useRef<HTMLCanvasElement>(null);
  const canvas3DRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<VisualizerEngine>(new VisualizerEngine());
  const [array, setArray] = useState<number[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(100);
  const [selectedAlgo, setSelectedAlgo] = useState<AlgorithmOption>('bubble');
  const [metadata, setMetadata] = useState<string>('');

  // Track previous algorithm to know when we switch away from 'peak'
  const prevAlgoRef = useRef<AlgorithmOption>(selectedAlgo);

  // Central function to start any algorithm
  const startAlgorithm = () => {
    if (selectedAlgo === 'bubble' && !canvas2DRef.current) return;
    if (selectedAlgo === 'peak' && !canvas3DRef.current) return;

    engineRef.current.pause();
    let generator;

    if (selectedAlgo === 'bubble') {
      if (array.length === 0) return;
      generator = bubbleSortGenerator(array);
    } else {
      generator = peakFinderGenerator();
    }

    engineRef.current.load(generator);

    // Setup the universal update callback
    engineRef.current.onUpdate = (state: VisualizationState) => {
      // Render based on type
      if (state.type === 'array') {
        setArray(state.data as number[]);
        if (canvas2DRef.current) {
          drawArray(canvas2DRef.current, state);
        }
      } else if (state.type === 'scatter') {
        if (canvas3DRef.current) {
          drawScatter(canvas3DRef.current, state);
        }
      }

      // Update metadata panel dynamically
      let metaText = '';
      if (state.metadata.comparisons !== undefined) {
        metaText = `Comparisons: ${state.metadata.comparisons} | Swaps: ${state.metadata.swaps || 0}`;
      } else if (state.metadata.generation !== undefined) {
        metaText = `Generation: ${state.metadata.generation} | Best Fitness: ${(state.metadata.fitness || 0).toFixed(4)}`;
      }
      setMetadata(metaText);
    };

    setIsPlaying(true);
    engineRef.current.play(speed);
  };

  const generateArray = () => {
    if (selectedAlgo !== 'bubble') return;
    const newArr = Array.from({ length: ARRAY_SIZE }, () => Math.floor(Math.random() * 100) + 5);
    setArray(newArr);
    engineRef.current.pause();
    setIsPlaying(false);
    if (canvas2DRef.current) {
      drawArray(canvas2DRef.current, {
        type: 'array',
        data: newArr,
        highlights: { indices: [] },
        metadata: {},
      });
    }
    setMetadata('Comparisons: 0 | Swaps: 0');
  };

  const stepForward = () => {
    if (selectedAlgo === 'bubble' && array.length === 0) return;
    engineRef.current.pause();
    setIsPlaying(false);
    if (!engineRef.current['generator']) {
      startAlgorithm();
    } else {
      engineRef.current.step();
    }
  };

  const togglePlayPause = () => {
    if (isPlaying) {
      engineRef.current.pause();
      setIsPlaying(false);
    } else {
      if (!engineRef.current['generator']) {
        startAlgorithm();
      } else {
        setIsPlaying(true);
        engineRef.current.play(speed);
      }
    }
  };

  // Initialize with random array
  useEffect(() => {
    generateArray();
    return () => engineRef.current.pause();
  }, []);

  // --- Cleanup when component unmounts ---
  useEffect(() => {
    return () => {
      if (canvas3DRef.current) {
        disposeScatterRenderer(canvas3DRef.current);
      }
      engineRef.current.pause();
    };
  }, []);

  // --- Handle algorithm switching ---
  useEffect(() => {
    engineRef.current.pause();
    setIsPlaying(false);

    // If we are switching AWAY from 'peak', dispose the Three.js renderer
    if (prevAlgoRef.current === 'peak' && selectedAlgo === 'bubble') {
      if (canvas3DRef.current) {
        disposeScatterRenderer(canvas3DRef.current);
      }
    }

    // Update the ref for the next render
    prevAlgoRef.current = selectedAlgo;

    if (selectedAlgo === 'bubble') {
      generateArray();
    } else {
      // Clear the 2D canvas and show placeholder
      setMetadata('');
      if (canvas2DRef.current) {
        const ctx = canvas2DRef.current.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas2DRef.current.width, canvas2DRef.current.height);
          ctx.fillStyle = '#a4b0be';
          ctx.font = '20px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(
            'Select "Play" to start evolving!',
            canvas2DRef.current.width / 2,
            canvas2DRef.current.height / 2
          );
        }
      }
    }
  }, [selectedAlgo]);

  // --- Speed change handler ---
  useEffect(() => {
    if (isPlaying) {
      engineRef.current.pause();
      engineRef.current.play(speed);
    }
  }, [speed]);

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', background: '#1e272e', minHeight: '100vh', color: 'white' }}>
      <h1 style={{ textAlign: 'center' }}>🧬 Algorithm Visualizer</h1>

      <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', flexWrap: 'wrap', marginBottom: '20px', alignItems: 'center' }}>
        {/* Algorithm Selector Dropdown */}
        <div>
          <label htmlFor="algo-select" style={{ marginRight: '10px', fontWeight: 'bold' }}>Algorithm:</label>
          <select
            id="algo-select"
            value={selectedAlgo}
            onChange={(e) => setSelectedAlgo(e.target.value as AlgorithmOption)}
            style={{ padding: '10px', borderRadius: '5px', background: '#2f3542', color: 'white', border: '1px solid #57606f' }}
          >
            <option value="bubble">🔵 Bubble Sort (Array)</option>
            <option value="peak">🧬 Peak Finder (Genetic)</option>
          </select>
        </div>

        {selectedAlgo === 'bubble' && (
          <button onClick={generateArray} style={btnStyle}>🔄 New Array</button>
        )}

        <button onClick={startAlgorithm} style={{ ...btnStyle, background: '#2ed573' }}>▶ Play Full</button>
        <button onClick={togglePlayPause} style={{ ...btnStyle, background: isPlaying ? '#ffa502' : '#2ed573' }}>
          {isPlaying ? '⏸ Pause' : '▶ Resume'}
        </button>
        <button onClick={stepForward} style={{ ...btnStyle, background: '#1e90ff' }}>⏭ Step</button>

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

      {/* Canvas Container */}
      <div style={{ position: 'relative', width: '800px', maxWidth: '100%', margin: '0 auto', aspectRatio: '2 / 1' }}>
        {/* 2D Canvas (always present, hidden when 'peak' is selected) */}
        <canvas
          ref={canvas2DRef}
          width={800}
          height={400}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: '#2f3542',
            borderRadius: '8px',
            display: selectedAlgo === 'bubble' ? 'block' : 'none',
          }}
        />
        
        {/* 3D Canvas (only rendered when 'peak' is selected) */}
        <canvas
          ref={canvas3DRef}
          width={800}
          height={400}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: '#0a0e1a',
            borderRadius: '8px',
            display: selectedAlgo === 'peak' ? 'block' : 'none',
          }}
        />
      </div>

      <div id="metadata" style={{ textAlign: 'center', marginTop: '20px', fontSize: '18px', color: '#a4b0be' }}>
        {metadata || 'Select an algorithm and press play.'}
      </div>

      <div style={{ textAlign: 'center', marginTop: '10px', fontSize: '14px', color: '#747d8c' }}>
        {selectedAlgo === 'bubble' 
          ? '🟦 Unsorted | 🟥 Comparing/Swapping' 
          : '🔵 Population | ⭐ Best Solution'}
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
  transition: '0.2s',
};

export default App;