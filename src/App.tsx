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

const ARRAY_SIZE = 15;

type AlgorithmOption = 'bubble' | 'hillClimbing';
type PlayState = 'idle' | 'playing' | 'paused';
type SpeedOption = 'slow' | 'normal' | 'fast' | 'turbo';

const SPEED_MAP: Record<SpeedOption, number> = {
  slow: 300,
  normal: 100,
  fast: 30,
  turbo: 5,
};

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<VisualizerEngine>(new VisualizerEngine());
  const replayIntervalRef = useRef<number | null>(null);

  // Core state
  const [array, setArray] = useState<number[]>([]);
  const [selectedAlgo, setSelectedAlgo] = useState<AlgorithmOption>('bubble');
  const [playState, setPlayState] = useState<PlayState>('idle');
  const [speed, setSpeed] = useState<SpeedOption>('normal');
  const [metadata, setMetadata] = useState<string>('');

  // History state
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [currentHistoryIndex, setCurrentHistoryIndex] = useState<number>(-1);
  const prevAlgoRef = useRef<AlgorithmOption>(selectedAlgo);

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
    if (selectedAlgo === 'bubble') {
      if (array.length === 0) return;
      generator = bubbleSortGenerator(array);
    } else {
      generator = hillClimbingGenerator();
    }

    // Reset history when starting fresh
    setHistory([]);
    setCurrentHistoryIndex(-1);

    engineRef.current.load(generator);
    engineRef.current.onUpdate = (state: VisualizationState) => {
      // Update UI
      updateUIWithState(state);

      // Push to history (only if not in replay mode)
      if (!replayIntervalRef.current) {
        setHistory((prev) => {
          const newEntry: HistoryEntry = {
            step: prev.length + 1,
            action: state.metadata.action || `Step ${prev.length + 1}`,
            state: JSON.parse(JSON.stringify(state)), // Deep clone to preserve history
          };
          return [...prev, newEntry];
        });
        setCurrentHistoryIndex((prev) => prev + 1);
      }
    };

    setPlayState('playing');
    engineRef.current.play(SPEED_MAP[speed]);
  }, [selectedAlgo, array, speed, updateUIWithState]);

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
    if (selectedAlgo !== 'bubble') return;
    const newArr = Array.from({ length: ARRAY_SIZE }, () => Math.floor(Math.random() * 100) + 5);
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
        highlights: { indices: [] },
        metadata: { action: 'Ready to sort!' },
      });
    }
    setMetadata('Ready to sort!');
  }, [selectedAlgo]);

  const stepForward = useCallback(() => {
    if (selectedAlgo === 'bubble' && array.length === 0) return;
    engineRef.current.pause();
    if (replayIntervalRef.current) {
      clearInterval(replayIntervalRef.current);
      replayIntervalRef.current = null;
    }
    setPlayState('paused');
    if (!engineRef.current['generator']) {
      startAlgorithm();
    } else {
      engineRef.current.step();
    }
  }, [selectedAlgo, array, startAlgorithm]);

  // --- Revert to History Step with Fast Animation ---
  const revertToStep = useCallback(
    (targetIndex: number) => {
      if (targetIndex < 0 || targetIndex >= history.length) return;
      if (playState === 'playing') return; // Can't revert while playing

      // Pause everything
      engineRef.current.pause();
      if (replayIntervalRef.current) {
        clearInterval(replayIntervalRef.current);
        replayIntervalRef.current = null;
      }

      const startIndex = currentHistoryIndex;
      if (startIndex >= targetIndex) {
        // If going backwards or same, just jump instantly
        const entry = history[targetIndex];
        updateUIWithState(entry.state);
        setCurrentHistoryIndex(targetIndex);
        setPlayState('paused');
        return;
      }

      // Forward replay animation from startIndex+1 to targetIndex
      let current = startIndex;
      setPlayState('paused'); // Keep paused but visually replay

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
      }, 20); // 20ms per step = 50 steps/second (fast animation)
    },
    [history, currentHistoryIndex, playState, updateUIWithState]
  );

  // --- Speed change handler ---
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

  // --- Handle algorithm switching ---
  useEffect(() => {
    engineRef.current.pause();
    if (replayIntervalRef.current) {
      clearInterval(replayIntervalRef.current);
      replayIntervalRef.current = null;
    }
    setPlayState('idle');
    setHistory([]);
    setCurrentHistoryIndex(-1);

    if (prevAlgoRef.current === 'hillClimbing' && selectedAlgo === 'bubble') {
      if (canvasRef.current) {
        disposeScatterRenderer(canvasRef.current);
      }
    }
    prevAlgoRef.current = selectedAlgo;

    if (selectedAlgo === 'bubble') {
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
  }, [selectedAlgo, generateArray]);

  // --- Determine Play Button Text ---
  const getPlayButtonConfig = () => {
    if (playState === 'idle') return { text: '▶ Play', bg: '#2ed573' };
    if (playState === 'playing') return { text: '⏹ Stop', bg: '#ff4757' };
    return { text: '▶ Resume', bg: '#ffa502' };
  };

  const playConfig = getPlayButtonConfig();

  return (
    <div
      style={{
        height: '100vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        padding: '20px',
        fontFamily: 'sans-serif',
        background: '#0a0e1a',
        color: '#e2e8f0',
        boxSizing: 'border-box',
      }}
    >
      <h1 style={{ textAlign: 'center', marginBottom: '20px', flexShrink: 0 }}>
        ⚡ Algorithm Visualizer
      </h1>

      {/* Controls Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '16px',
          flexWrap: 'wrap',
          marginBottom: '20px',
          alignItems: 'center',
          background: '#141b2d',
          padding: '12px 24px',
          borderRadius: '12px',
          border: '1px solid #1e293b',
          flexShrink: 0,
        }}
      >
        {/* Algorithm Selector */}
        <div>
          <label htmlFor="algo-select" style={{ marginRight: '10px', fontWeight: 'bold', color: '#94a3b8' }}>
            Algorithm:
          </label>
          <select
            id="algo-select"
            value={selectedAlgo}
            onChange={(e) => setSelectedAlgo(e.target.value as AlgorithmOption)}
            style={{
              padding: '8px 14px',
              borderRadius: '6px',
              background: '#0f172a',
              color: '#e2e8f0',
              border: '1px solid #334155',
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            <option value="bubble">🔵 Bubble Sort</option>
            <option value="hillClimbing">⛰️ Hill Climbing</option>
          </select>
        </div>

        {/* New Array Button (Sorting only) */}
        {selectedAlgo === 'bubble' && (
          <button onClick={generateArray} style={{ ...btnStyle, background: '#1e293b', border: '1px solid #334155' }}>
            🔄 New Array
          </button>
        )}

        {/* Play/Stop/Resume Button */}
        <button
          onClick={handlePlayButtonClick}
          style={{
            ...btnStyle,
            background: playConfig.bg,
            minWidth: '100px',
            fontWeight: 'bold',
          }}
        >
          {playConfig.text}
        </button>

        {/* Step Button */}
        <button
          onClick={stepForward}
          style={{ ...btnStyle, background: '#1e293b', border: '1px solid #334155' }}
          disabled={playState === 'playing'}
        >
          ⏭ Step
        </button>

        {/* Speed Presets */}
        <div style={{ display: 'flex', gap: '4px', background: '#0f172a', padding: '4px', borderRadius: '8px' }}>
          {(['slow', 'normal', 'fast', 'turbo'] as SpeedOption[]).map((key) => (
            <button
              key={key}
              onClick={() => setSpeed(key)}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: 'none',
                background: speed === key ? '#38bdf8' : 'transparent',
                color: speed === key ? '#0a0e1a' : '#94a3b8',
                fontSize: '12px',
                fontWeight: speed === key ? 'bold' : 'normal',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {key === 'slow' && '🐢 Slow'}
              {key === 'normal' && '🚶 Normal'}
              {key === 'fast' && '🏃 Fast'}
              {key === 'turbo' && '⚡ Turbo'}
            </button>
          ))}
        </div>
      </div>

      {/* Main Area: Canvas + Sidebar */}
      <div
        style={{
          display: 'flex',
          gap: '0',
          flex: 1,
          minHeight: 0,
          overflow: 'hidden',
          background: '#141b2d',
          borderRadius: '12px',
          border: '1px solid #1e293b',
        }}
      >
        {/* Canvas Wrapper */}
        <div
          style={{
            flex: 1,
            padding: '20px',
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
              maxWidth: '800px',
              height: 'auto',
              aspectRatio: '800 / 400',
            }}
          />
        </div>

        {/* History Log Sidebar - Wrapped to fill height */}
        <div
          style={{
            height: '100%',
            minHeight: 0,
            width: '340px',
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

      {/* Metadata / Stats Bar */}
      <div
        style={{
          marginTop: '16px',
          padding: '12px 20px',
          background: '#141b2d',
          borderRadius: '8px',
          border: '1px solid #1e293b',
          textAlign: 'center',
          fontSize: '15px',
          color: '#94a3b8',
          fontFamily: 'monospace',
          flexShrink: 0,
        }}
      >
        {metadata || 'Select an algorithm and press Play.'}
      </div>

      {/* Legend */}
      {selectedAlgo === 'bubble' && (
        <div
          style={{
            marginTop: '12px',
            textAlign: 'center',
            fontSize: '13px',
            color: '#64748b',
            flexShrink: 0,
          }}
        >
          <span style={{ color: '#38bdf8' }}>🟦 Unsorted</span>
          {'  |  '}
          <span style={{ color: '#facc15' }}>🟨 Comparing</span>
          {'  |  '}
          <span style={{ color: '#f87171' }}>🟥 Swapping</span>
          {'  |  '}
          <span style={{ color: '#4ade80' }}>🟩 Sorted</span>
        </div>
      )}
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  padding: '10px 20px',
  border: 'none',
  borderRadius: '6px',
  color: 'white',
  fontWeight: '500',
  cursor: 'pointer',
  fontSize: '15px',
  transition: 'all 0.2s ease',
  background: '#3742fa',
};

export default App;