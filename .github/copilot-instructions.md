# Copilot Agent Instructions — Flappy Parrot 🦜

## Always Test Before Committing

**Every time code is changed, run the full UI test suite before committing:**

```bash
python3 tests/test_game.py
```

All 16 tests must pass (exit code 0) before any `git commit` is made.
If any test fails, fix the code first, then re-run until all tests are green. ✅

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

## Game Design Choices (chosen by our developer!)
- 🦜 **Bird**: Colorful parrot
- 🌳 **Obstacles**: Trees
- 🌙 **Background**: Night sky with twinkling stars & moon
- 🏆 **Scoring**: Score + high score saved in `localStorage`
- 🎮 **Levels**: 5 levels (Level 1 🌱 easy → Level 5 💀 expert), unlock every 5 points

## Coding Guidelines

- **Keep it kid-friendly**: comments should explain *what* and *why* in simple language
- **No frameworks**: plain HTML/CSS/JS only — no build tools, no npm
- **No external dependencies**: game must work by opening `index.html` directly in a browser
- **Surgical changes**: only modify what's needed; don't refactor unrelated code
- **Test everything**: UI tests live in `tests/test_game.py` and must all pass before committing

## Running the Game

Open `index.html` in any web browser. No server needed!

## Running Tests

```bash
# Install dependencies (one time only)
python3 -m pip install playwright
python3 -m playwright install chromium

# Run tests
python3 tests/test_game.py
```

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
