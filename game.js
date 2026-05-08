// ========================================================
//  FLAPPY PARROT 🦜 — A Flappy Bird game for the browser!
//  Built with HTML5 Canvas and JavaScript
// ========================================================

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// ── Canvas size ──────────────────────────────────────────
const W = canvas.width;   // 480
const H = canvas.height;  // 640

// ── Game states ──────────────────────────────────────────
// The game can be in one of three states:
//   'start'    → show the title screen
//   'playing'  → the game is running!
//   'gameover' → the player lost, show the score
let gameState = 'start';

// ── Score ─────────────────────────────────────────────────
let score = 0;
let highScore = Number(localStorage.getItem('flappyHighScore')) || 0;

// ── Levels ────────────────────────────────────────────────
// Each level has a name, color, tree speed, gap size, and points needed to reach it
const LEVELS = [
  { name: 'Level 1', emoji: '🌱', color: '#44ff88', treeSpeed: 1.6, treeGap: 210, scoreNeeded: 0  },
  { name: 'Level 2', emoji: '🌿', color: '#aaee00', treeSpeed: 2.0, treeGap: 190, scoreNeeded: 5  },
  { name: 'Level 3', emoji: '🌳', color: '#ffcc00', treeSpeed: 2.5, treeGap: 170, scoreNeeded: 10 },
  { name: 'Level 4', emoji: '🔥', color: '#ff8800', treeSpeed: 3.0, treeGap: 155, scoreNeeded: 15 },
  { name: 'Level 5', emoji: '💀', color: '#ff4444', treeSpeed: 3.6, treeGap: 140, scoreNeeded: 20 },
];

let currentLevel = 0;      // index into LEVELS array
let levelUpTimer = 0;      // how long to show the "LEVEL UP!" flash (in seconds)

// ── Stars (background decoration) ────────────────────────
// We make a bunch of random stars once and reuse them every frame
const STAR_COUNT = 80;
const stars = [];
for (let i = 0; i < STAR_COUNT; i++) {
  stars.push({
    x: Math.random() * W,
    y: Math.random() * H,
    r: Math.random() * 1.8 + 0.2,       // radius: 0.2 – 2.0
    twinkleSpeed: Math.random() * 2 + 1, // how fast it twinkles
    twinkleOffset: Math.random() * Math.PI * 2,
  });
}

// ── Moon ──────────────────────────────────────────────────
const moon = { x: W - 90, y: 80, r: 38 };

// ── Parrot (the player!) ──────────────────────────────────
const GRAVITY      = 0.45;   // how fast the parrot falls
const FLAP_POWER   = -8.5;   // upward push when you press space/click
const PARROT_X     = 100;    // parrot stays at this horizontal position
const PARROT_SIZE  = 32;     // half-size used for hitbox and drawing scale

let parrot = {
  x: PARROT_X,
  y: H / 2,
  vy: 0,          // vertical velocity (positive = falling down)
  angle: 0,       // rotation angle (tilts up/down with velocity)
  wingAngle: 0,   // wing flap animation
  alive: true,
};

// ── Trees (obstacles) ────────────────────────────────────
const TREE_WIDTH  = 64;   // how wide each tree trunk is
const TREE_SPAWN  = 230;  // spawn a new tree every this many pixels
// Note: treeGap and treeSpeed now come from LEVELS[currentLevel]

let trees = [];
let distanceSinceLastTree = 0;

// ── Helper: create a tree pair ────────────────────────────
function spawnTree() {
  const treeGap = LEVELS[currentLevel].treeGap;
  // The gap can appear anywhere between 15% and 65% of the screen height
  const minTop = H * 0.15;
  const maxTop = H * 0.65 - treeGap;
  const gapTop = minTop + Math.random() * (maxTop - minTop);

  trees.push({
    x: W + TREE_WIDTH,
    gapTop: gapTop,
    gapBottom: gapTop + treeGap,
    scored: false,
  });
}

// ═══════════════════════════════════════════════════════════
//  DRAWING FUNCTIONS
// ═══════════════════════════════════════════════════════════

// Draw the night sky gradient background
function drawBackground() {
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#05051a');
  grad.addColorStop(0.6, '#0d1b3e');
  grad.addColorStop(1, '#1a2a1a'); // slight green tint at the bottom (ground)
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
}

// Draw the moon
function drawMoon() {
  // Glowing halo
  const glow = ctx.createRadialGradient(moon.x, moon.y, moon.r * 0.5, moon.x, moon.y, moon.r * 2);
  glow.addColorStop(0, 'rgba(255,255,200,0.25)');
  glow.addColorStop(1, 'rgba(255,255,200,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(moon.x, moon.y, moon.r * 2, 0, Math.PI * 2);
  ctx.fill();

  // Moon disc
  ctx.fillStyle = '#fffff0';
  ctx.beginPath();
  ctx.arc(moon.x, moon.y, moon.r, 0, Math.PI * 2);
  ctx.fill();

  // Moon craters
  ctx.fillStyle = 'rgba(200,200,180,0.5)';
  [[moon.x - 12, moon.y + 8, 7], [moon.x + 10, moon.y - 10, 5], [moon.x + 4, moon.y + 16, 4]].forEach(([cx, cy, cr]) => {
    ctx.beginPath();
    ctx.arc(cx, cy, cr, 0, Math.PI * 2);
    ctx.fill();
  });
}

// Draw twinkling stars
function drawStars(time) {
  stars.forEach(s => {
    const twinkle = 0.5 + 0.5 * Math.sin(time * s.twinkleSpeed + s.twinkleOffset);
    ctx.globalAlpha = 0.4 + 0.6 * twinkle;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
}

// Draw the ground (grassy strip at the bottom)
function drawGround() {
  // Dirt
  ctx.fillStyle = '#3a2010';
  ctx.fillRect(0, H - 30, W, 30);
  // Grass strip
  ctx.fillStyle = '#1a5c1a';
  ctx.fillRect(0, H - 34, W, 8);
  // Lighter grass highlights
  ctx.fillStyle = '#2a8a2a';
  for (let gx = 0; gx < W; gx += 18) {
    ctx.beginPath();
    ctx.moveTo(gx, H - 34);
    ctx.lineTo(gx + 6, H - 42);
    ctx.lineTo(gx + 12, H - 34);
    ctx.fill();
  }
}

// Draw a single tree (top or bottom)
//   x, y      → top-left corner of the trunk
//   treeH     → height of the trunk
//   isTop     → true if the tree hangs from the top, false if it grows from the bottom
function drawTree(x, y, treeH, isTop) {
  // Trunk
  const trunkGrad = ctx.createLinearGradient(x, 0, x + TREE_WIDTH, 0);
  trunkGrad.addColorStop(0, '#5a3010');
  trunkGrad.addColorStop(0.4, '#8b5520');
  trunkGrad.addColorStop(1, '#3a1a05');
  ctx.fillStyle = trunkGrad;
  ctx.fillRect(x, y, TREE_WIDTH, treeH);

  // Dark edge lines on trunk
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(x, y, 6, treeH);
  ctx.fillRect(x + TREE_WIDTH - 6, y, 6, treeH);

  // Foliage (layered circles)
  const foliageColors = ['#145214', '#1a7a1a', '#22aa22'];
  const foliageX = x + TREE_WIDTH / 2;
  const leafR = TREE_WIDTH * 0.75;

  if (isTop) {
    // Leaves sit at the bottom of the top trunk (NOT hanging into the gap)
    foliageColors.forEach((color, i) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(foliageX, y + treeH - leafR * 0.6 + i * 8, leafR - i * 8, 0, Math.PI * 2);
      ctx.fill();
    });
  } else {
    // Leaves sit at the top of the bottom trunk (NOT poking into the gap)
    foliageColors.forEach((color, i) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(foliageX, y + leafR * 0.6 - i * 8, leafR - i * 8, 0, Math.PI * 2);
      ctx.fill();
    });
  }
}

// Draw all the tree pairs
function drawTrees() {
  trees.forEach(tree => {
    // Top tree: from y=0 down to gapTop
    drawTree(tree.x, 0, tree.gapTop, true);
    // Bottom tree: from gapBottom down to the ground
    drawTree(tree.x, tree.gapBottom, H - tree.gapBottom - 30, false);
  });
}

// Draw the colorful parrot 🦜
function drawParrot(time) {
  ctx.save();

  // Move origin to parrot center and rotate with velocity
  ctx.translate(parrot.x, parrot.y);
  const targetAngle = Math.max(-0.5, Math.min(1.2, parrot.vy * 0.07));
  parrot.angle += (targetAngle - parrot.angle) * 0.15;
  ctx.rotate(parrot.angle);

  const s = PARROT_SIZE; // shorthand for size

  // Wing (behind body) — flaps up and down
  parrot.wingAngle = Math.sin(time * 8) * 0.6;
  ctx.save();
  ctx.rotate(-parrot.wingAngle);
  ctx.fillStyle = '#1565c0'; // deep blue wing
  ctx.beginPath();
  ctx.ellipse(-s * 0.1, 0, s * 0.55, s * 0.28, -0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Body
  ctx.fillStyle = '#4caf50'; // bright green body
  ctx.beginPath();
  ctx.ellipse(0, 0, s * 0.55, s * 0.65, 0, 0, Math.PI * 2);
  ctx.fill();

  // Belly (lighter patch)
  ctx.fillStyle = '#aed581';
  ctx.beginPath();
  ctx.ellipse(s * 0.1, s * 0.1, s * 0.28, s * 0.4, 0.2, 0, Math.PI * 2);
  ctx.fill();

  // Red chest patch
  ctx.fillStyle = '#ef5350';
  ctx.beginPath();
  ctx.ellipse(s * 0.1, -s * 0.05, s * 0.22, s * 0.28, 0, 0, Math.PI * 2);
  ctx.fill();

  // Head
  ctx.fillStyle = '#4caf50';
  ctx.beginPath();
  ctx.arc(s * 0.2, -s * 0.55, s * 0.38, 0, Math.PI * 2);
  ctx.fill();

  // Beak (upper)
  ctx.fillStyle = '#ffa000';
  ctx.beginPath();
  ctx.moveTo(s * 0.5, -s * 0.6);
  ctx.lineTo(s * 0.9, -s * 0.5);
  ctx.lineTo(s * 0.5, -s * 0.42);
  ctx.closePath();
  ctx.fill();

  // Beak (lower — slight hook)
  ctx.fillStyle = '#ff8f00';
  ctx.beginPath();
  ctx.moveTo(s * 0.5, -s * 0.42);
  ctx.lineTo(s * 0.82, -s * 0.38);
  ctx.lineTo(s * 0.5, -s * 0.3);
  ctx.closePath();
  ctx.fill();

  // Eye white
  ctx.fillStyle = 'white';
  ctx.beginPath();
  ctx.arc(s * 0.38, -s * 0.62, s * 0.15, 0, Math.PI * 2);
  ctx.fill();

  // Pupil
  ctx.fillStyle = '#111';
  ctx.beginPath();
  ctx.arc(s * 0.42, -s * 0.62, s * 0.08, 0, Math.PI * 2);
  ctx.fill();

  // Eye shine
  ctx.fillStyle = 'white';
  ctx.beginPath();
  ctx.arc(s * 0.46, -s * 0.66, s * 0.04, 0, Math.PI * 2);
  ctx.fill();

  // Tail feathers
  const tailColors = ['#e53935', '#fb8c00', '#fdd835', '#1e88e5'];
  tailColors.forEach((color, i) => {
    ctx.fillStyle = color;
    ctx.save();
    ctx.rotate(0.3 + i * 0.18);
    ctx.beginPath();
    ctx.ellipse(-s * 0.6, s * 0.2, s * 0.12, s * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });

  ctx.restore();
}

// Draw current score, level, and high score on screen
function drawHUD(dt) {
  const lvl = LEVELS[currentLevel];

  // Score (top center)
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath();
  ctx.roundRect(W / 2 - 60, 14, 120, 44, 10);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 28px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(score, W / 2, 46);

  // Level badge (top left)
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath();
  ctx.roundRect(12, 14, 140, 36, 8);
  ctx.fill();
  ctx.fillStyle = lvl.color;
  ctx.font = 'bold 15px Arial';
  ctx.textAlign = 'left';
  ctx.fillText(`${lvl.emoji} ${lvl.name}`, 20, 38);

  // High score (top right)
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath();
  ctx.roundRect(W - 130, 14, 118, 36, 8);
  ctx.fill();
  ctx.fillStyle = '#ffd700';
  ctx.font = 'bold 14px Arial';
  ctx.textAlign = 'right';
  ctx.fillText(`🏆 BEST: ${highScore}`, W - 18, 38);

  // "LEVEL UP!" flash
  if (levelUpTimer > 0) {
    levelUpTimer -= dt;
    const alpha = Math.min(1, levelUpTimer); // fade out in the last second
    ctx.globalAlpha = alpha;
    ctx.fillStyle = lvl.color;
    ctx.font = 'bold 52px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`${lvl.emoji} LEVEL UP! ${lvl.emoji}`, W / 2, H / 2 - 20);
    ctx.font = 'bold 26px Arial';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(lvl.name, W / 2, H / 2 + 28);
    ctx.globalAlpha = 1;
  }
}

// Draw the start screen
function drawStartScreen() {
  // Semi-transparent overlay
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(0, 0, W, H);

  // Title box
  ctx.fillStyle = 'rgba(30,40,80,0.9)';
  ctx.beginPath();
  ctx.roundRect(W / 2 - 170, H / 2 - 160, 340, 220, 20);
  ctx.fill();
  ctx.strokeStyle = '#5577ff';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd700';
  ctx.font = 'bold 44px Arial';
  ctx.fillText('Flappy Parrot', W / 2, H / 2 - 90);

  ctx.font = '28px Arial';
  ctx.fillText('🦜', W / 2, H / 2 - 45);

  ctx.fillStyle = '#ccddff';
  ctx.font = '18px Arial';
  ctx.fillText('Press SPACE or tap to flap!', W / 2, H / 2 + 10);
  ctx.fillText('Fly through the trees 🌳', W / 2, H / 2 + 38);

  if (highScore > 0) {
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 16px Arial';
    ctx.fillText(`Your best score: ${highScore} 🏆`, W / 2, H / 2 + 68);
  }
}

// Draw the game-over screen
function drawGameOverScreen() {
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = 'rgba(30,10,10,0.92)';
  ctx.beginPath();
  ctx.roundRect(W / 2 - 170, H / 2 - 170, 340, 316, 20);
  ctx.fill();
  ctx.strokeStyle = '#ff4444';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.fillStyle = '#ff6666';
  ctx.font = 'bold 42px Arial';
  ctx.fillText('Game Over!', W / 2, H / 2 - 105);

  ctx.font = '32px Arial';
  ctx.fillText('😵', W / 2, H / 2 - 60);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 22px Arial';
  ctx.fillText(`Score: ${score}`, W / 2, H / 2 - 15);

  ctx.fillStyle = '#ffd700';
  ctx.font = 'bold 20px Arial';
  ctx.fillText(`Best: ${highScore} 🏆`, W / 2, H / 2 + 18);

  if (score >= highScore && score > 0) {
    ctx.fillStyle = '#ffee55';
    ctx.font = 'bold 16px Arial';
    ctx.fillText('🎉 New High Score! 🎉', W / 2, H / 2 + 50);
  }

  ctx.fillStyle = '#aaddff';
  ctx.font = '18px Arial';
  ctx.fillText('Press SPACE or tap to play again', W / 2, H / 2 + 90);

  // Show level reached
  const lvl = LEVELS[currentLevel];
  ctx.fillStyle = lvl.color;
  ctx.font = 'bold 15px Arial';
  ctx.fillText(`You reached ${lvl.emoji} ${lvl.name}!`, W / 2, H / 2 + 120);
}

// ═══════════════════════════════════════════════════════════
//  GAME LOGIC
// ═══════════════════════════════════════════════════════════

// Called every frame to move the parrot
function updateParrot() {
  parrot.vy += GRAVITY;
  parrot.y += parrot.vy;
}

// Move the trees and spawn new ones
function updateTrees() {
  const treeSpeed = LEVELS[currentLevel].treeSpeed;

  // Move all trees to the left
  trees.forEach(tree => { tree.x -= treeSpeed; });

  // Remove trees that have gone off the left side
  trees = trees.filter(tree => tree.x + TREE_WIDTH + 60 > 0);

  // Spawn a new tree pair when enough distance has passed
  distanceSinceLastTree += treeSpeed;
  if (distanceSinceLastTree >= TREE_SPAWN) {
    spawnTree();
    distanceSinceLastTree = 0;
  }
}

// Check if the parrot hit anything
function checkCollisions() {
  const px = parrot.x;
  const py = parrot.y;
  const hitR = PARROT_SIZE * 0.55; // slightly forgiving hitbox radius

  // Hit the ground or ceiling?
  if (py + hitR >= H - 30 || py - hitR <= 0) {
    return true;
  }

  // Hit a tree?
  for (const tree of trees) {
    const left  = tree.x;
    const right = tree.x + TREE_WIDTH;

    // Only check trees the parrot is horizontally overlapping
    if (px + hitR > left && px - hitR < right) {
      if (py - hitR < tree.gapTop || py + hitR > tree.gapBottom) {
        return true;
      }
    }
  }

  return false;
}

// Add a point when the parrot passes a tree, and check for level up
function updateScore() {
  trees.forEach(tree => {
    if (!tree.scored && tree.x + TREE_WIDTH < parrot.x) {
      tree.scored = true;
      score++;
      if (score > highScore) {
        highScore = score;
        localStorage.setItem('flappyHighScore', highScore);
      }
      // Check if we should level up
      const nextLevel = currentLevel + 1;
      if (nextLevel < LEVELS.length && score >= LEVELS[nextLevel].scoreNeeded) {
        currentLevel = nextLevel;
        levelUpTimer = 2.5; // show "LEVEL UP!" for 2.5 seconds
      }
    }
  });
}

// Called when the player flaps (space or click)
function flap() {
  if (gameState === 'start') {
    startGame();
    return;
  }
  if (gameState === 'gameover') {
    restartGame();
    return;
  }
  if (gameState === 'playing') {
    parrot.vy = FLAP_POWER;
  }
}

// Begin a new game
function startGame() {
  gameState = 'playing';
  score = 0;
  currentLevel = 0;
  levelUpTimer = 0;
  trees = [];
  distanceSinceLastTree = TREE_SPAWN; // spawn first tree right away
  parrot.y = H / 2;
  parrot.vy = FLAP_POWER;
  parrot.angle = 0;
}

// Restart after game over
function restartGame() {
  startGame();
}

// Handle losing
function triggerGameOver() {
  parrot.alive = false;
  gameState = 'gameover';
}

// ═══════════════════════════════════════════════════════════
//  MAIN GAME LOOP
// ═══════════════════════════════════════════════════════════

let lastTimestamp = 0;

function gameLoop(timestamp) {
  // Convert timestamp to seconds for smooth animation
  const time = timestamp / 1000;
  const dt = Math.min((timestamp - lastTimestamp) / 1000, 0.05); // seconds since last frame
  lastTimestamp = timestamp;

  // 1. Draw the background scene (always visible)
  drawBackground();
  drawMoon();
  drawStars(time);
  drawGround();
  drawTrees();

  if (gameState === 'playing') {
    // 2. Update everything
    updateParrot();
    updateTrees();
    updateScore();

    // 3. Check if the parrot hit something
    if (checkCollisions()) {
      triggerGameOver();
    }
  }

  // 4. Draw the parrot (always visible except during start screen)
  if (gameState !== 'start') {
    drawParrot(time);
  }

  // 5. Draw the HUD or overlays
  if (gameState === 'playing') {
    drawHUD(dt);
  } else if (gameState === 'start') {
    drawParrot(time); // show parrot on start screen too
    drawStartScreen();
  } else if (gameState === 'gameover') {
    drawHUD(0);
    drawGameOverScreen();
  }

  // 6. Request the next frame (~60 times per second)
  requestAnimationFrame(gameLoop);
}

// ═══════════════════════════════════════════════════════════
//  INPUT HANDLING
// ═══════════════════════════════════════════════════════════

// Spacebar
document.addEventListener('keydown', e => {
  if (e.code === 'Space') {
    e.preventDefault(); // stop page scrolling
    flap();
  }
});

// Mouse click or screen tap
canvas.addEventListener('pointerdown', e => {
  e.preventDefault();
  flap();
});

// ═══════════════════════════════════════════════════════════
//  START!
// ═══════════════════════════════════════════════════════════
requestAnimationFrame(gameLoop);
