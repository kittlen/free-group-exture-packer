# Free Group Texture Packer

Create sprite sheets / texture atlases for games and websites. Pack individual images into a single atlas with auto-generated metadata.

Built on top of [odrick/free-tex-packer](https://github.com/odrick/free-tex-packer) — rewritten with **React 19 + Vite 8 + TypeScript 6 + Ant Design 5 + Tailwind 3 + Zustand 5 + Electron**.

## Features

- **Multiple packers**: MaxRects (5 strategies), simple strip packing, optimal mode (tries all combinations)
- **18 export formats**: JSON (hash/array), XML, CSS, Pixi.js, Phaser (2/3), Spine, Cocos2d, Starling, Unity3D, UnrealEngine, Godot, UIKit, Egret2D
- **Image groups**: organize images into groups, each group packs to a separate atlas
- **Filters**: Grayscale, Mask, and TinyPNG compression (Electron only)
- **Auto-trim**: automatically removes transparent borders
- **Dark mode**: built-in dark theme

## Screenshots

| Batch import | Group packing | Group merging |
|---|---|---|
| ![Batch import](docs/img1.png) | ![Group packing](docs/img2.png) | ![Group merging](docs/img3.png) |

## Quick Start

```bash
# Web development
pnpm dev

# Electron development
pnpm dev:electron

# Build for production
pnpm build              # Web build
pnpm build:electron     # Electron installer
```

## Usage

1. Open the app in browser (`pnpm dev`) or run desktop app
2. Drag & drop images or use the file picker
3. Configure packing parameters (algorithm, padding, trim, etc.)
4. Click **Pack** to generate the atlas
5. Choose an export format and download

## Tech Stack


| Layer          | Choice                              |
| -------------- | ----------------------------------- |
| Framework      | React 19                            |
| Desktop        | Electron 35                         |
| Language       | TypeScript 6                        |
| UI Library     | Ant Design 5                        |
| Styling        | Tailwind 3                          |
| State          | Zustand 5                           |
| Build          | Vite 8                              |
| Packing Engine | maxrects-packer, custom MaxRectsBin |

## Project Structure

```
src/
  app/          — Types, Zustand store, i18n
  core/         — Packing engine (PackProcessor, packers, Rect, Trimmer)
  features/     — Images panel, pack properties, results, export, filters
  platform/     — Web / Electron abstraction layer
  components/   — Shared UI components
  utils/        — Utility functions
electron/
  main.ts       — Electron main process
  preload.cjs   — Preload script (contextBridge)
```

## Export Formats

Currently JSON (hash) and JSON (array) have dedicated TypeScript renderers. Other formats fall back to JSON (hash).

## Repositories

- GitHub: https://github.com/kittlen/free-group-exture-packer
- Gitee: https://gitee.com/kittlen/free-group-exture-packer

## License

MIT
