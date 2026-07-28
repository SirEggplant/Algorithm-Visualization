// src/components/optimization/OptimizationFeature.tsx
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { VisualizerEngine } from '../../core/engine';
import type { VisualizationState, Point } from '../../core/types';
import { drawScatter, resetCamera, disposeScatterRenderer, rebuildTerrain, clearScene } from './scatterRenderer';
import {
  getAlgorithmIds,
  getDisplayName,
  getInfo,
  getGenerator,
  getDefaultAlgorithm,
} from '../../algorithms/registry';
import { hillClimbingGenerator } from '../../algorithms/optimization/hillClimbing';
import { hillClimbingRestartGenerator } from '../../algorithms/optimization/hillClimbingRestart';

type Feature = 'sorting' | 'optimization';
type PlayState = 'idle' | 'playing' | 'paused';
type SpeedOption = 'slow' | 'normal' | 'fast' | 'turbo';
type MountainSize = 'small' | 'medium' | 'large' | 'xlarge';

const SPEED_MAP: Record<SpeedOption, number> = {
  slow: 300,
  normal: 100,
  fast: 30,
  turbo: 5,
};

const featureDisplayNames: Record<Feature, string> = {
  sorting: '🔵 Sorting',
  optimization: '🧠 Optimization',
};

// ─── 4 UNIQUE MOUNTAIN CONFIGURATIONS ───
const MOUNTAIN_CONFIGS: Record<MountainSize, { range: number; resolution: number; scale: number }> = {
  small: { range: 4, resolution: 50, scale: 1.2 },
  medium: { range: 6, resolution: 70, scale: 1.8 },
  large: { range: 8, resolution: 90, scale: 2.5 },
  xlarge: { range: 10, resolution: 110, scale: 3.5 },
};

// ─── 4 DIFFERENT FITNESS FUNCTIONS ───
// These are used by the algorithms, NOT the renderer.
// The renderer uses a fixed fitness function for terrain.
const fitnessFunctions = {
  small: (x: number, y: number): number => {
    return 0.6 * Math.sin(x) * Math.cos(y) +
           0.4 * Math.sin(x * 1.5 + 0.5) * Math.cos(y * 1.2 - 0.3) +
           0.3 * Math.exp(-((x - 1.5) ** 2 + (y - 1.5) ** 2) / 3);
  },
  medium: (x: number, y: number): number => {
    return 0.8 * Math.sin(x) * Math.cos(y) +
           0.6 * Math.sin(x * 1.7 + 1.2) * Math.cos(y * 1.3 - 0.8) +
           0.5 * Math.cos(x * 0.7 - 0.5) * Math.sin(y * 0.9 + 0.7) +
           0.4 * Math.exp(-((x - 2) ** 2 + (y + 1.5) ** 2) / 2.5);
  },
  large: (x: number, y: number): number => {
    return 1.0 * Math.sin(x) * Math.cos(y) +
           0.8 * Math.sin(x * 2.1 + 0.7) * Math.cos(y * 1.8 - 1.2) +
           0.6 * Math.cos(x * 0.5 + 1.3) * Math.sin(y * 0.7 - 0.9) +
           0.5 * Math.sin(x * 0.3 + 0.2) * Math.sin(y * 0.4 + 0.5) * 1.5 +
           0.4 * Math.exp(-((x + 2.5) ** 2 + (y - 2) ** 2) / 2);
  },
  xlarge: (x: number, y: number): number => {
    return 1.2 * Math.sin(x) * Math.cos(y) +
           1.0 * Math.sin(x * 2.5 + 0.3) * Math.cos(y * 2.2 - 0.5) +
           0.8 * Math.cos(x * 0.6 + 1.7) * Math.sin(y * 0.8 - 1.1) +
           0.6 * Math.sin(x * 0.4 + 0.8) * Math.sin(y * 0.5 + 1.3) * 1.8 +
           0.5 * Math.sin(x * 1.2 - 0.5) * Math.cos(y * 1.5 + 0.9) +
           0.4 * Math.exp(-((x + 3) ** 2 + (y - 2.5) ** 2) / 1.8);
  },
};

const getFitnessFunction = (size: MountainSize) => fitnessFunctions[size];

interface OptimizationFeatureProps {
  selectedFeature: Feature;
  setSelectedFeature: (feature: Feature) => void;
}

const OptimizationFeature: React.FC<OptimizationFeatureProps> = ({
  selectedFeature,
  setSelectedFeature,
}) => {
  // ─── Refs ───
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<VisualizerEngine>(new VisualizerEngine());

  // ─── Core State ───
  const [selectedAlgo, setSelectedAlgo] = useState<string>(getDefaultAlgorithm('optimization'));
  const [mountainSize, setMountainSize] = useState<MountainSize>('medium');
  const [playState, setPlayState] = useState<PlayState>('idle');
  const [speed, setSpeed] = useState<SpeedOption>('normal');
  const [metadata, setMetadata] = useState<string>('');
  const [showDetails, setShowDetails] = useState<boolean>(false);

  // ─── Step & Fitness Counters ───
  const stepCount = useRef<number>(0);
  const bestFitness = useRef<number>(-Infinity);
  const isFinished = useRef<boolean>(false);

  // ─── Algorithm Parameters ───
  const [restarts, setRestarts] = useState<number>(20);

  const algorithmIds = getAlgorithmIds('optimization');
  const currentAlgoInfo = getInfo('optimization', selectedAlgo);

  // ─── Draw the mountain ───
  const drawMountain = useCallback(() => {
    if (!canvasRef.current) return;
    const emptyState: VisualizationState = {
      type: 'scatter',
      data: [] as Point[],
      highlights: { coordinates: [] },
      metadata: {},
    };
    drawScatter(canvasRef.current, emptyState);
  }, []);

  // ─── FULL RESET ───
  const fullReset = useCallback(() => {
    if (!canvasRef.current) return;

    engineRef.current.pause();
    engineRef.current['generator'] = null;

    clearScene(canvasRef.current);
    resetCamera(canvasRef.current);

    setPlayState('idle');
    setMetadata('Ready to explore!');
    stepCount.current = 0;
    bestFitness.current = -Infinity;
    isFinished.current = false;

    drawMountain();
  }, [drawMountain]);

  const updateUIWithState = useCallback((state: VisualizationState) => {
    if (!canvasRef.current) return;
    drawScatter(canvasRef.current, state);

    let metaText = '';
    const m = state.metadata;
    if (m.generation !== undefined) {
      stepCount.current = m.generation;
      metaText = `Step: ${m.generation}`;
    }
    if (m.fitness !== undefined) {
      bestFitness.current = m.fitness;
      metaText = metaText ? `${metaText} | Best Fitness: ${m.fitness.toFixed(4)}` : `Best Fitness: ${m.fitness.toFixed(4)}`;
    }
    if (m.action) {
      metaText = metaText ? `${metaText} | ${m.action}` : m.action;
    }
    setMetadata(metaText);

    // ─── FIXED: Only stop on FINAL message ───
    if (m.action?.includes('✅ Complete!') || m.action?.includes('Stuck') || m.action?.includes('Global')) {
      isFinished.current = true;
      setPlayState('idle');
      if (!m.action?.includes('✅ Complete!')) {
        setMetadata(`${metaText} | ✅ Done! Press Play to run again.`);
      }
    }
  }, []);

  // ─── Get generator ───
  const getAlgorithmGenerator = useCallback(() => {
    const config = MOUNTAIN_CONFIGS[mountainSize];
    const range = config.range;
    const scale = config.scale;
    const STEP_SIZE = 0.15;
    const fitnessFn = getFitnessFunction(mountainSize);

    switch (selectedAlgo) {
      case 'hillClimbing':
        return hillClimbingGenerator(STEP_SIZE, range, scale, fitnessFn);
      case 'hillClimbingRestart':
        return hillClimbingRestartGenerator(STEP_SIZE, restarts, range, scale, fitnessFn);
      default:
        return getGenerator('optimization', selectedAlgo, []);
    }
  }, [selectedAlgo, mountainSize, restarts]);

  // ─── Start Algorithm ───
  const startAlgorithm = useCallback(() => {
    if (!canvasRef.current) return;

    clearScene(canvasRef.current);

    stepCount.current = 0;
    bestFitness.current = -Infinity;
    isFinished.current = false;
    setPlayState('playing');

    const generator = getAlgorithmGenerator();
    if (!generator) {
      setPlayState('idle');
      return;
    }

    engineRef.current.load(generator);
    engineRef.current.onUpdate = (state: VisualizationState) => {
      updateUIWithState(state);
    };

    engineRef.current.play(SPEED_MAP[speed]);
  }, [speed, updateUIWithState, getAlgorithmGenerator]);

  // ─── Pause ───
  const pauseAlgorithm = useCallback(() => {
    engineRef.current.pause();
    setPlayState('paused');
  }, []);

  // ─── Resume ───
  const resumeAlgorithm = useCallback(() => {
    setPlayState('playing');
    engineRef.current.play(SPEED_MAP[speed]);
  }, [speed]);

  // ─── Play/Pause/Resume ───
  const handlePlayButtonClick = useCallback(() => {
    if (playState === 'idle') {
      startAlgorithm();
    } else if (playState === 'playing') {
      pauseAlgorithm();
    } else if (playState === 'paused') {
      resumeAlgorithm();
    }
  }, [playState, startAlgorithm, pauseAlgorithm, resumeAlgorithm]);

  // ─── Play button config ───
  const getPlayButtonConfig = () => {
    if (playState === 'idle') return { text: '▶ Play', bg: '#2ed573' };
    if (playState === 'playing') return { text: '⏹ Stop', bg: '#ff4757' };
    return { text: '▶ Resume', bg: '#ffa502' };
  };
  const playConfig = getPlayButtonConfig();

  // ─── Handle feature change ───
  const handleFeatureChange = (feature: Feature) => {
    setSelectedFeature(feature);
  };

  // ─── Rebuild terrain when mountain size changes ───
  useEffect(() => {
    if (!canvasRef.current) return;
    const config = MOUNTAIN_CONFIGS[mountainSize];
    rebuildTerrain(canvasRef.current, config.range, config.resolution);
    fullReset();
  }, [mountainSize, fullReset]);

  // ─── Initial draw ───
  useEffect(() => {
    drawMountain();
    return () => {
      if (canvasRef.current) {
        disposeScatterRenderer(canvasRef.current);
      }
      engineRef.current.pause();
    };
  }, []);

  // ─── Speed change handler ───
  useEffect(() => {
    if (playState === 'playing') {
      engineRef.current.pause();
      engineRef.current.play(SPEED_MAP[speed]);
    }
  }, [speed, playState]);

  const hasParameters = selectedAlgo === 'hillClimbingRestart';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        padding: 0,
        background: 'transparent',
      }}
    >
      {/* ─── SINGLE UNIFIED CONTROLS BAR ─── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '8px',
          marginBottom: '12px',
          background: '#141b2d',
          padding: '10px 20px',
          borderRadius: '10px',
          border: '1px solid #1e293b',
          flexShrink: 0,
        }}
      >
        {/* ─── LEFT SIDE: Main Controls ─── */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '12px',
            alignItems: 'center',
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
                padding: '4px 10px',
                borderRadius: '6px',
                background: '#0f172a',
                color: '#e2e8f0',
                border: '1px solid #334155',
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              {(['sorting', 'optimization'] as Feature[]).map((feature) => (
                <option key={feature} value={feature}>
                  {featureDisplayNames[feature]}
                </option>
              ))}
            </select>
          </div>

          {/* Algorithm Selector */}
          <div>
            <label style={{ marginRight: '6px', fontWeight: 'bold', color: '#94a3b8', fontSize: '12px' }}>
              Algo:
            </label>
            <select
              value={selectedAlgo}
              onChange={(e) => {
                setSelectedAlgo(e.target.value);
                setShowDetails(false);
              }}
              style={{
                padding: '4px 8px',
                borderRadius: '6px',
                background: '#0f172a',
                color: '#e2e8f0',
                border: '1px solid #334155',
                fontSize: '12px',
                cursor: 'pointer',
              }}
              disabled={playState === 'playing'}
            >
              {algorithmIds.map((id) => (
                <option key={id} value={id}>
                  {getDisplayName('optimization', id)}
                </option>
              ))}
            </select>
            <button
              onClick={() => setShowDetails(!showDetails)}
              style={{
                background: showDetails ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                border: '1px solid #475569',
                borderRadius: '4px',
                color: showDetails ? '#38bdf8' : '#94a3b8',
                padding: '2px 6px',
                fontSize: '11px',
                cursor: 'pointer',
                lineHeight: '1.4',
                transition: 'all 0.2s',
                marginLeft: '2px',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#38bdf8')}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#475569')}
            >
              📖
            </button>
          </div>

          {/* Reset Button */}
          <button
            onClick={fullReset}
            style={{ ...btnStyle, background: '#1e293b', border: '1px solid #334155', padding: '6px 14px' }}
            title="Reset visualization"
          >
            🔄 Reset
          </button>

          {/* Play / Stop / Resume */}
          <button
            onClick={handlePlayButtonClick}
            style={{
              ...btnStyle,
              background: playConfig.bg,
              width: '110px',
              fontWeight: 'bold',
              padding: '6px 16px',
            }}
          >
            {playConfig.text}
          </button>

          {/* Mountain Size */}
          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>Size:</span>
            {(['small', 'medium', 'large', 'xlarge'] as MountainSize[]).map((size) => (
              <button
                key={size}
                onClick={() => setMountainSize(size)}
                style={{
                  padding: '4px 8px',
                  borderRadius: '4px',
                  border: 'none',
                  background: mountainSize === size ? '#38bdf8' : 'transparent',
                  color: mountainSize === size ? '#0a0e1a' : '#94a3b8',
                  fontSize: '11px',
                  fontWeight: mountainSize === size ? 'bold' : 'normal',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  opacity: playState === 'playing' ? 0.5 : 1,
                }}
                disabled={playState === 'playing'}
              >
                {size === 'small' && 'Small'}
                {size === 'medium' && 'Medium'}
                {size === 'large' && 'Large'}
                {size === 'xlarge' && 'X-Large'}
              </button>
            ))}
          </div>

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

        {/* ─── RIGHT SIDE: Algorithm Parameters ─── */}
        {hasParameters && (
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '12px',
              alignItems: 'center',
              borderLeft: '1px solid #1e293b',
              paddingLeft: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontSize: '11px', color: '#94a3b8' }}>Restarts:</span>
              <select
                value={restarts}
                onChange={(e) => setRestarts(parseInt(e.target.value))}
                disabled={playState === 'playing'}
                style={{
                  padding: '2px 6px',
                  borderRadius: '4px',
                  background: '#0f172a',
                  color: '#e2e8f0',
                  border: '1px solid #334155',
                  fontSize: '11px',
                  cursor: 'pointer',
                }}
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>
        )}

        {!hasParameters && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              borderLeft: '1px solid #1e293b',
              paddingLeft: '12px',
            }}
          >
            <span style={{ fontSize: '11px', color: '#64748b' }}>⚙️ No parameters</span>
          </div>
        )}
      </div>

      {/* ─── MAIN AREA: 3D Canvas ─── */}
      <div
        style={{
          display: 'flex',
          flex: 1,
          minHeight: 0,
          overflow: 'hidden',
          background: '#141b2d',
          borderRadius: '10px',
          border: '1px solid #1e293b',
        }}
      >
        <div
          style={{
            flex: 1,
            padding: '8px',
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
              borderRadius: '6px',
              width: '100%',
              height: '100%',
              maxHeight: '100%',
              objectFit: 'contain',
            }}
          />
        </div>
      </div>

      {/* ─── STATUS BAR ─── */}
      <div
        style={{
          marginTop: '10px',
          padding: '8px 16px',
          background: '#141b2d',
          borderRadius: '8px',
          border: '1px solid #1e293b',
          textAlign: 'center',
          fontSize: '14px',
          color: '#94a3b8',
          fontFamily: 'monospace',
          flexShrink: 0,
        }}
      >
        {metadata || 'Select an algorithm and press Play!'}
      </div>

      {/* ─── DETAILS POPUP ─── */}
      {showDetails && currentAlgoInfo && (
        <div
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 1000,
            padding: '20px 24px',
            background: '#0f172a',
            border: '1px solid #334155',
            borderRadius: '12px',
            width: '400px',
            maxWidth: '90vw',
            boxShadow: '0 20px 60px rgba(0,0,0,0.95)',
            pointerEvents: 'auto',
          }}
        >
          <button
            onClick={() => setShowDetails(false)}
            style={{
              position: 'absolute',
              top: '8px',
              right: '12px',
              background: 'transparent',
              border: 'none',
              color: '#64748b',
              cursor: 'pointer',
              fontSize: '24px',
              lineHeight: '1',
            }}
          >
            ✕
          </button>
          <h4 style={{ margin: '0 0 8px 0', color: '#e2e8f0', fontSize: '22px', fontWeight: 'bold' }}>
            {currentAlgoInfo.name}
          </h4>
          <p style={{ margin: '0 0 12px 0', fontSize: '16px', color: '#94a3b8', lineHeight: '1.5' }}>
            {currentAlgoInfo.description}
          </p>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '12px',
              fontSize: '13px',
              color: '#64748b',
              borderTop: '1px solid #1e293b',
              paddingTop: '10px',
              marginTop: '4px',
            }}
          >
            <span>⚡ Best: {currentAlgoInfo.bestCase}</span>
            <span>📊 Avg: {currentAlgoInfo.avgCase}</span>
            <span>🐌 Worst: {currentAlgoInfo.worstCase}</span>
            <span>💾 Space: {currentAlgoInfo.spaceComplexity}</span>
          </div>
        </div>
      )}
    </div>
  );
};

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

export default OptimizationFeature;