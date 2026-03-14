# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TimeWise is a desktop application built with Electron + Vite + React + TypeScript. It uses Electron Forge for building, packaging, and distribution.

## Commands

- `npm run dev` — Start the app in development mode (electron-forge start)
- `npm run package` — Package the app for distribution
- `npm run make` — Create platform-specific distributables (Squirrel/Windows, ZIP/macOS, DEB+RPM/Linux)
- `npm run lint` — Run ESLint on .ts and .tsx files

## Architecture

The app follows Electron's multi-process architecture with Vite as the bundler:

- **Main process** (`src/main.ts`) — Creates the BrowserWindow, handles app lifecycle. Entry point compiles to `.vite/build/main.js`.
- **Preload script** (`src/preload.ts`) — Bridge between main and renderer processes (currently empty).
- **Renderer process** — Two entry points:
  - `src/renderer.ts` — Auto-loaded by Vite, imports global CSS (`src/index.css`)
  - `src/render/main.tsx` — React app entry, mounts `<App />` into `#root`
- **React UI** lives in `src/render/` with `index.html` as the HTML template and `App.tsx` as the root component.

Vite configs are split per target: `vite.main.config.ts` (main process), `vite.preload.config.ts` (preload), `vite.renderer.config.mjs` (renderer/React).

## Key Configuration

- `forge.config.ts` — Electron Forge config including makers and Fuse security settings
- `forge.env.d.ts` — Type declarations for Vite/Forge globals (e.g., `MAIN_WINDOW_VITE_DEV_SERVER_URL`)
- TypeScript targets ESNext with CommonJS modules
- ESLint uses `@typescript-eslint` parser with recommended rules + import plugin


## Что требуется сделать
- Определять активное окно в Windows (какое приложение сейчас на переднем плане)

- Хранить и агрегировать данные (аналогично расширению, но теперь для всех приложений)

Библиотеки для определения активного окна

active-win	Самая популярная (750+ звезд), получает заголовок, ID, владельца, URL (для браузеров)	[npm]

┌─────────────────────────────────────────────────────────────┐
│                    Electron Main Process                     │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Window Activity Tracker                 │   │
│  │  ┌─────────────────────────────────────────────┐   │   │
│  │  │ setInterval(каждые 3-5 секунд)              │   │   │
│  │  │ 1. Получить активное окно (active-win)      │   │   │
│  │  │ 2. Проверить idleTime (powerMonitor)        │   │   │
│  │  │ 3. Если активно → сохранить сессию          │   │   │
│  │  └─────────────────────────────────────────────┘   │   │
│  │                                                     │   │
│  │  ┌─────────────────────────────────────────────┐   │   │
│  │  │         Local Storage (SQLite/JSON)         │   │   │
│  │  │   • app_name                                │   │   │
│  │  │   • window_title                            │   │   │
│  │  │   • start_time / end_time                   │   │   │
│  │  │   • duration                                │   │   │
│  │  └─────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────┘   │
│                            │                                │
│                            ▼ IPC                            │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Renderer Process (React)               │   │
│  │   • Отображение статистики                          │   │
│  │   • Графики использования                           │   │
│  │   • Управление трекером                             │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘

