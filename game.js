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
// The game can be in one of four states:
//   'start'    → show the title screen
//   'select'   → pick your character!
//   'playing'  → the game is running!
//   'gameover' → the player lost, show the score
let gameState = 'start';

// ── Character selection ───────────────────────────────────
let selectedChar = 0; // index of the chosen character (0–3)

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
let lastTreeSpawnX = 0; // world-x position where we last spawned a tree pair

// ── Helper: create a tree pair ────────────────────────────
function spawnTree() {
  const treeGap = LEVELS[currentLevel].treeGap;
  // The gap can appear anywhere between 15% and 65% of the screen height
  const minTop = H * 0.15;
  const maxTop = H * 0.65 - treeGap;
  const gapTop = minTop + Math.random() * (maxTop - minTop);

  trees.push({
    x: parrot.x + W + TREE_WIDTH,  // world position — ahead of the bird
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
// cameraX is the current camera offset so everything tiles as the bird flies forward
function drawGround(cameraX) {
  const groundY = H - 36; // where the grass meets the dirt

  // ── Dirt layers ──────────────────────────────────────────
  // Deep dark soil at the very bottom
  ctx.fillStyle = '#1a0c04';
  ctx.fillRect(cameraX, H - 20, W, 20);

  // Mid dirt layer with a horizontal gradient
  const dirtGrad = ctx.createLinearGradient(0, groundY, 0, H);
  dirtGrad.addColorStop(0, '#4a2a10');
  dirtGrad.addColorStop(0.5, '#3a1e08');
  dirtGrad.addColorStop(1, '#1a0c04');
  ctx.fillStyle = dirtGrad;
  ctx.fillRect(cameraX, groundY, W, H - groundY);

  // ── Dirt texture: small pebbles / stones ─────────────────
  // Use stable pseudo-random positions based on x so they don't flicker
  const pebbleStart = Math.floor(cameraX / 14) * 14;
  for (let px = pebbleStart; px < cameraX + W + 14; px += 14) {
    // Each "column" of pebbles uses the x as a seed for stable variety
    const seed = (px * 7 + 13) % 100;
    if (seed < 55) { // only draw a pebble ~55% of positions
      const py = groundY + 6 + (seed % 14);
      const pr = 1.5 + (seed % 3);
      ctx.fillStyle = seed < 25
        ? 'rgba(180,130,80,0.35)'   // lighter stone
        : 'rgba(80,50,20,0.4)';     // darker clump
      ctx.beginPath();
      ctx.ellipse(px, py, pr * 1.6, pr, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ── Grass base strip ─────────────────────────────────────
  // Dark base layer
  ctx.fillStyle = '#1b5e20';
  ctx.fillRect(cameraX, groundY - 4, W, 10);

  // ── Grass blades — two passes for depth ──────────────────
  // PASS 1: back row of blades (darker, shorter)
  const backStart = Math.floor(cameraX / 9) * 9;
  for (let gx = backStart; gx < cameraX + W + 9; gx += 9) {
    const seed = (gx * 5 + 7) % 100;
    const height = 8 + (seed % 7);          // 8–14 px tall
    const lean   = (seed % 7) - 3;          // -3 to +3 lean
    const colorIdx = seed % 3;
    ctx.fillStyle = ['#1b5e20', '#2e7d32', '#388e3c'][colorIdx];
    ctx.beginPath();
    ctx.moveTo(gx,            groundY);
    ctx.lineTo(gx + lean,     groundY - height);
    ctx.lineTo(gx + 4 + lean, groundY - height + 2);
    ctx.lineTo(gx + 5,        groundY);
    ctx.closePath();
    ctx.fill();
  }

  // PASS 2: front row of blades (brighter, taller, closer together)
  const frontStart = Math.floor(cameraX / 7) * 7;
  for (let gx = frontStart + 3; gx < cameraX + W + 7; gx += 7) {
    const seed = (gx * 11 + 3) % 100;
    const height = 10 + (seed % 10);        // 10–19 px tall
    const lean   = (seed % 9) - 4;          // more expressive lean
    const colorIdx = seed % 4;
    ctx.fillStyle = ['#43a047', '#66bb6a', '#388e3c', '#81c784'][colorIdx];
    // Curved blade using quadratic bezier
    ctx.beginPath();
    ctx.moveTo(gx, groundY + 1);
    ctx.quadraticCurveTo(
      gx + lean * 1.5, groundY - height * 0.6,  // control point (gives a curve)
      gx + lean + 2,   groundY - height           // tip
    );
    ctx.quadraticCurveTo(
      gx + lean * 1.5 + 4, groundY - height * 0.6,
      gx + 5, groundY + 1
    );
    ctx.closePath();
    ctx.fill();

    // Lighter highlight on some blades
    if (seed % 5 === 0) {
      ctx.fillStyle = 'rgba(180,255,140,0.18)';
      ctx.beginPath();
      ctx.moveTo(gx + 1, groundY);
      ctx.quadraticCurveTo(gx + lean * 1.5 + 1, groundY - height * 0.55, gx + lean + 2, groundY - height);
      ctx.lineTo(gx + lean + 3, groundY - height + 3);
      ctx.closePath();
      ctx.fill();
    }
  }

  // ── Ground edge shadow line ───────────────────────────────
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(cameraX, groundY + 4, W, 3);
}


// Draw a single tree (top or bottom)
//   x, y      → top-left corner of the trunk
//   treeH     → height of the trunk
//   isTop     → true if the tree hangs from the top, false if it grows from the bottom
function drawTree(x, y, treeH, isTop) {
  const cx = x + TREE_WIDTH / 2; // trunk center x

  // ── Trunk base fill ──────────────────────────────────────
  const trunkGrad = ctx.createLinearGradient(x, 0, x + TREE_WIDTH, 0);
  trunkGrad.addColorStop(0,   '#3b1f08');
  trunkGrad.addColorStop(0.3, '#7a4520');
  trunkGrad.addColorStop(0.6, '#5c3210');
  trunkGrad.addColorStop(1,   '#2a1005');
  ctx.fillStyle = trunkGrad;
  ctx.fillRect(x, y, TREE_WIDTH, treeH);

  // ── Bark texture: vertical ridges ────────────────────────
  // These thin lines give the trunk a wood-grain look
  const barkColors = ['rgba(0,0,0,0.18)', 'rgba(255,200,100,0.07)', 'rgba(0,0,0,0.12)'];
  const barkOffsets = [8, 18, 28, 40, 52];
  barkOffsets.forEach((bx, i) => {
    ctx.fillStyle = barkColors[i % barkColors.length];
    ctx.fillRect(x + bx, y, 3 + (i % 2), treeH);
  });

  // ── Bark knots: small oval imperfections ─────────────────
  // Use the tree's x position as a "seed" so knots are consistent each frame
  const knotCount = 3;
  for (let k = 0; k < knotCount; k++) {
    // Pseudo-random but stable positions based on x+k
    const kx = x + 12 + ((x * 3 + k * 23) % (TREE_WIDTH - 24));
    const ky = y + treeH * (0.2 + ((x + k * 17) % 100) / 160);
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.beginPath();
    ctx.ellipse(kx, ky, 5, 3, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(180,100,30,0.2)';
    ctx.beginPath();
    ctx.ellipse(kx, ky, 3, 2, 0.3, 0, Math.PI * 2);
    ctx.fill();
  }

  // ── Branches poking out from the trunk ───────────────────
  const branchY = isTop
    ? y + treeH * 0.35   // branch on the lower portion of the top trunk
    : y + treeH * 0.65;  // branch on the upper portion of the bottom trunk

  // Left branch
  ctx.strokeStyle = '#4a2a0a';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x + 4, branchY);
  ctx.quadraticCurveTo(x - 12, branchY - 10, x - 22, branchY - 20);
  ctx.stroke();
  // Right branch
  ctx.beginPath();
  ctx.moveTo(x + TREE_WIDTH - 4, branchY);
  ctx.quadraticCurveTo(x + TREE_WIDTH + 12, branchY - 8, x + TREE_WIDTH + 20, branchY - 18);
  ctx.stroke();

  // ── Foliage: multiple irregular leaf clusters ─────────────
  // IMPORTANT: foliage is anchored INSIDE the trunk area, NOT into the gap
  const leafR = TREE_WIDTH * 0.72;

  // Cluster positions are relative to the gap edge of the trunk so foliage
  // always stays well clear of the flying gap
  const clusterBaseY = isTop
    ? y + treeH - leafR * 0.55   // anchored inside top trunk (above gap)
    : y + leafR * 0.55;          // anchored inside bottom trunk (below gap)

  // Each cluster: [offsetX, offsetY, radiusMultiplier, color]
  const clusters = [
    [  0,   0,   1.00, '#145c14'],   // big center cluster (darkest)
    [-18, -12,   0.78, '#1a7a1a'],   // upper left
    [ 18, -10,   0.75, '#1a7a1a'],   // upper right
    [ -8,  14,   0.65, '#22992a'],   // lower left (lighter)
    [ 12,  12,   0.62, '#22992a'],   // lower right
    [  0, -20,   0.55, '#2ab82a'],   // top highlight
  ];

  clusters.forEach(([ox, oy, rm, color]) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    // Slightly squash circles into ovals for a more natural canopy look
    ctx.ellipse(cx + ox, clusterBaseY + oy, leafR * rm, leafR * rm * 0.85, 0, 0, Math.PI * 2);
    ctx.fill();
  });

  // ── Leaf highlight: bright edge on top clusters ───────────
  ctx.fillStyle = 'rgba(100,220,80,0.13)';
  ctx.beginPath();
  ctx.ellipse(cx - 6, clusterBaseY - 18, leafR * 0.45, leafR * 0.3, -0.3, 0, Math.PI * 2);
  ctx.fill();
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

// 🦜 Scarlet Macaw — red body, blue/yellow wings, hooked grey beak
// previewMode=true → draw at (0,0) without game physics translation/rotation
function drawParrot(time, previewMode = false) {
  ctx.save();
  if (!previewMode) {
    ctx.translate(PARROT_X, parrot.y);
    const targetAngle = Math.max(-0.4, Math.min(1.0, parrot.vy * 0.06));
    parrot.angle += (targetAngle - parrot.angle) * 0.15;
    ctx.rotate(parrot.angle);
  }
  const s = PARROT_SIZE;

  [['#0d47a1', 0.2, -s * 0.52], ['#1565c0', 0.08, -s * 0.48], ['#c62828', -0.05, -s * 0.42], ['#e53935', -0.18, -s * 0.38]].forEach(([color, angle, x]) => {
    ctx.save();
    ctx.rotate(angle);
    const tailGrad = ctx.createLinearGradient(x, -s * 0.02, x, s * 0.86);
    tailGrad.addColorStop(0, color);
    tailGrad.addColorStop(1, color === '#c62828' || color === '#e53935' ? '#8e1c1c' : '#0b3c86');
    ctx.fillStyle = tailGrad;
    ctx.beginPath();
    ctx.moveTo(x, -s * 0.02);
    ctx.bezierCurveTo(x - s * 0.05, s * 0.12, x - s * 0.1, s * 0.66, x - s * 0.04, s * 0.86);
    ctx.bezierCurveTo(x + s * 0.04, s * 0.72, x + s * 0.06, s * 0.2, x + s * 0.02, -s * 0.02);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(70,50,40,0.45)';
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(x, -s * 0.01);
    ctx.lineTo(x - s * 0.01, s * 0.82);
    ctx.stroke();
    ctx.restore();
  });

  parrot.wingAngle = (gameState === 'playing' || previewMode)
    ? Math.sin(time * 9) * 0.9
    : Math.sin(time * 3) * 0.25;
  ctx.save();
  ctx.translate(s * 0.02, -s * 0.14);
  ctx.rotate(-parrot.wingAngle);
  const wingGrad = ctx.createLinearGradient(0, 0, -s * 1.18, s * 0.34);
  wingGrad.addColorStop(0, '#2f80c8');
  wingGrad.addColorStop(0.55, '#1565c0');
  wingGrad.addColorStop(1, '#0d47a1');
  ctx.fillStyle = wingGrad;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(-s * 0.18, -s * 0.06, -s * 0.82, 0, -s * 1.14, s * 0.18);
  ctx.bezierCurveTo(-s * 0.98, s * 0.48, -s * 0.34, s * 0.48, 0, s * 0.26);
  ctx.closePath();
  ctx.fill();
  const covertGrad = ctx.createLinearGradient(0, 0, -s * 0.9, s * 0.18);
  covertGrad.addColorStop(0, '#9ccc65');
  covertGrad.addColorStop(0.45, '#7cb342');
  covertGrad.addColorStop(1, '#558b2f');
  ctx.fillStyle = covertGrad;
  ctx.beginPath();
  ctx.moveTo(-s * 0.02, s * 0.02);
  ctx.bezierCurveTo(-s * 0.2, 0, -s * 0.66, s * 0.04, -s * 0.86, s * 0.14);
  ctx.bezierCurveTo(-s * 0.72, s * 0.28, -s * 0.26, s * 0.3, -s * 0.02, s * 0.18);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#f2c94c';
  ctx.beginPath();
  ctx.moveTo(-s * 0.04, s * 0.08);
  ctx.bezierCurveTo(-s * 0.22, s * 0.07, -s * 0.48, s * 0.09, -s * 0.6, s * 0.14);
  ctx.bezierCurveTo(-s * 0.48, s * 0.22, -s * 0.18, s * 0.22, -s * 0.04, s * 0.17);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#0d47a1';
  for (let i = 0; i < 6; i++) {
    const px = -s * (0.72 + i * 0.08);
    const py = s * (0.24 + i * 0.025);
    ctx.beginPath();
    ctx.moveTo(px, py - s * 0.08);
    ctx.quadraticCurveTo(px - s * 0.05, py + s * 0.02, px - s * 0.01, py + s * 0.16);
    ctx.quadraticCurveTo(px + s * 0.03, py + s * 0.03, px, py - s * 0.08);
    ctx.fill();
  }
  ctx.restore();

  const bodyGrad = ctx.createRadialGradient(s * 0.12, -s * 0.1, s * 0.06, s * 0.02, s * 0.12, s * 0.82);
  bodyGrad.addColorStop(0, '#ef5350');
  bodyGrad.addColorStop(0.45, '#d43732');
  bodyGrad.addColorStop(1, '#7f1d1d');
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.moveTo(s * 0.34, -s * 0.12);
  ctx.bezierCurveTo(s * 0.52, s * 0.04, s * 0.5, s * 0.52, s * 0.12, s * 0.76);
  ctx.bezierCurveTo(-s * 0.28, s * 0.84, -s * 0.56, s * 0.46, -s * 0.48, s * 0.06);
  ctx.bezierCurveTo(-s * 0.42, -s * 0.28, -s * 0.06, -s * 0.42, s * 0.34, -s * 0.12);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(80, 0, 0, 0.16)';
  ctx.beginPath();
  ctx.moveTo(-s * 0.08, s * 0.02);
  ctx.bezierCurveTo(s * 0.1, s * 0.14, s * 0.16, s * 0.46, -s * 0.06, s * 0.64);
  ctx.bezierCurveTo(-s * 0.24, s * 0.62, -s * 0.3, s * 0.2, -s * 0.08, s * 0.02);
  ctx.closePath();
  ctx.fill();

  const headGrad = ctx.createRadialGradient(s * 0.18, -s * 0.72, s * 0.04, s * 0.16, -s * 0.56, s * 0.42);
  headGrad.addColorStop(0, '#ef5350');
  headGrad.addColorStop(0.55, '#c62828');
  headGrad.addColorStop(1, '#7f1d1d');
  ctx.fillStyle = headGrad;
  ctx.beginPath();
  ctx.moveTo(s * 0.03, -s * 0.76);
  ctx.bezierCurveTo(s * 0.14, -s * 0.98, s * 0.46, -s * 0.94, s * 0.56, -s * 0.68);
  ctx.bezierCurveTo(s * 0.62, -s * 0.42, s * 0.38, -s * 0.22, s * 0.1, -s * 0.28);
  ctx.bezierCurveTo(-s * 0.08, -s * 0.36, -s * 0.12, -s * 0.6, s * 0.03, -s * 0.76);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#fbfbf6';
  ctx.beginPath();
  ctx.moveTo(s * 0.16, -s * 0.74);
  ctx.bezierCurveTo(s * 0.36, -s * 0.82, s * 0.5, -s * 0.76, s * 0.56, -s * 0.58);
  ctx.bezierCurveTo(s * 0.52, -s * 0.38, s * 0.34, -s * 0.3, s * 0.16, -s * 0.38);
  ctx.bezierCurveTo(s * 0.06, -s * 0.48, s * 0.06, -s * 0.66, s * 0.16, -s * 0.74);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(120, 120, 120, 0.42)';
  ctx.lineWidth = 0.8;
  for (let i = 0; i < 4; i++) {
    const fx = s * (0.18 + i * 0.08);
    ctx.beginPath();
    ctx.moveTo(fx, -s * 0.71);
    ctx.lineTo(fx + s * 0.015, -s * 0.41);
    ctx.stroke();
  }

  const beakGrad = ctx.createLinearGradient(s * 0.36, -s * 0.66, s * 0.96, -s * 0.38);
  beakGrad.addColorStop(0, '#bdbdbd');
  beakGrad.addColorStop(0.65, '#8e8e8e');
  beakGrad.addColorStop(1, '#424242');
  ctx.fillStyle = beakGrad;
  ctx.beginPath();
  ctx.moveTo(s * 0.4, -s * 0.63);
  ctx.bezierCurveTo(s * 0.68, -s * 0.76, s * 0.96, -s * 0.58, s * 0.82, -s * 0.38);
  ctx.bezierCurveTo(s * 0.7, -s * 0.3, s * 0.52, -s * 0.32, s * 0.46, -s * 0.44);
  ctx.bezierCurveTo(s * 0.6, -s * 0.48, s * 0.66, -s * 0.56, s * 0.63, -s * 0.64);
  ctx.bezierCurveTo(s * 0.56, -s * 0.66, s * 0.47, -s * 0.66, s * 0.4, -s * 0.63);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#a0a0a0';
  ctx.beginPath();
  ctx.moveTo(s * 0.42, -s * 0.46);
  ctx.bezierCurveTo(s * 0.58, -s * 0.38, s * 0.68, -s * 0.34, s * 0.62, -s * 0.28);
  ctx.bezierCurveTo(s * 0.52, -s * 0.28, s * 0.42, -s * 0.34, s * 0.42, -s * 0.46);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#303030';
  ctx.beginPath();
  ctx.arc(s * 0.83, -s * 0.45, s * 0.055, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#f6d54a';
  ctx.beginPath();
  ctx.arc(s * 0.28, -s * 0.58, s * 0.11, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fffdf6';
  ctx.beginPath();
  ctx.arc(s * 0.28, -s * 0.58, s * 0.084, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#e0a800';
  ctx.beginPath();
  ctx.arc(s * 0.285, -s * 0.58, s * 0.055, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#101010';
  ctx.beginPath();
  ctx.arc(s * 0.29, -s * 0.58, s * 0.032, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.beginPath();
  ctx.arc(s * 0.315, -s * 0.605, s * 0.016, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#616161';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  [[-s * 0.09, s * 0.63], [s * 0.11, s * 0.64]].forEach(([fx, fy]) => {
    ctx.beginPath();
    ctx.moveTo(fx, fy);
    ctx.lineTo(fx, fy + s * 0.19);
    ctx.stroke();
    [[-s * 0.16, s * 0.05], [-s * 0.04, s * 0.1], [s * 0.06, s * 0.1], [s * 0.04, -s * 0.11]].forEach(([tx, ty]) => {
      ctx.beginPath();
      ctx.moveTo(fx, fy + s * 0.19);
      ctx.lineTo(fx + tx, fy + s * 0.28 + ty);
      ctx.stroke();
    });
  });

  ctx.restore();
}

// 🦆 Mallard Duck — green head, white collar, chestnut breast, blue speculum
function drawDuck(time, previewMode = false) {
  ctx.save();
  if (!previewMode) {
    ctx.translate(PARROT_X, parrot.y);
    const targetAngle = Math.max(-0.4, Math.min(1.0, parrot.vy * 0.06));
    parrot.angle += (targetAngle - parrot.angle) * 0.15;
    ctx.rotate(parrot.angle);
  }
  const s = PARROT_SIZE;
  const wing = (gameState === 'playing' || previewMode) ? Math.sin(time * 9) * 0.9 : Math.sin(time * 3) * 0.25;

  ['#f5f5f5', '#ffffff'].forEach((color, i) => {
    ctx.save();
    ctx.rotate(-0.24 + i * 0.12);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(-s * (0.5 + i * 0.02), s * 0.02);
    ctx.quadraticCurveTo(-s * 0.72, -s * 0.1, -s * 0.66, -s * 0.28);
    ctx.quadraticCurveTo(-s * 0.54, -s * 0.22, -s * (0.44 + i * 0.02), s * 0.08);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  });

  ctx.save();
  ctx.translate(s * 0.02, -s * 0.14);
  ctx.rotate(-wing);
  const wingGrad = ctx.createLinearGradient(0, 0, -s * 1.1, s * 0.34);
  wingGrad.addColorStop(0, '#a1887f');
  wingGrad.addColorStop(0.55, '#8d6e63');
  wingGrad.addColorStop(1, '#5d4037');
  ctx.fillStyle = wingGrad;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(-s * 0.22, -s * 0.04, -s * 0.78, s * 0.02, -s * 1.08, s * 0.18);
  ctx.bezierCurveTo(-s * 0.94, s * 0.46, -s * 0.3, s * 0.46, 0, s * 0.24);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(70, 45, 30, 0.34)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(-s * (0.12 + i * 0.14), s * (0.05 + i * 0.005));
    ctx.lineTo(-s * (0.22 + i * 0.14), s * (0.26 + i * 0.02));
    ctx.stroke();
  }
  ctx.strokeStyle = '#fffdf8';
  ctx.lineWidth = s * 0.05;
  ctx.beginPath();
  ctx.moveTo(-s * 0.08, s * 0.13);
  ctx.bezierCurveTo(-s * 0.28, s * 0.11, -s * 0.62, s * 0.12, -s * 0.82, s * 0.18);
  ctx.stroke();
  const specGrad = ctx.createLinearGradient(-s * 0.08, s * 0.13, -s * 0.82, s * 0.22);
  specGrad.addColorStop(0, '#42a5f5');
  specGrad.addColorStop(1, '#1565c0');
  ctx.fillStyle = specGrad;
  ctx.beginPath();
  ctx.moveTo(-s * 0.08, s * 0.15);
  ctx.bezierCurveTo(-s * 0.28, s * 0.16, -s * 0.62, s * 0.18, -s * 0.82, s * 0.24);
  ctx.bezierCurveTo(-s * 0.66, s * 0.33, -s * 0.28, s * 0.33, -s * 0.08, s * 0.24);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#4e342e';
  for (let i = 0; i < 6; i++) {
    const px = -s * (0.68 + i * 0.08);
    const py = s * (0.24 + i * 0.026);
    ctx.beginPath();
    ctx.moveTo(px, py - s * 0.07);
    ctx.quadraticCurveTo(px - s * 0.05, py + s * 0.03, px, py + s * 0.14);
    ctx.quadraticCurveTo(px + s * 0.028, py + s * 0.02, px, py - s * 0.07);
    ctx.fill();
  }
  ctx.restore();

  const bodyGrad = ctx.createRadialGradient(s * 0.12, -s * 0.02, s * 0.08, s * 0.04, s * 0.18, s * 0.88);
  bodyGrad.addColorStop(0, '#b39b90');
  bodyGrad.addColorStop(0.5, '#8d6e63');
  bodyGrad.addColorStop(1, '#5d4037');
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.moveTo(s * 0.4, -s * 0.08);
  ctx.bezierCurveTo(s * 0.56, s * 0.08, s * 0.5, s * 0.46, s * 0.1, s * 0.66);
  ctx.bezierCurveTo(-s * 0.36, s * 0.72, -s * 0.64, s * 0.36, -s * 0.54, s * 0.04);
  ctx.bezierCurveTo(-s * 0.46, -s * 0.24, -s * 0.08, -s * 0.34, s * 0.4, -s * 0.08);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#6d4c41';
  ctx.beginPath();
  ctx.moveTo(s * 0.16, -s * 0.14);
  ctx.bezierCurveTo(s * 0.4, -s * 0.06, s * 0.48, s * 0.16, s * 0.22, s * 0.3);
  ctx.bezierCurveTo(s * 0.02, s * 0.26, -s * 0.02, 0, s * 0.16, -s * 0.14);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.beginPath();
  ctx.moveTo(-s * 0.04, s * 0.04);
  ctx.bezierCurveTo(s * 0.12, s * 0.1, s * 0.16, s * 0.42, -s * 0.04, s * 0.52);
  ctx.bezierCurveTo(-s * 0.24, s * 0.46, -s * 0.24, s * 0.14, -s * 0.04, s * 0.04);
  ctx.closePath();
  ctx.fill();

  const headGrad = ctx.createRadialGradient(s * 0.08, -s * 0.7, s * 0.04, s * 0.18, -s * 0.52, s * 0.36);
  headGrad.addColorStop(0, '#4caf50');
  headGrad.addColorStop(0.55, '#1b5e20');
  headGrad.addColorStop(1, '#0a3311');
  ctx.fillStyle = headGrad;
  ctx.beginPath();
  ctx.moveTo(s * 0.02, -s * 0.68);
  ctx.bezierCurveTo(s * 0.14, -s * 0.88, s * 0.42, -s * 0.86, s * 0.54, -s * 0.62);
  ctx.bezierCurveTo(s * 0.56, -s * 0.38, s * 0.34, -s * 0.24, s * 0.08, -s * 0.3);
  ctx.bezierCurveTo(-s * 0.1, -s * 0.38, -s * 0.12, -s * 0.56, s * 0.02, -s * 0.68);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = s * 0.08;
  ctx.beginPath();
  ctx.arc(s * 0.13, -s * 0.31, s * 0.19, Math.PI * 0.62, Math.PI * 1.34);
  ctx.stroke();

  const billGrad = ctx.createLinearGradient(s * 0.34, -s * 0.56, s * 0.8, -s * 0.42);
  billGrad.addColorStop(0, '#ffb74d');
  billGrad.addColorStop(0.6, '#fb8c00');
  billGrad.addColorStop(1, '#ef6c00');
  ctx.fillStyle = billGrad;
  ctx.beginPath();
  ctx.moveTo(s * 0.34, -s * 0.54);
  ctx.bezierCurveTo(s * 0.56, -s * 0.61, s * 0.8, -s * 0.58, s * 0.82, -s * 0.47);
  ctx.bezierCurveTo(s * 0.78, -s * 0.37, s * 0.52, -s * 0.34, s * 0.36, -s * 0.4);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#f57c00';
  ctx.beginPath();
  ctx.moveTo(s * 0.36, -s * 0.44);
  ctx.bezierCurveTo(s * 0.54, -s * 0.36, s * 0.74, -s * 0.36, s * 0.72, -s * 0.3);
  ctx.bezierCurveTo(s * 0.54, -s * 0.28, s * 0.38, -s * 0.32, s * 0.36, -s * 0.44);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#3e2723';
  ctx.beginPath();
  ctx.ellipse(s * 0.73, -s * 0.46, s * 0.07, s * 0.045, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#5d4037';
  ctx.beginPath();
  ctx.arc(s * 0.25, -s * 0.51, s * 0.05, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fffdf8';
  ctx.beginPath();
  ctx.arc(s * 0.25, -s * 0.51, s * 0.032, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#4e342e';
  ctx.beginPath();
  ctx.arc(s * 0.252, -s * 0.51, s * 0.022, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1a1a1a';
  ctx.beginPath();
  ctx.arc(s * 0.254, -s * 0.51, s * 0.014, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.beginPath();
  ctx.arc(s * 0.266, -s * 0.522, s * 0.009, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#fb8c00';
  [[-s * 0.08, s * 0.63], [s * 0.12, s * 0.64]].forEach(([fx, fy]) => {
    ctx.fillRect(fx - s * 0.01, fy, s * 0.02, s * 0.16);
    ctx.beginPath();
    ctx.moveTo(fx, fy + s * 0.16);
    ctx.lineTo(fx + s * 0.16, fy + s * 0.19);
    ctx.lineTo(fx + s * 0.07, fy + s * 0.29);
    ctx.lineTo(fx, fy + s * 0.23);
    ctx.lineTo(fx - s * 0.13, fy + s * 0.28);
    ctx.lineTo(fx - s * 0.08, fy + s * 0.19);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#e65100';
    ctx.lineWidth = 0.8;
    ctx.stroke();
  });

  ctx.restore();
}

// 🦉 Great Horned Owl — barred brown body, facial disc, ear tufts, amber eyes
function drawOwl(time, previewMode = false) {
  ctx.save();
  if (!previewMode) {
    ctx.translate(PARROT_X, parrot.y);
    const targetAngle = Math.max(-0.4, Math.min(1.0, parrot.vy * 0.06));
    parrot.angle += (targetAngle - parrot.angle) * 0.15;
    ctx.rotate(parrot.angle);
  }
  const s = PARROT_SIZE;
  const wing = (gameState === 'playing' || previewMode) ? Math.sin(time * 8) * 0.9 : Math.sin(time * 3) * 0.25;

  ['#5d4037', '#8d6e63', '#4e342e'].forEach((color, i) => {
    ctx.save();
    ctx.rotate(-0.1 + i * 0.12);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(-s * (0.46 - i * 0.06), s * 0.18);
    ctx.quadraticCurveTo(-s * (0.66 - i * 0.04), s * 0.34, -s * (0.56 - i * 0.03), s * 0.54);
    ctx.quadraticCurveTo(-s * (0.4 - i * 0.04), s * 0.42, -s * (0.38 - i * 0.03), s * 0.18);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  });

  ctx.save();
  ctx.translate(s * 0.04, -s * 0.2);
  ctx.rotate(-wing);
  const wingGrad = ctx.createLinearGradient(0, 0, -s * 1.34, s * 0.42);
  wingGrad.addColorStop(0, '#8d6e63');
  wingGrad.addColorStop(0.45, '#6d4c41');
  wingGrad.addColorStop(1, '#4e342e');
  ctx.fillStyle = wingGrad;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(-s * 0.28, -s * 0.08, -s * 1.02, -s * 0.02, -s * 1.3, s * 0.16);
  ctx.bezierCurveTo(-s * 1.18, s * 0.52, -s * 0.34, s * 0.56, 0, s * 0.3);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(60, 40, 25, 0.55)';
  ctx.lineWidth = 1.6;
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    ctx.moveTo(-s * (0.12 + i * 0.18), s * (0.04 + i * 0.01));
    ctx.lineTo(-s * (0.2 + i * 0.18), s * (0.3 + i * 0.018));
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(212, 190, 155, 0.55)';
  ctx.lineWidth = 1.1;
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.moveTo(-s * (0.1 + i * 0.2), s * 0.1);
    ctx.lineTo(-s * (0.22 + i * 0.2), s * 0.16);
    ctx.stroke();
  }
  ctx.fillStyle = '#3e2723';
  for (let i = 0; i < 6; i++) {
    const px = -s * (0.86 + i * 0.075);
    const py = s * (0.28 + i * 0.025);
    ctx.beginPath();
    ctx.moveTo(px, py - s * 0.09);
    ctx.quadraticCurveTo(px - s * 0.05, py + s * 0.03, px - s * 0.01, py + s * 0.16);
    ctx.quadraticCurveTo(px + s * 0.028, py + s * 0.04, px, py - s * 0.09);
    ctx.fill();
  }
  ctx.restore();

  const bodyGrad = ctx.createRadialGradient(s * 0.08, -s * 0.06, s * 0.08, s * 0.04, s * 0.14, s * 0.9);
  bodyGrad.addColorStop(0, '#a1887f');
  bodyGrad.addColorStop(0.45, '#795548');
  bodyGrad.addColorStop(1, '#4e342e');
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.moveTo(s * 0.32, -s * 0.22);
  ctx.bezierCurveTo(s * 0.54, -s * 0.02, s * 0.48, s * 0.54, s * 0.08, s * 0.82);
  ctx.bezierCurveTo(-s * 0.34, s * 0.88, -s * 0.62, s * 0.46, -s * 0.54, s * 0.02);
  ctx.bezierCurveTo(-s * 0.46, -s * 0.32, -s * 0.08, -s * 0.46, s * 0.32, -s * 0.22);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(78, 52, 46, 0.45)';
  ctx.lineWidth = 1.8;
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    ctx.moveTo(-s * 0.28, -s * 0.08 + i * s * 0.15);
    ctx.quadraticCurveTo(s * 0.02, -s * 0.14 + i * s * 0.15, s * 0.3, -s * 0.08 + i * s * 0.15);
    ctx.stroke();
  }

  const chestGrad = ctx.createLinearGradient(0, -s * 0.16, 0, s * 0.68);
  chestGrad.addColorStop(0, '#f7f3ed');
  chestGrad.addColorStop(1, '#d7ccc8');
  ctx.fillStyle = chestGrad;
  ctx.beginPath();
  ctx.moveTo(s * 0.05, -s * 0.1);
  ctx.bezierCurveTo(s * 0.28, -s * 0.02, s * 0.28, s * 0.52, s * 0.04, s * 0.68);
  ctx.bezierCurveTo(-s * 0.18, s * 0.54, -s * 0.18, s * 0.06, s * 0.05, -s * 0.1);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(109, 76, 65, 0.55)';
  ctx.lineWidth = 1.3;
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.moveTo(-s * 0.1, s * (0.02 + i * 0.12));
    ctx.quadraticCurveTo(s * 0.04, -s * 0.02 + i * 0.12, s * 0.18, s * (0.02 + i * 0.12));
    ctx.stroke();
  }

  const faceGrad = ctx.createRadialGradient(s * 0.14, -s * 0.56, s * 0.05, s * 0.14, -s * 0.5, s * 0.42);
  faceGrad.addColorStop(0, '#d7ccc8');
  faceGrad.addColorStop(0.6, '#bcaaa4');
  faceGrad.addColorStop(1, '#8d6e63');
  ctx.fillStyle = faceGrad;
  ctx.beginPath();
  ctx.moveTo(-s * 0.08, -s * 0.68);
  ctx.bezierCurveTo(s * 0.02, -s * 0.86, s * 0.34, -s * 0.84, s * 0.44, -s * 0.66);
  ctx.bezierCurveTo(s * 0.56, -s * 0.42, s * 0.42, -s * 0.18, s * 0.14, -s * 0.16);
  ctx.bezierCurveTo(-s * 0.14, -s * 0.2, -s * 0.26, -s * 0.46, -s * 0.08, -s * 0.68);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#6d4c41';
  ctx.lineWidth = 2.2;
  ctx.stroke();

  [[-s * 0.04, -s * 0.92, -0.24], [s * 0.28, -s * 0.9, 0.24]].forEach(([tx, ty, rot]) => {
    ctx.save();
    ctx.translate(tx, ty);
    ctx.rotate(rot);
    ctx.fillStyle = '#3e2723';
    ctx.beginPath();
    ctx.moveTo(0, s * 0.16);
    ctx.quadraticCurveTo(s * 0.02, -s * 0.02, 0, -s * 0.26);
    ctx.quadraticCurveTo(-s * 0.08, -s * 0.04, -s * 0.06, s * 0.18);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#8d6e63';
    ctx.beginPath();
    ctx.moveTo(-s * 0.02, s * 0.1);
    ctx.quadraticCurveTo(0, -s * 0.02, -s * 0.01, -s * 0.16);
    ctx.quadraticCurveTo(-s * 0.05, -s * 0.02, -s * 0.04, s * 0.12);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  });

  [s * 0.02, s * 0.26].forEach(ex => {
    const ey = -s * 0.5;
    ctx.fillStyle = '#6d4c41';
    ctx.beginPath();
    ctx.arc(ex, ey, s * 0.14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fffdf7';
    ctx.beginPath();
    ctx.arc(ex, ey, s * 0.11, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f9a825';
    ctx.beginPath();
    ctx.arc(ex, ey, s * 0.086, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.arc(ex, ey, s * 0.044, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.beginPath();
    ctx.arc(ex + s * 0.028, ey - s * 0.03, s * 0.015, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.fillStyle = '#2f2f2f';
  ctx.beginPath();
  ctx.moveTo(s * 0.14, -s * 0.38);
  ctx.bezierCurveTo(s * 0.2, -s * 0.3, s * 0.18, -s * 0.24, s * 0.14, -s * 0.22);
  ctx.bezierCurveTo(s * 0.1, -s * 0.24, s * 0.08, -s * 0.3, s * 0.14, -s * 0.38);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

// 🐣 Baby Chick — fluffy downy yellow, small eyes, egg tooth, stubby wings
function drawChick(time, previewMode = false) {
  ctx.save();
  if (!previewMode) {
    ctx.translate(PARROT_X, parrot.y);
    const targetAngle = Math.max(-0.4, Math.min(1.0, parrot.vy * 0.06));
    parrot.angle += (targetAngle - parrot.angle) * 0.15;
    ctx.rotate(parrot.angle);
  }
  const s = PARROT_SIZE;
  const wing = (gameState === 'playing' || previewMode) ? Math.sin(time * 12) * 0.9 : Math.sin(time * 3) * 0.25;

  ['#fff9c4', '#fff176', '#ffee58'].forEach((color, i) => {
    ctx.save();
    ctx.rotate(-0.3 + i * 0.2);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(-s * (0.4 + i * 0.04), s * 0.08);
    ctx.quadraticCurveTo(-s * (0.56 + i * 0.04), s * 0.1, -s * (0.5 + i * 0.04), s * (0.28 + i * 0.02));
    ctx.quadraticCurveTo(-s * (0.32 + i * 0.03), s * 0.22, -s * (0.3 + i * 0.02), s * 0.04);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  });

  ctx.save();
  ctx.translate(s * 0.02, -s * 0.08);
  ctx.rotate(-wing);
  const wingGrad = ctx.createLinearGradient(0, 0, -s * 0.74, s * 0.2);
  wingGrad.addColorStop(0, '#fff59d');
  wingGrad.addColorStop(0.65, '#fdd835');
  wingGrad.addColorStop(1, '#f9a825');
  ctx.fillStyle = wingGrad;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(-s * 0.12, -s * 0.02, -s * 0.46, s * 0.02, -s * 0.66, s * 0.14);
  ctx.bezierCurveTo(-s * 0.52, s * 0.28, -s * 0.16, s * 0.27, 0, s * 0.16);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#fff9c4';
  ctx.beginPath();
  ctx.moveTo(-s * 0.02, s * 0.05);
  ctx.bezierCurveTo(-s * 0.16, s * 0.04, -s * 0.34, s * 0.06, -s * 0.46, s * 0.12);
  ctx.bezierCurveTo(-s * 0.3, s * 0.18, -s * 0.12, s * 0.18, -s * 0.02, s * 0.13);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#fbc02d';
  for (let i = 0; i < 5; i++) {
    const px = -s * (0.28 + i * 0.08);
    const py = s * (0.12 + i * 0.014);
    ctx.beginPath();
    ctx.moveTo(px, py - s * 0.04);
    ctx.quadraticCurveTo(px - s * 0.03, py + s * 0.015, px, py + s * 0.07);
    ctx.quadraticCurveTo(px + s * 0.018, py + s * 0.01, px, py - s * 0.04);
    ctx.fill();
  }
  ctx.restore();

  [[0, s * 0.12, s * 0.53, '#ffee58'], [s * 0.18, s * 0.06, s * 0.38, '#fff176'], [-s * 0.14, s * 0.18, s * 0.34, '#ffe082'], [s * 0.04, s * 0.28, s * 0.31, '#fff9c4'], [-s * 0.18, s * 0.02, s * 0.28, '#fff59d']].forEach(([bx, by, br, color]) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(bx, by, br, 0, Math.PI * 2);
    ctx.fill();
  });

  const headGrad = ctx.createRadialGradient(s * 0.08, -s * 0.64, s * 0.04, s * 0.14, -s * 0.48, s * 0.38);
  headGrad.addColorStop(0, '#fffde7');
  headGrad.addColorStop(0.6, '#fff176');
  headGrad.addColorStop(1, '#fdd835');
  ctx.fillStyle = headGrad;
  ctx.beginPath();
  ctx.moveTo(-s * 0.02, -s * 0.68);
  ctx.bezierCurveTo(s * 0.08, -s * 0.84, s * 0.34, -s * 0.82, s * 0.42, -s * 0.62);
  ctx.bezierCurveTo(s * 0.48, -s * 0.42, s * 0.3, -s * 0.24, s * 0.08, -s * 0.26);
  ctx.bezierCurveTo(-s * 0.12, -s * 0.32, -s * 0.16, -s * 0.52, -s * 0.02, -s * 0.68);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#fdd835';
  ctx.beginPath();
  ctx.moveTo(s * 0.1, -s * 0.86);
  ctx.quadraticCurveTo(s * 0.12, -s * 1.02, s * 0.2, -s * 0.86);
  ctx.quadraticCurveTo(s * 0.28, -s * 0.98, s * 0.26, -s * 0.82);
  ctx.quadraticCurveTo(s * 0.16, -s * 0.74, s * 0.1, -s * 0.86);
  ctx.fill();

  const billGrad = ctx.createLinearGradient(s * 0.34, -s * 0.52, s * 0.64, -s * 0.44);
  billGrad.addColorStop(0, '#ffb74d');
  billGrad.addColorStop(1, '#fb8c00');
  ctx.fillStyle = billGrad;
  ctx.beginPath();
  ctx.moveTo(s * 0.34, -s * 0.5);
  ctx.lineTo(s * 0.6, -s * 0.46);
  ctx.lineTo(s * 0.34, -s * 0.41);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#f57c00';
  ctx.beginPath();
  ctx.moveTo(s * 0.34, -s * 0.46);
  ctx.lineTo(s * 0.54, -s * 0.44);
  ctx.lineTo(s * 0.34, -s * 0.39);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#bdb76b';
  ctx.beginPath();
  ctx.arc(s * 0.23, -s * 0.52, s * 0.042, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fffdf5';
  ctx.beginPath();
  ctx.arc(s * 0.23, -s * 0.52, s * 0.026, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#3e2723';
  ctx.beginPath();
  ctx.arc(s * 0.232, -s * 0.52, s * 0.017, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1a1a1a';
  ctx.beginPath();
  ctx.arc(s * 0.233, -s * 0.52, s * 0.011, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.beginPath();
  ctx.arc(s * 0.242, -s * 0.53, s * 0.007, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#f57c00';
  ctx.lineWidth = 1.8;
  ctx.lineCap = 'round';
  [[-s * 0.06, s * 0.6], [s * 0.12, s * 0.62]].forEach(([lx, ly]) => {
    ctx.beginPath();
    ctx.moveTo(lx, ly);
    ctx.lineTo(lx, ly + s * 0.22);
    ctx.stroke();
    [[-s * 0.09, s * 0.04], [0, s * 0.07], [s * 0.09, s * 0.04]].forEach(([tx, ty]) => {
      ctx.beginPath();
      ctx.moveTo(lx, ly + s * 0.22);
      ctx.lineTo(lx + tx, ly + s * 0.28 + ty);
      ctx.stroke();
    });
  });

  ctx.restore();
}
// ── Characters list ───────────────────────────────────────
// Each entry: name, emoji, fun description, and draw function
const CHARACTERS = [
  { name: 'Scarlet',  emoji: '🦜', desc: 'Scarlet Macaw',      color: '#4caf50', drawFn: drawParrot },
  { name: 'Mallard',  emoji: '🦆', desc: 'Mallard Duck',        color: '#ffee58', drawFn: drawDuck   },
  { name: 'Athena',   emoji: '🦉', desc: 'Great Horned Owl',    color: '#795548', drawFn: drawOwl    },
  { name: 'Pip',      emoji: '🐣', desc: 'Baby Chick',          color: '#fdd835', drawFn: drawChick  },
];

// Draw whichever character is currently selected
function drawBird(time, previewMode = false) {
  CHARACTERS[selectedChar].drawFn(time, previewMode);
}

// Draw a character preview card at position (cx, cy) with a given scale
function drawCharPreview(charIdx, cx, cy, scale, time, isSelected) {
  const ch = CHARACTERS[charIdx];
  const cardW = isSelected ? 160 : 100;
  const cardH = isSelected ? 200 : 130;

  ctx.save();

  // Card background
  ctx.fillStyle = isSelected ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.06)';
  ctx.beginPath();
  ctx.roundRect(cx - cardW / 2, cy - cardH / 2, cardW, cardH, 16);
  ctx.fill();
  if (isSelected) {
    ctx.strokeStyle = ch.color;
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  // Draw character scaled + centered in upper card area
  ctx.save();
  ctx.translate(cx, cy - cardH * 0.1);
  ctx.scale(scale, scale);
  ch.drawFn(time, true); // previewMode = true
  ctx.restore();

  // Character name below — always white with dark shadow for readability
  ctx.textAlign = 'center';
  if (isSelected) {
    // Dark pill behind name + desc so any character colour shows up
    const pillY = cy + cardH * 0.28;
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath();
    ctx.roundRect(cx - cardW * 0.46, pillY, cardW * 0.92, 52, 10);
    ctx.fill();

    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 4;
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 17px Arial';
    ctx.fillText(`${ch.emoji} ${ch.name}`, cx, pillY + 20);
    ctx.fillStyle = '#ccddff';
    ctx.font = '12px Arial';
    ctx.fillText(ch.desc, cx, pillY + 40);
    ctx.shadowBlur = 0;
  } else {
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font = '20px Arial';
    ctx.fillText(ch.emoji, cx, cy + cardH * 0.42);
  }

  ctx.restore();
}

// Draw the character select screen
function drawSelectScreen(time) {
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(0, 0, W, H);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd700';
  ctx.font = 'bold 32px Arial';
  ctx.fillText('Choose your flyer! 🎮', W / 2, 80);

  const n = CHARACTERS.length;
  const prevIdx = (selectedChar - 1 + n) % n;
  const nextIdx = (selectedChar + 1) % n;

  // Three character cards: prev (left), selected (center), next (right)
  drawCharPreview(prevIdx,    W / 2 - 160, H / 2 - 10, 0.7, time, false);
  drawCharPreview(selectedChar, W / 2,     H / 2 - 10, 1.1, time, true);
  drawCharPreview(nextIdx,    W / 2 + 160, H / 2 - 10, 0.7, time, false);

  // Navigation arrows
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.font = 'bold 36px Arial';
  ctx.fillText('◀', W / 2 - 186, H / 2 + 14);
  ctx.fillText('▶', W / 2 + 186, H / 2 + 14);

  // Instructions
  ctx.fillStyle = '#aaddff';
  ctx.font = '16px Arial';
  ctx.fillText('◀ ▶ arrow keys to choose', W / 2, H * 0.82);
  ctx.fillStyle = '#ffd700';
  ctx.font = 'bold 18px Arial';
  ctx.fillText('Press SPACE or tap to fly! 🚀', W / 2, H * 0.89);
}
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
  ctx.fillText('Press SPACE or tap to start!', W / 2, H / 2 + 10);
  ctx.fillText('Pick your bird & fly through trees 🌳', W / 2, H / 2 + 38);

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
  // The bird flies forward through the world!
  parrot.x += LEVELS[currentLevel].treeSpeed;
  parrot.vy += GRAVITY;
  parrot.y += parrot.vy;
}

// Spawn new trees ahead of the bird and remove ones far behind
function updateTrees() {
  const cameraX = parrot.x - PARROT_X;

  // Remove trees that have gone off the left side of the screen
  trees = trees.filter(tree => tree.x + TREE_WIDTH + 10 > cameraX);

  // Spawn a new tree pair when the bird has flown far enough since the last one
  if (parrot.x - lastTreeSpawnX >= TREE_SPAWN) {
    spawnTree();
    lastTreeSpawnX = parrot.x;
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
    gameState = 'select'; // go pick a character first!
    return;
  }
  if (gameState === 'select') {
    startGame();
    return;
  }
  if (gameState === 'gameover') {
    gameState = 'select'; // pick a new character between rounds
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
  parrot.x = PARROT_X;               // world x — camera starts at 0
  lastTreeSpawnX = PARROT_X - TREE_SPAWN; // triggers first tree immediately
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

  // How far the camera has scrolled (matches how far the bird has flown)
  const cameraX = parrot.x - PARROT_X;

  // 1. Screen-space background — stays still (no camera offset)
  drawBackground();
  drawMoon();
  drawStars(time);

  // 2. World-space elements — translate so they scroll as the bird flies forward
  ctx.save();
  ctx.translate(-cameraX, 0);
  drawTrees();
  drawGround(cameraX);
  ctx.restore();

  if (gameState === 'playing') {
    // 3. Update everything
    updateParrot();
    updateTrees();
    updateScore();

    // 4. Check if the parrot hit something
    if (checkCollisions()) {
      triggerGameOver();
    }
  }

  // 5. Draw the bird at its fixed screen position (always in front of the world)
  if (gameState === 'playing' || gameState === 'gameover') {
    drawBird(time);
  }

  // 6. Draw the HUD or overlays
  if (gameState === 'playing') {
    drawHUD(dt);
  } else if (gameState === 'start') {
    drawBird(time); // show bird on start screen
    drawStartScreen();
  } else if (gameState === 'select') {
    drawSelectScreen(time);
  } else if (gameState === 'gameover') {
    drawHUD(0);
    drawGameOverScreen();
  }

  // 7. Request the next frame (~60 times per second)
  requestAnimationFrame(gameLoop);
}

// ═══════════════════════════════════════════════════════════
//  INPUT HANDLING
// ═══════════════════════════════════════════════════════════

// Spacebar + arrow keys
document.addEventListener('keydown', e => {
  if (e.code === 'Space') {
    e.preventDefault();
    flap();
  }
  if (e.code === 'ArrowLeft' && gameState === 'select') {
    e.preventDefault();
    selectedChar = (selectedChar - 1 + CHARACTERS.length) % CHARACTERS.length;
  }
  if (e.code === 'ArrowRight' && gameState === 'select') {
    e.preventDefault();
    selectedChar = (selectedChar + 1) % CHARACTERS.length;
  }
});

// Mouse click or screen tap — left half = previous character, right half = next, center = flap/select
canvas.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (gameState === 'select') {
    const rect = canvas.getBoundingClientRect();
    const tapX = (e.clientX - rect.left) * (W / rect.width);
    if (tapX < W * 0.3) {
      selectedChar = (selectedChar - 1 + CHARACTERS.length) % CHARACTERS.length;
    } else if (tapX > W * 0.7) {
      selectedChar = (selectedChar + 1) % CHARACTERS.length;
    } else {
      flap(); // tap center = confirm selection
    }
  } else {
    flap();
  }
});

// ═══════════════════════════════════════════════════════════
//  START!
// ═══════════════════════════════════════════════════════════
requestAnimationFrame(gameLoop);
