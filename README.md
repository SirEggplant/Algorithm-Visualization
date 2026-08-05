# Algorithm Visualizer

A modular, extensible interactive platform for visualizing sorting algorithms, search algorithms, and optimization techniques. Built with React, TypeScript, and Vite.

---

## Features

### Sorting Algorithms
- **Bubble Sort** – Classic adjacent comparison sort.
- **Merge Sort** – Divide-and-conquer with recursive merging.
- **Quick Sort** – Efficient pivot-based partitioning.
- **Insertion Sort** – Builds the sorted array one element at a time.
- **Timsort** – Hybrid of Merge Sort and Insertion Sort (used in Python).
- **Introsort** – Hybrid of Quick Sort, Heap Sort, and Insertion Sort.

*Easily add more sorting algorithms via the Registry.*

### Optimization Algorithms
- **Hill Climbing** – Greedy local search with configurable restarts. Visualized on a 3D fitness landscape.
- **Simulated Annealing** – Probabilistic search that mimics the cooling of metals, escaping local peaks.
- **Genetic Algorithm** – Population-based optimization with selection, crossover, and mutation.
- **Particle Swarm Optimization** – Swarm intelligence where particles converge on high-fitness regions.

### Interactive UI
- **Split Screen Mode** – Compare two algorithms side-by-side on the same data.
- **Step-by-Step History** – Replay any step with a single click (sorting only).
- **Algorithm Details** – View time and space complexity for each algorithm.
- **Multiple Array Sizes** – Choose from 25, 50, 100, or 200 elements.
- **Multiple Mountain Sizes** – Four unique fitness landscapes with hardcoded global maxima.
- **Speed Controls** – Slow, Normal, Fast, and Turbo modes.

### Planned Features
- **Pathfinding** – A*, Dijkstra, and BFS on grid-based maps.

---

## Architecture

```
src/
├── core/                        # Shared engine & types
│   ├── engine.ts                # Play/Pause/Step generator engine
│   └── types.ts                 # Universal state contracts
│
├── algorithms/                  # Algorithm implementations
│   ├── sorting/
│   │   ├── bubbleSort.ts
│   │   ├── mergeSort.ts
│   │   ├── quickSort.ts
│   │   ├── insertionSort.ts
│   │   ├── timsort.ts
│   │   └── introsort.ts
│   ├── optimization/
│   │   ├── hillClimbing.ts
│   │   ├── simulatedAnnealing.ts
│   │   ├── geneticAlgorithm.ts
│   │   └── particleSwarm.ts
│   └── registry.ts              # Single source of truth for all algorithms
│
├── renderers/
│   ├── arrayRenderer.ts         # Bar chart rendering (2D Canvas)
│   └── scatterRenderer.ts       # 3D scatter plot rendering (Three.js)
│
├── ui/
│   └── HistoryLog.tsx           # Step history sidebar (sorting only)
│
├── components/
│   ├── sorting/
│   │   └── SortingFeature.tsx
│   └── optimization/
│       └── OptimizationFeature.tsx
│
└── App.tsx                      # Main orchestrator
```

### How It Works

1. **The Engine (`core/engine.ts`)** – A generic playback engine that handles Play, Pause, Step, and Stop using JavaScript generators. It has no knowledge of specific algorithms or renderers.

2. **The Registry (`algorithms/registry.ts`)** – A single source of truth that registers every algorithm with its generator, display name, and metadata. Adding a new algorithm requires only one entry in the registry.

3. **The Renderers (`renderers/`)** – Pure drawing functions that take a `VisualizationState` and draw it on the canvas. They are completely decoupled from algorithm logic.

4. **App.tsx** – The controller that connects the engine, registry, and renderers. It manages state, routing, and the UI.

### Data Flow

```
User clicks "Play"
        ↓
App.tsx loads the algorithm generator into the engine
        ↓
engine.play() steps through the generator
        ↓
Algorithm yields a VisualizationState
        ↓
engine.onUpdate() passes the state to App.tsx
        ↓
App.tsx routes the state to the appropriate renderer
        ↓
Renderer draws the state on the canvas
        ↓
User sees the animation
```

---

## Getting Started

### Prerequisites

- Node.js v18 or higher
- npm

### Installation

```bash

# Install dependencies
npm install

# Start the development server
npm run dev
```

The app will be available at `http://localhost:5173`.

### Building for Production

```bash
npm run build
```

---

## Adding a New Algorithm for Sorting

1. Create a generator function in the folder under `src/algorithms/sorting/`.
2. Have it yield `VisualizationState` objects at each meaningful step.
3. Register it in `algorithms/registry.ts` with a display name and metadata (time/space complexity, category, etc.).

The engine, UI, and history log all work automatically once an algorithm is registered.

---

## Technology Stack

| Technology | Purpose |
| :--- | :--- |
| React 18 | UI framework |
| TypeScript | Type safety and developer experience |
| Vite | Build tool and dev server |
| Three.js | 3D rendering for optimization landscapes |
| HTML5 Canvas | 2D rendering for bar charts |

---

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
