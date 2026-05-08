# Copilot Agent Instructions — Flappy Parrot 🦜

## ⚠️ RULE #1: Always Test Before Committing

**Every single time any code is changed, run the full UI test suite:**

```bash
python3 tests/test_game.py
```

- All tests must show ✔ and exit with code 0
- If ANY test fails → fix the code first, re-run, then commit
- Never skip this step, even for tiny changes
- After fixing a bug, add a new test that would have caught it

---

## Project Overview

A Flappy Bird-style browser game built with plain HTML5 Canvas + JavaScript.
Designed as a fun learning project for a 10-year-old — keep code well-commented and approachable!

**Files:**
- `index.html` — game page (canvas element)
- `style.css` — centers canvas, dark background
- `game.js` — all game logic (~500 lines, heavily commented)
- `tests/test_game.py` — Playwright UI tests (Python)
- `README.md` — game design, architecture, and how to play
- `.github/copilot-instructions.md` — this file!

## Game Design Choices (chosen by our developer!)
- 🦜 **Bird**: Colorful parrot
- 🌳 **Obstacles**: Trees (trunks + foliage that stays INSIDE the trunk, not in the gap)
- 🌙 **Background**: Night sky with twinkling stars & moon
- 🏆 **Scoring**: Score + high score saved in `localStorage`
- 🎮 **Levels**: 5 levels (Level 1 🌱 easy → Level 5 💀 expert), unlock every 5 points

## Coding Guidelines

- **Keep it kid-friendly**: comments should explain *what* and *why* in simple language
- **No frameworks**: plain HTML/CSS/JS only — no build tools, no npm
- **No external dependencies**: game must work by opening `index.html` directly in a browser
- **Surgical changes**: only modify what's needed; don't refactor unrelated code
- **Test everything**: UI tests live in `tests/test_game.py` and must all pass before committing
- **Write new tests** for every new feature or bug fix added

## Known Bugs Fixed (don't reintroduce these!)

| Bug | Fix Applied |
|-----|-------------|
| Foliage hanging into the gap (parrot could fly through leaves) | Foliage circles anchored inside trunk using `y + treeH - leafR * 0.6` not `+ leafR * 0.4` |
| Level text overflowing game over box | Box height increased from 280 → 316px |

## Running the Game

Open `index.html` in any web browser. No server needed!

## Running Tests

```bash
# Install dependencies (one time only)
python3 -m pip install playwright
python3 -m playwright install chromium

# Run tests — ALL must pass before committing
python3 tests/test_game.py
```

## Current Test Coverage (16 tests)

| # | Test |
|---|------|
| 1 | Page title is correct |
| 2 | Canvas exists with correct size (480×640) |
| 3 | Initial game state is 'start' |
| 4 | Canvas is visible |
| 5 | Canvas has been painted |
| 6 | Space key starts the game |
| 7 | Parrot has valid Y position |
| 8 | Flapping gives upward velocity |
| 9 | Trees spawn while playing |
| 10 | Score initialises at 0 |
| 11 | Game over on out-of-bounds |
| 12 | High score saves to localStorage |
| 13 | Space on game-over restarts game |
| 14 | Click triggers flap |
| 15 | High score loads from localStorage on reload |
| 16 | Game loop animates (position changes over time) |

## Commit Workflow

1. Make code changes
2. Run `python3 tests/test_game.py` → all 16 must pass ✅
3. `git add` the changed files
4. `git commit` with a descriptive emoji message
5. `git push origin main`

## Commit Message Style

Use emoji prefixes to make commits fun and easy to read:
- 🦜 New feature
- 🐛 Bug fix
- 🎮 Gameplay change
- 🎨 Visual/art change
- 🧪 Test changes
- 📖 Docs update

Always include the Co-authored-by trailer:
```
Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>
```
