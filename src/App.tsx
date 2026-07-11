// src/App.tsx
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { VisualizerEngine } from './core/engine';
import type { VisualizationState } from './core/types';
import HistoryLog, { type HistoryEntry } from './ui/HistoryLog';

// Sorting Feature
import { drawArray } from './renderers/arrayRenderer';
import { bubbleSortGenerator } from './algorithms/sorting/bubbleSort';

// Hill Climbing Feature
import { drawScatter, disposeScatterRenderer } from './renderers/scatterRenderer';
import { hillClimbingGenerator } from './algorithms/hillClimbing/peakFinder';

// --- Types ---
type Feature = 'sorting' | 'optimization';
type SortingAlgo = 'bubble';
type OptimizationAlgo = 'hillClimbing';
type PlayState = 'idle' | 'playing' | 'paused';
type SpeedOption = 'slow' | 'normal' | 'fast' | 'turbo';
type ArraySize = 25 | 50 | 100 | 200;

const SPEED_MAP: Record<SpeedOption, number> = {
  slow: 300,
  normal: 100,
  fast: 30,
  turbo: 5,
};

// Feature -> Algorithms mapping
const featureAlgorithms: Record<Feature, string[]> = {
  sorting: ['bubble'],
  optimization: ['hillClimbing'],
};

// Display names
const algorithmDisplayNames: Record<string, string> = {
  bubble: '🔵 Bubble Sort',
  hillClimbing: '⛰️ Hill Climbing',
};

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<VisualizerEngine>(new VisualizerEngine());
  const replayIntervalRef = useRef<number | null>(null);

  // Core state
  const [array, setArray] = useState<number[]>([]);
  const [arraySize, setArraySize] = useState<ArraySize>(50);
  const [selectedFeature, setSelectedFeature] = useState<Feature>('sorting');
  const [selectedAlgo, setSelectedAlgo] = useState<string>('bubble');
  const [playState, setPlayState] = useState<PlayState>('idle');
  const [speed, setSpeed] = useState<SpeedOption>('normal');
  const [metadata, setMetadata] = useState<string>('');

  // History state
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [currentHistoryIndex, setCurrentHistoryIndex] = useState<number>(-1);
  const prevFeatureRef = useRef<Feature>(selectedFeature);
  const prevAlgoRef = useRef<string>(selectedAlgo);

  // --- Core Functions ---

  const updateUIWithState = useCallback((state: VisualizationState) => {
    if (state.type === 'array') {
      setArray(state.data as number[]);
      if (canvasRef.current) {
        drawArray(canvasRef.current, state);
      }
    } else if (state.type === 'scatter') {
      if (canvasRef.current) {
        drawScatter(canvasRef.current, state);
      }
    }

    // Build metadata string
    let metaText = '';
    const m = state.metadata;
    if (m.comparisons !== undefined) {
      metaText = `Comparisons: ${m.comparisons} | Swaps: ${m.swaps || 0}`;
    } else if (m.generation !== undefined) {
      metaText = `Search: ${m.generation} | Best Fitness: ${(m.fitness || 0).toFixed(4)}`;
    }
    if (m.action) {
      metaText = metaText ? `${metaText} | ${m.action}` : m.action;
    }
    setMetadata(metaText);
  }, []);

  const startAlgorithm = useCallback(() => {
    if (!canvasRef.current) return;

    engineRef.current.pause();
    if (replayIntervalRef.current) {
      clearInterval(replayIntervalRef.current);
      replayIntervalRef.current = null;
    }

    let generator;
    if (selectedFeature === 'sorting' && selectedAlgo === 'bubble') {
      if (array.length === 0) return;
      generator = bubbleSortGenerator(array);
    } else if (selectedFeature === 'optimization' && selectedAlgo === 'hillClimbing') {
      generator = hillClimbingGenerator();
    } else {
      return;
    }

    // Reset history when starting fresh
    setHistory([]);
    setCurrentHistoryIndex(-1);

    engineRef.current.load(generator);
    engineRef.current.onUpdate = (state: VisualizationState) => {
      updateUIWithState(state);

      if (!replayIntervalRef.current) {
        setHistory((prev) => {
          const newEntry: HistoryEntry = {
            step: prev.length + 1,
            action: state.metadata.action || `Step ${prev.length + 1}`,
            state: JSON.parse(JSON.stringify(state)),
          };
          return [...prev, newEntry];
        });
        setCurrentHistoryIndex((prev) => prev + 1);
      }
    };

    setPlayState('playing');
    engineRef.current.play(SPEED_MAP[speed]);
  }, [selectedFeature, selectedAlgo, array, speed, updateUIWithState]);

  const pauseAlgorithm = useCallback(() => {
    engineRef.current.pause();
    if (replayIntervalRef.current) {
      clearInterval(replayIntervalRef.current);
      replayIntervalRef.current = null;
    }
    setPlayState('paused');
  }, []);

  const resumeAlgorithm = useCallback(() => {
    if (replayIntervalRef.current) {
      clearInterval(replayIntervalRef.current);
      replayIntervalRef.current = null;
    }
    setPlayState('playing');
    engineRef.current.play(SPEED_MAP[speed]);
  }, [speed]);

  const handlePlayButtonClick = useCallback(() => {
    if (playState === 'idle') {
      startAlgorithm();
    } else if (playState === 'playing') {
      pauseAlgorithm();
    } else if (playState === 'paused') {
      resumeAlgorithm();
    }
  }, [playState, startAlgorithm, pauseAlgorithm, resumeAlgorithm]);

  const generateArray = useCallback(() => {
    if (selectedFeature !== 'sorting') return;
    const newArr = Array.from(
      { length: arraySize },
      () => Math.floor(Math.random() * 200) + 1
    );
    setArray(newArr);
    engineRef.current.pause();
    if (replayIntervalRef.current) {
      clearInterval(replayIntervalRef.current);
      replayIntervalRef.current = null;
    }
    setPlayState('idle');
    setHistory([]);
    setCurrentHistoryIndex(-1);
    if (canvasRef.current) {
      drawArray(canvasRef.current, {
        type: 'array',
        data: newArr,
        highlights: {},
        metadata: { action: 'Ready to sort!' },
      });
    }
    setMetadata('Ready to sort!');
  }, [selectedFeature, arraySize]);

// --- Updated "Next" Button Logic ---
const stepForward = useCallback(() => {
  // 1. If playing, pause first
  if (playState === 'playing') {
    engineRef.current.pause();
    if (replayIntervalRef.current) {
      clearInterval(replayIntervalRef.current);
      replayIntervalRef.current = null;
    }
    setPlayState('paused');
  }

  // 2. Check if we are browsing PAST history (i.e., currentIndex < history.length - 1)
  if (history.length > 0 && currentHistoryIndex < history.length - 1) {
    // Navigate to the next step in the stored history
    const nextIndex = currentHistoryIndex + 1;
    const nextEntry = history[nextIndex];
    if (nextEntry) {
      updateUIWithState(nextEntry.state);
      setCurrentHistoryIndex(nextIndex);
      // Ensure the engine stays paused
      engineRef.current.pause();
      setPlayState('paused');
      return;
    }
  }

  // 3. If we reached here, we are at the LATEST step. 
  //    We need to generate a NEW step from the engine.
  if (selectedFeature === 'sorting' && array.length === 0) return;

  // Check if the engine has a generator loaded. If not, load one.
  if (!engineRef.current['generator']) {
    let generator;
    if (selectedFeature === 'sorting' && selectedAlgo === 'bubble') {
      if (array.length === 0) return;
      generator = bubbleSortGenerator(array);
    } else if (selectedFeature === 'optimization' && selectedAlgo === 'hillClimbing') {
      generator = hillClimbingGenerator();
    } else {
      return;
    }

    // Set up the engine with the generator and the update callback
    engineRef.current.load(generator);
    engineRef.current.onUpdate = (state: VisualizationState) => {
      updateUIWithState(state);
      // Push the new state to history
      setHistory((prev) => {
        const newEntry: HistoryEntry = {
          step: prev.length + 1,
          action: state.metadata.action || `Step ${prev.length + 1}`,
          state: JSON.parse(JSON.stringify(state)),
        };
        return [...prev, newEntry];
      });
      setCurrentHistoryIndex((prev) => prev + 1);
    };
  }

  // 4. Perform a single step from the engine
  engineRef.current.pause(); // Ensure paused
  setPlayState('paused');
  engineRef.current.step();

}, [currentHistoryIndex, history, playState, selectedFeature, selectedAlgo, array, updateUIWithState]);

  // --- Revert to History Step ---
  const revertToStep = useCallback(
    (targetIndex: number) => {
      if (targetIndex < 0 || targetIndex >= history.length) return;
      if (playState === 'playing') return;

      engineRef.current.pause();
      if (replayIntervalRef.current) {
        clearInterval(replayIntervalRef.current);
        replayIntervalRef.current = null;
      }

      const startIndex = currentHistoryIndex;
      if (startIndex >= targetIndex) {
        const entry = history[targetIndex];
        updateUIWithState(entry.state);
        setCurrentHistoryIndex(targetIndex);
        setPlayState('paused');
        return;
      }

      let current = startIndex;
      setPlayState('paused');

      replayIntervalRef.current = window.setInterval(() => {
        current++;
        if (current > targetIndex) {
          clearInterval(replayIntervalRef.current!);
          replayIntervalRef.current = null;
          setPlayState('paused');
          return;
        }
        const entry = history[current];
        if (entry) {
          updateUIWithState(entry.state);
          setCurrentHistoryIndex(current);
        }
      }, 20);
    },
    [history, currentHistoryIndex, playState, updateUIWithState]
  );

  // --- Speed change ---
  useEffect(() => {
    if (playState === 'playing') {
      engineRef.current.pause();
      engineRef.current.play(SPEED_MAP[speed]);
    }
  }, [speed, playState]);

  // --- Initialize ---
  useEffect(() => {
    generateArray();
    return () => {
      engineRef.current.pause();
      if (replayIntervalRef.current) {
        clearInterval(replayIntervalRef.current);
        replayIntervalRef.current = null;
      }
      if (canvasRef.current) {
        disposeScatterRenderer(canvasRef.current);
      }
    };
  }, [generateArray]);

  // --- Handle Feature / Algorithm switching ---
  useEffect(() => {
    engineRef.current.pause();
    if (replayIntervalRef.current) {
      clearInterval(replayIntervalRef.current);
      replayIntervalRef.current = null;
    }
    setPlayState('idle');
    setHistory([]);
    setCurrentHistoryIndex(-1);

    // Dispose 3D renderer if leaving optimization
    if (prevFeatureRef.current === 'optimization' && selectedFeature !== 'optimization') {
      if (canvasRef.current) {
        disposeScatterRenderer(canvasRef.current);
      }
    }
    prevFeatureRef.current = selectedFeature;
    prevAlgoRef.current = selectedAlgo;

    if (selectedFeature === 'sorting') {
      generateArray();
    } else {
      setMetadata('');
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
          ctx.fillStyle = '#a4b0be';
          ctx.font = '20px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(
            'Select "Play" to start searching!',
            canvasRef.current.width / 2,
            canvasRef.current.height / 2
          );
        }
      }
    }
  }, [selectedFeature, selectedAlgo, generateArray]);

  // --- Handle feature change -> reset algorithm to first in list ---
  const handleFeatureChange = (feature: Feature) => {
    setSelectedFeature(feature);
    const firstAlgo = featureAlgorithms[feature][0];
    setSelectedAlgo(firstAlgo);
  };

  // --- Play button config ---
  const getPlayButtonConfig = () => {
    if (playState === 'idle') return { text: '▶ Play', bg: '#2ed573' };
    if (playState === 'playing') return { text: '⏹ Stop', bg: '#ff4757' };
    return { text: '▶ Resume', bg: '#ffa502' };
  };
  const playConfig = getPlayButtonConfig();

  // --- Determine if sorting is active (for array-specific controls) ---
  const isSorting = selectedFeature === 'sorting';

  return (
    <div
      style={{
        height: '100vh',
        maxHeight: '100vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        padding: '16px 20px',
        fontFamily: 'sans-serif',
        background: '#0a0e1a',
        color: '#e2e8f0',
        boxSizing: 'border-box',
      }}
    >
      {/* Title */}
      <h1 style={{ textAlign: 'center', margin: '0 0 12px 0', fontSize: '24px', flexShrink: 0 }}>
        ⚡ Algorithm Visualizer
      </h1>

      {/* Controls Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '12px',
          flexWrap: 'wrap',
          marginBottom: '12px',
          alignItems: 'center',
          background: '#141b2d',
          padding: '10px 20px',
          borderRadius: '10px',
          border: '1px solid #1e293b',
          flexShrink: 0,
        }}
      >
        {/* Feature Dropdown */}
        <div>
          <label style={{ marginRight: '6px', fontWeight: 'bold', color: '#94a3b8', fontSize: '13px' }}>
            Feature:
          </label>
          <select
            value={selectedFeature}
            onChange={(e) => handleFeatureChange(e.target.value as Feature)}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              background: '#0f172a',
              color: '#e2e8f0',
              border: '1px solid #334155',
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            <option value="sorting">🔵 Sorting</option>
            <option value="optimization">🧠 Optimization</option>
          </select>
        </div>

        {/* Algorithm Dropdown */}
        <div>
          <label style={{ marginRight: '6px', fontWeight: 'bold', color: '#94a3b8', fontSize: '13px' }}>
            Algorithm:
          </label>
          <select
            value={selectedAlgo}
            onChange={(e) => setSelectedAlgo(e.target.value)}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              background: '#0f172a',
              color: '#e2e8f0',
              border: '1px solid #334155',
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            {featureAlgorithms[selectedFeature].map((algo) => (
              <option key={algo} value={algo}>
                {algorithmDisplayNames[algo]}
              </option>
            ))}
          </select>
        </div>

        {/* Array Size (Sorting only) */}
        {isSorting && (
          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>Size:</span>
            {([25, 50, 100, 200] as ArraySize[]).map((size) => (
              <button
                key={size}
                onClick={() => setArraySize(size)}
                style={{
                  padding: '4px 10px',
                  borderRadius: '4px',
                  border: 'none',
                  background: arraySize === size ? '#38bdf8' : 'transparent',
                  color: arraySize === size ? '#0a0e1a' : '#94a3b8',
                  fontSize: '12px',
                  fontWeight: arraySize === size ? 'bold' : 'normal',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {size}
              </button>
            ))}
          </div>
        )}

        {/* New Array (Sorting only) */}
        {isSorting && (
          <button
            onClick={generateArray}
            style={{ ...btnStyle, background: '#1e293b', border: '1px solid #334155', padding: '6px 14px' }}
          >
            🔄 New
          </button>
        )}

        {/* Play / Stop / Resume */}
        <button
          onClick={handlePlayButtonClick}
          style={{
            ...btnStyle,
            background: playConfig.bg,
            minWidth: '90px',
            fontWeight: 'bold',
            padding: '6px 16px',
          }}
        >
          {playConfig.text}
        </button>

        {/* Step */}
        <button
          onClick={stepForward}
          style={{ ...btnStyle, background: '#1e293b', border: '1px solid #334155', padding: '6px 14px' }}
          disabled={playState === 'playing'}
        >
          ⏭ Next
        </button>

        {/* Speed */}
        <div style={{ display: 'flex', gap: '4px', background: '#0f172a', padding: '4px', borderRadius: '6px' }}>
          {(['slow', 'normal', 'fast', 'turbo'] as SpeedOption[]).map((key) => (
            <button
              key={key}
              onClick={() => setSpeed(key)}
              style={{
                padding: '4px 10px',
                borderRadius: '4px',
                border: 'none',
                background: speed === key ? '#38bdf8' : 'transparent',
                color: speed === key ? '#0a0e1a' : '#94a3b8',
                fontSize: '11px',
                fontWeight: speed === key ? 'bold' : 'normal',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {key === 'slow' && '🐢'}
              {key === 'normal' && '🚶'}
              {key === 'fast' && '🏃'}
              {key === 'turbo' && '⚡'}
            </button>
          ))}
        </div>
      </div>

      {/* Main Area: Canvas + Sidebar (FIXED, NO SCROLL) */}
      <div
        style={{
          display: 'flex',
          gap: '0',
          flex: 1,
          minHeight: 0,
          overflow: 'hidden',
          background: '#141b2d',
          borderRadius: '10px',
          border: '1px solid #1e293b',
        }}
      >
        {/* Canvas */}
        <div
          style={{
            flex: 1,
            padding: '16px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: 0,
          }}
        >
          <canvas
            ref={canvasRef}
            width={800}
            height={400}
            style={{
              background: '#1a2340',
              borderRadius: '8px',
              width: '100%',
              height: '100%',
              maxHeight: '100%',
              objectFit: 'contain',
            }}
          />
        </div>

        {/* History Log Sidebar */}
        <div
          style={{
            height: '100%',
            minHeight: 0,
            width: '320px',
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <HistoryLog
            history={history}
            currentIndex={currentHistoryIndex}
            onSelect={revertToStep}
            isPlaying={playState === 'playing'}
          />
        </div>
      </div>

      {/* Metadata & Legend */}
      <div
        style={{
          marginTop: '10px',
          padding: '8px 16px',
          background: '#141b2d',
          borderRadius: '8px',
          border: '1px solid #1e293b',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0,
          flexWrap: 'wrap',
          gap: '8px',
        }}
      >
        <span style={{ fontSize: '14px', color: '#94a3b8', fontFamily: 'monospace' }}>
          {metadata || 'Select an algorithm and press Play.'}
        </span>

        {isSorting && (
          <div style={{ fontSize: '12px', color: '#64748b', display: 'flex', gap: '12px' }}>
            <span style={{ color: '#38bdf8' }}>🟦 Unsorted</span>
            <span style={{ color: '#facc15' }}>🟨 Comparing</span>
            <span style={{ color: '#f87171' }}>🟥 Swapping</span>
            <span style={{ color: '#4ade80' }}>🟩 Sorted</span>
          </div>
        )}
      </div>
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  padding: '6px 14px',
  border: 'none',
  borderRadius: '6px',
  color: 'white',
  fontWeight: '500',
  cursor: 'pointer',
  fontSize: '13px',
  transition: 'all 0.2s ease',
  background: '#3742fa',
};

export default App;