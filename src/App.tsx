// src/App.tsx
import React, { useState } from 'react';
import SortingFeature from './components/sorting/SortingFeature';
import OptimizationFeature from './components/optimization/OptimizationFeature';

type Feature = 'sorting' | 'optimization';

function App() {
  const [selectedFeature, setSelectedFeature] = useState<Feature>('sorting');
  const [isSplit, setIsSplit] = useState(false);

  const handleSplitToggle = () => {
    setIsSplit((prev) => !prev);
  };

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
      <h1 style={{ textAlign: 'center', margin: '0 0 12px 0', fontSize: '24px', flexShrink: 0 }}>
        ⚡ Algorithm Visualizer
      </h1>

      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {selectedFeature === 'sorting' ? (
          <SortingFeature
            isSplit={isSplit}
            onSplitToggle={handleSplitToggle}
            selectedFeature={selectedFeature}
            setSelectedFeature={setSelectedFeature}
          />
        ) : (
          <OptimizationFeature
            selectedFeature={selectedFeature}
            setSelectedFeature={setSelectedFeature}
          />
        )}
      </div>
    </div>
  );
}

export default App;