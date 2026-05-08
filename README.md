# 🦜 Flappy Parrot

A Flappy Bird-style browser game built with pure HTML5 Canvas + JavaScript. Designed as a fun first coding project!

## 🎮 How to Play

1. Open `index.html` in any web browser — no installation needed!
2. Press **Space** or **tap/click** the screen to make the parrot flap its wings
3. Fly through the gaps in the trees without hitting them
4. Each tree you pass = 1 point 🏆
5. Your best score is saved automatically!

## 🌙 Game Design

| Feature | Choice |
|---|---|
| 🦜 Bird | Colorful parrot |
| 🌳 Obstacles | Trees (top + bottom) |
| 🌙 Background | Night sky with twinkling stars & moon |
| 🏆 Scoring | Current score + all-time high score (saved in browser) |

## 🏗️ Implementation Plan

### Tech Stack
- **Plain HTML5 Canvas + JavaScript** — no frameworks, great for learning!
- 3 files: `index.html`, `style.css`, `game.js`
- Works by opening `index.html` directly in any browser

### Game Screens
1. **Start screen** — title, press Space/tap to begin
2. **Playing** — parrot flaps through trees, score increments per tree passed
3. **Game over** — shows score + high score, press Space/tap to restart

### Architecture (`game.js`)

```
Constants & Config
  ├── GRAVITY, FLAP_POWER, TREE_SPEED, TREE_GAP, etc.

State
  ├── gameState: 'start' | 'playing' | 'gameover'
  ├── parrot: { x, y, vy, angle, wingAngle }
  ├── trees: [{ x, gapTop, gapBottom, scored }]
  └── score, highScore (persisted via localStorage)

Drawing Functions
  ├── drawBackground()   — night sky gradient
  ├── drawMoon()         — glowing moon with craters
  ├── drawStars(time)    — twinkling stars
  ├── drawGround()       — grassy strip at bottom
  ├── drawTrees()        — tree pairs with foliage
  ├── drawParrot(time)   — colorful parrot with flapping wing
  ├── drawHUD()          — score + high score overlay
  ├── drawStartScreen()  — start overlay
  └── drawGameOverScreen() — game over overlay

Game Logic
  ├── updateParrot()     — apply gravity + velocity
  ├── updateTrees()      — scroll + spawn new trees
  ├── updateScore()      — detect tree passes
  ├── checkCollisions()  — tree + boundary detection
  ├── flap()             — handle input (start/flap/restart)
  └── gameLoop()         — main 60fps requestAnimationFrame loop

Input
  ├── keydown (Space)
  └── pointerdown (click / tap)
```

### Physics
- **Gravity**: `vy += 0.45` every frame (pulls parrot down)
- **Flap**: `vy = -8.5` (sharp upward push)
- **Rotation**: parrot tilts up when rising, down when falling (smooth lerp)
- **Wing**: sine-wave animation when playing

### Collision Detection
- Circular hitbox (`radius = parrot size × 0.55`) for forgiving feel
- Checks overlap with tree rectangles (horizontal + vertical)
- Checks top/bottom canvas boundaries

## 🗂️ File Structure

```
flappy-bird-game/
├── index.html   — game page (loads canvas + scripts)
├── style.css    — centers canvas, dark page background
├── game.js      — all game logic (~400 lines, heavily commented)
└── README.md    — this file!
```

## 🧪 Testing

UI tests are written with **Playwright** and live in `tests/`.

```bash
npm install
npx playwright test
```

Tests cover:
- Page loads and canvas is visible
- Game starts on Space key press
- Parrot responds to flap input
- Game over screen appears after collision
- Score increments correctly
- High score persists in localStorage
