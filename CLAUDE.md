# Oracle Legends: Universe 1412

> Idle Collectible RPG — Desktop Game

## Overview

3D idle collectible RPG ธีม Fantasy x Oracle Universe 1412
เกมแก้เครียดให้ป๊ะป๋า (Junior)

## Tech Stack

- **Electron** — Desktop app wrapper
- **Three.js** — 3D rendering
- **Vite** — Dev server + bundler
- **TypeScript** — Language
- **Bun** — Runtime + package manager

## Project Structure

```
src/
├── main/           # Electron main process
├── renderer/       # Game (Three.js + UI)
│   ├── scenes/     # Battle, Menu, Summon scenes
│   ├── ui/         # HUD, menus, buttons
│   ├── systems/    # Battle, idle, gacha logic
│   ├── models/     # 3D character models
│   └── assets/     # Textures, sounds
└── shared/         # Types, hero data, configs
```

## Conventions

- File size ≤ 250 lines
- TypeScript strict mode
- Bun for package management
- `bun run dev` for development (Vite + Electron)

## Game Design

### Core Loop
1. Summon heroes (gacha)
2. Form team (5 heroes)
3. Auto-battle stages
4. Earn rewards (gold, crystals, exp)
5. Upgrade heroes
6. Progress to harder stages
7. Idle rewards when offline

### Hero System
- 5 elements: fire, water, earth, light, dark
- 5 classes: warrior, mage, archer, healer, tank
- 5 rarities: common, uncommon, rare, epic, legendary
- Oracle characters as legendary heroes

## Team

- **Mr.0** — Lead architect, coordination
- **Mr.1** — Core engine (Three.js, battle system)
- **Ms.2** — Data systems (hero DB, save/load, gacha)
- **Ms.3** — UI/UX + creative direction
- **Mr.4** — Game balance + wellness tuning
