# ⚡ Algorithm Visualizer

A modular, extensible interactive platform for visualizing sorting algorithms, search algorithms, and evolutionary simulations. Built with React, TypeScript, and Vite.

## ✨ Features

### 🔵 Sorting Algorithms
- **Bubble Sort** – Classic adjacent comparison sort.
- **Merge Sort** – Divide-and-conquer with recursive merging.
- **Quick Sort** – Efficient pivot-based partitioning.
- **Insertion Sort** – Builds the sorted array one element at a time.
- **Timsort** – Hybrid of Merge Sort and Insertion Sort (used in Python).
- **Introsort** – Hybrid of Quick Sort, Heap Sort, and Insertion Sort.
- *Easily add more sorting algorithms via the Registry.*

### 🧬 Future Features (Planned)
- **Hill Climbing** – Greedy local search with a 3D interactive mountain visualization. *(in progress)*
- Genetic Algorithm (Ecosystem Simulation)
- Firefly Algorithm (Swarm Intelligence)
- Pathfinding (A*, Dijkstra)

### 🎨 Interactive UI
- **Split Screen Mode** – Compare two algorithms side-by-side on the same data.
- **Step-by-Step History** – Replay any step with a single click.
- **Algorithm Details** – View time and space complexity for each algorithm.
- **Multiple Array Sizes** – Choose from 25, 50, 100, or 200 elements.
- **Speed Controls** – Slow, Normal, Fast, and Turbo modes.

## 🏗️ Architecture

### Core Components

```
src/
├── core/                  # Shared engine & types
│   ├── engine.ts          # Play/Pause/Step generator engine
│   └── types.ts           # Universal state contracts
│
├── algorithms/            # Algorithm implementations
│   ├── sorting/           # All sorting algorithms
│   │   ├── bubbleSort.ts
│   │   ├── mergeSort.ts
│   │   ├── quickSort.ts
│   │   ├── insertionSort.ts
│   │   ├── timsort.ts
│   │   └── introsort.ts
│   ├── hillClimbing/       # Search/optimization algorithms (in progress)
│   │   └── peakFinder.ts
│   └── registry.ts        # Single source of truth for ALL algorithms
│
├── renderers/              # Canvas drawing functions
│   ├── arrayRenderer.ts    # Renders bar charts
│   └── scatterRenderer.ts  # Renders 3D scatter plots (Three.js)
│
├── ui/                     # React components
│   └── HistoryLog.tsx      # Step history sidebar
│
└── App.tsx                 # Main orchestrator
```

### How It Works

1. **The Engine (`core/engine.ts`)** – A generic playback engine that handles Play, Pause, Step, and Stop using JavaScript generators. It doesn't know about specific algorithms or renderers.

2. **The Registry (`algorithms/registry.ts`)** – A single source of truth that registers every algorithm with its generator, display name, and metadata. Adding a new algorithm is as simple as adding one entry to the registry.

3. **The Renderers (`renderers/`)** – Pure drawing functions that take a `VisualizationState` and draw it on the canvas. They are completely decoupled from algorithm logic.

4. **App.tsx** – The controller that connects the engine, registry, and renderers. It manages state, routing, and the UI.

### The Data Flow

```
User clicks "Play"
    ↓
App.tsx calls engine.load(algorithmGenerator)
    ↓
engine.play() starts the generator
    ↓
Algorithm yields a VisualizationState (e.g., { type: 'array', data: [...], highlights: {...} })
    ↓
engine.onUpdate() passes the state to App.tsx
    ↓
App.tsx routes the state to the appropriate renderer (drawArray or drawScatter)
    ↓
Renderer draws the state on the canvas
    ↓
User sees the animation
```

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/algorithm-visualizer.git
cd algorithm-visualizer

# Install dependencies
npm install

# Start the development server
npm run dev
```

The app will be available at `http://localhost:5173`.

## 🧩 Adding a New Algorithm

1. Create a generator function in the appropriate folder under `src/algorithms/`.
2. Have it `yield` `VisualizationState` objects at each meaningful step.
3. Register it in `algorithms/registry.ts` with a display name and metadata (time/space complexity, category, etc.).
4. If it needs a new visual format, add a renderer in `src/renderers/`.

That's it — the engine, UI, and history log all work automatically once an algorithm is registered.
