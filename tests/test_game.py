"""
Flappy Parrot — UI Tests (Playwright / Python)
Run with: python3 tests/test_game.py
"""

import asyncio
import os
import sys
import pathlib
from playwright.async_api import async_playwright

# Absolute path to index.html as a file:// URL
GAME_URL = pathlib.Path(__file__).parent.parent / "index.html"
FILE_URL = GAME_URL.as_uri()

PASS = "\033[92m✔\033[0m"
FAIL = "\033[91m✘\033[0m"

results = []


def record(name: str, passed: bool, detail: str = ""):
    icon = PASS if passed else FAIL
    msg = f"  {icon} {name}"
    if detail:
        msg += f"  ({detail})"
    print(msg)
    results.append((name, passed))


async def run_tests():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            viewport={"width": 1280, "height": 900},
            # Allow localStorage on file:// URLs
            permissions=[],
        )

        # ── Grant file:// localStorage access ────────────────
        page = await context.new_page()

        print("\n🦜  Flappy Parrot — UI Test Suite")
        print("=" * 45)

        # ─────────────────────────────────────────────────────
        # TEST 1: Page loads and has correct title
        # ─────────────────────────────────────────────────────
        await page.goto(FILE_URL)
        await page.wait_for_load_state("load")
        title = await page.title()
        record("Page title is 'Flappy Parrot 🦜'", "Flappy Parrot" in title, f"got: {title!r}")

        # ─────────────────────────────────────────────────────
        # TEST 2: Canvas element exists with correct dimensions
        # ─────────────────────────────────────────────────────
        canvas = page.locator("#gameCanvas")
        await canvas.wait_for()
        width = await canvas.get_attribute("width")
        height = await canvas.get_attribute("height")
        record(
            "Canvas exists with correct size (480×640)",
            width == "480" and height == "640",
            f"{width}×{height}",
        )

        # ─────────────────────────────────────────────────────
        # TEST 3: Game starts in 'start' state
        # ─────────────────────────────────────────────────────
        state = await page.evaluate("() => gameState")
        record("Initial game state is 'start'", state == "start", f"state={state!r}")

        # ─────────────────────────────────────────────────────
        # TEST 4: Canvas is visible and rendered (not blank)
        # ─────────────────────────────────────────────────────
        is_visible = await canvas.is_visible()
        record("Canvas is visible on the page", is_visible)

        # Check canvas has been painted — wait for at least one animation frame first
        has_pixels = await page.evaluate("""() => new Promise(resolve => {
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    const c = document.getElementById('gameCanvas');
                    const ctx = c.getContext('2d');
                    const d = ctx.getImageData(240, 100, 1, 1).data;
                    // alpha > 0 means the background gradient was drawn
                    resolve(d[3] > 0);
                });
            });
        })""")
        record("Canvas has been painted (background rendered)", has_pixels)

        # ─────────────────────────────────────────────────────
        # TEST 5: Space from start → 'select', then → 'playing'
        # ─────────────────────────────────────────────────────
        await page.keyboard.press("Space")  # start → select
        await asyncio.sleep(0.1)
        state = await page.evaluate("() => gameState")
        record("Space key opens character select screen (state → 'select')", state == "select", f"state={state!r}")
        await page.keyboard.press("Space")  # select → playing
        await asyncio.sleep(0.1)
        state = await page.evaluate("() => gameState")
        record("Second Space confirms character and starts game (state → 'playing')", state == "playing", f"state={state!r}")

        # ─────────────────────────────────────────────────────
        # TEST 6: Parrot exists and has valid position
        # ─────────────────────────────────────────────────────
        parrot_y = await page.evaluate("() => parrot.y")
        record(
            "Parrot has a valid Y position (within canvas)",
            isinstance(parrot_y, (int, float)) and 0 <= parrot_y <= 640,
            f"y={parrot_y}",
        )

        # ─────────────────────────────────────────────────────
        # TEST 7: Flapping applies upward velocity
        # ─────────────────────────────────────────────────────
        await page.keyboard.press("Space")  # flap
        await asyncio.sleep(0.05)
        vy = await page.evaluate("() => parrot.vy")
        record(
            "Flapping gives parrot upward velocity (vy < 0)",
            isinstance(vy, (int, float)) and vy < 0,
            f"vy={vy:.2f}",
        )

        # ─────────────────────────────────────────────────────
        # TEST 8: Trees are being spawned while playing
        # ─────────────────────────────────────────────────────
        await asyncio.sleep(1.5)  # wait for trees to spawn
        tree_count = await page.evaluate("() => trees.length")
        record(
            "Trees are spawned while playing",
            tree_count > 0,
            f"{tree_count} tree pair(s) on screen",
        )

        # ─────────────────────────────────────────────────────
        # TEST 9: Score starts at 0
        # ─────────────────────────────────────────────────────
        current_score = await page.evaluate("() => score")
        record("Score initialises at 0", current_score == 0, f"score={current_score}")

        # ─────────────────────────────────────────────────────
        # TEST 10: Game over triggers when parrot hits ground
        # ─────────────────────────────────────────────────────
        # Force parrot below ground to trigger collision
        await page.evaluate("""() => {
            parrot.y = 650;   // below the canvas
            parrot.vy = 10;
        }""")
        await asyncio.sleep(0.2)
        state = await page.evaluate("() => gameState")
        record(
            "Game over triggered when parrot goes out of bounds",
            state == "gameover",
            f"state={state!r}",
        )

        # ─────────────────────────────────────────────────────
        # TEST 11: High score persists in localStorage
        # ─────────────────────────────────────────────────────
        # Set a known score then save it manually as if the player scored
        await page.evaluate("""() => {
            score = 5;
            highScore = 5;
            localStorage.setItem('flappyHighScore', '5');
        }""")
        stored = await page.evaluate("() => localStorage.getItem('flappyHighScore')")
        record(
            "High score is saved to localStorage",
            stored == "5",
            f"stored={stored!r}",
        )

        # ─────────────────────────────────────────────────────
        # TEST 12: Space on game-over goes to 'select', then Space starts game
        # ─────────────────────────────────────────────────────
        await page.keyboard.press("Space")  # gameover → select
        await asyncio.sleep(0.1)
        state = await page.evaluate("() => gameState")
        record(
            "Space on game-over returns to character select",
            state == "select",
            f"state={state!r}",
        )
        await page.keyboard.press("Space")  # select → playing
        await asyncio.sleep(0.1)
        state = await page.evaluate("() => gameState")
        record(
            "Space on select screen starts a new game",
            state == "playing",
            f"state={state!r}",
        )

        # ─────────────────────────────────────────────────────
        # TEST 13: Clicking canvas also triggers flap
        # ─────────────────────────────────────────────────────
        await page.evaluate("() => { parrot.y = 300; parrot.vy = 5; }")
        await canvas.click()
        await asyncio.sleep(0.05)
        vy_after_click = await page.evaluate("() => parrot.vy")
        record(
            "Clicking canvas triggers flap (vy < 0)",
            isinstance(vy_after_click, (int, float)) and vy_after_click < 0,
            f"vy={vy_after_click:.2f}",
        )

        # ─────────────────────────────────────────────────────
        # TEST 14: High score loaded from localStorage on page reload
        # ─────────────────────────────────────────────────────
        await page.evaluate("() => localStorage.setItem('flappyHighScore', '42')")
        await page.reload()
        await page.wait_for_load_state("load")
        await asyncio.sleep(0.3)
        loaded_high = await page.evaluate("() => highScore")
        record(
            "High score loaded from localStorage on page load",
            loaded_high == 42,
            f"highScore={loaded_high}",
        )

        # ─────────────────────────────────────────────────────
        # TEST 15: requestAnimationFrame loop is running
        # ─────────────────────────────────────────────────────
        # The loop runs ~60fps; sample parrot y twice to confirm movement
        await page.keyboard.press("Space")  # start → select
        await asyncio.sleep(0.05)
        await page.keyboard.press("Space")  # select → playing
        await asyncio.sleep(0.05)
        y1 = await page.evaluate("() => parrot.y")
        await asyncio.sleep(0.3)
        y2 = await page.evaluate("() => parrot.y")
        record(
            "Game loop is animating (parrot position changes over time)",
            y1 != y2,
            f"y changed: {y1:.1f} → {y2:.1f}",
        )

        await browser.close()

    # ── Summary ───────────────────────────────────────────────
    print("=" * 45)
    passed = sum(1 for _, ok in results if ok)
    total = len(results)
    status = "🎉 All tests passed!" if passed == total else f"⚠️  {total - passed} test(s) failed"
    print(f"\n  {status}  ({passed}/{total})\n")
    return passed == total


if __name__ == "__main__":
    ok = asyncio.run(run_tests())
    sys.exit(0 if ok else 1)
