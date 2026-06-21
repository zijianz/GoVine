# Go Board

A Go (囲碁) board game app built with React + TypeScript + Vite.

## Quick Start

```bash
npm install
npm run dev
```

Opens at `http://localhost:5173`.

## Features

- **19×19 board** — click intersections to place stones, alternating black and white
- **Full Go rules** — capturing, suicide prohibition, ko rule
- **Revert** — undo the last move, captured stones return
- **Branch** — create alternative lines of play (SGF variations)
- **Show Index** — toggle move numbers on stones
- **Branch diagram** — visual game tree on the right, click nodes to navigate
- **Comments** — write notes for any position (left panel), saved in SGF
- **Save As / Open** — SGF file import/export with full branch and comment support

## Project Structure

```
src/
├── core/                    # Pure logic — no React
│   ├── types.ts             #   TypeScript types
│   ├── constants.ts         #   Board dimensions, star points, labels
│   ├── gameLogic.ts         #   Go rules engine
│   └── sgf.ts               #   SGF parser & generator
├── state/
│   └── gameReducer.ts       #   Reducer, tree ops, selectors
├── hooks/
│   └── useGame.ts           #   React hook (wires state to UI)
├── components/
│   ├── Board.tsx             #   SVG board
│   ├── Controls.tsx          #   Buttons & capture display
│   └── BranchDiagram.tsx     #   Game tree visualization
├── App.tsx                   #   Root layout
└── main.tsx                  #   Entry point
```

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server |
| `npm run build` | Type-check and build for production |
| `npm run preview` | Preview the production build |
