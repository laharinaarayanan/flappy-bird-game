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

// Draw the colorful parrot 🦜 — cute chubby version!
// previewMode=true → draw at (0,0) without game physics translation/rotation
function drawParrot(time, previewMode = false) {
  ctx.save();
  if (!previewMode) {
    ctx.translate(PARROT_X, parrot.y);
    const targetAngle = Math.max(-0.4, Math.min(1.0, parrot.vy * 0.06));
    parrot.angle += (targetAngle - parrot.angle) * 0.15;
    ctx.rotate(parrot.angle);
  }

  const s = PARROT_SIZE; // shorthand for size

  // ── Tail feathers (drawn first so body covers the base) ──
  const tailColors = ['#e53935', '#fb8c00', '#fdd835', '#1e88e5', '#ab47bc'];
  tailColors.forEach((color, i) => {
    ctx.fillStyle = color;
    ctx.save();
    ctx.rotate(0.2 + i * 0.22);
    ctx.beginPath();
    // Rounded teardrop tail feathers
    ctx.ellipse(-s * 0.55, s * 0.15, s * 0.11, s * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    // Lighter tip on each feather
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.beginPath();
    ctx.ellipse(-s * 0.55, s * 0.48, s * 0.05, s * 0.14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });

  // ── Wing (behind body) — flaps when playing ──────────────
  parrot.wingAngle = gameState === 'playing'
    ? Math.sin(time * 9) * 0.55
    : Math.sin(time * 3) * 0.2; // gentle idle sway on other screens
  ctx.save();
  ctx.rotate(-parrot.wingAngle);
  // Wing base (blue)
  ctx.fillStyle = '#1565c0';
  ctx.beginPath();
  ctx.ellipse(-s * 0.05, s * 0.05, s * 0.52, s * 0.26, -0.35, 0, Math.PI * 2);
  ctx.fill();
  // Wing highlight
  ctx.fillStyle = '#42a5f5';
  ctx.beginPath();
  ctx.ellipse(-s * 0.05, s * 0.0, s * 0.32, s * 0.13, -0.35, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // ── Body — chubby round shape ────────────────────────────
  ctx.fillStyle = '#43a047'; // rich green
  ctx.beginPath();
  ctx.ellipse(0, s * 0.08, s * 0.6, s * 0.68, 0, 0, Math.PI * 2);
  ctx.fill();

  // Belly — soft cream patch
  ctx.fillStyle = '#f9f3c8';
  ctx.beginPath();
  ctx.ellipse(s * 0.08, s * 0.22, s * 0.32, s * 0.44, 0.15, 0, Math.PI * 2);
  ctx.fill();

  // Chest heart patch 💛
  ctx.fillStyle = '#ffca28';
  ctx.beginPath();
  ctx.ellipse(s * 0.1, s * 0.0, s * 0.2, s * 0.24, 0, 0, Math.PI * 2);
  ctx.fill();

  // ── Big round head ───────────────────────────────────────
  ctx.fillStyle = '#43a047';
  ctx.beginPath();
  ctx.arc(s * 0.18, -s * 0.58, s * 0.44, 0, Math.PI * 2); // bigger head = cuter
  ctx.fill();

  // ── Cute little head crest (tuft) ───────────────────────
  const crestBob = Math.sin(time * 5) * 0.08; // wiggles a tiny bit
  ['#e53935', '#fb8c00', '#fdd835'].forEach((color, i) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(
      s * 0.1 + i * s * 0.12,
      -s * 0.98 + crestBob - i * s * 0.08,
      s * 0.08,
      s * 0.2 - i * s * 0.04,
      i * 0.3 - 0.2,
      0, Math.PI * 2
    );
    ctx.fill();
  });

  // ── Tiny cute beak ───────────────────────────────────────
  // Upper beak (small rounded triangle)
  ctx.fillStyle = '#ffa000';
  ctx.beginPath();
  ctx.moveTo(s * 0.54, -s * 0.62);
  ctx.quadraticCurveTo(s * 0.88, -s * 0.54, s * 0.54, -s * 0.46);
  ctx.closePath();
  ctx.fill();
  // Lower beak
  ctx.fillStyle = '#ff8f00';
  ctx.beginPath();
  ctx.moveTo(s * 0.54, -s * 0.46);
  ctx.quadraticCurveTo(s * 0.80, -s * 0.40, s * 0.54, -s * 0.36);
  ctx.closePath();
  ctx.fill();

  // ── Big cute eyes ────────────────────────────────────────
  // Outer white (large!)
  ctx.fillStyle = 'white';
  ctx.beginPath();
  ctx.arc(s * 0.36, -s * 0.65, s * 0.2, 0, Math.PI * 2);
  ctx.fill();

  // Iris (big colourful circle)
  ctx.fillStyle = '#6a1de8';
  ctx.beginPath();
  ctx.arc(s * 0.38, -s * 0.65, s * 0.14, 0, Math.PI * 2);
  ctx.fill();

  // Pupil
  ctx.fillStyle = '#111';
  ctx.beginPath();
  ctx.arc(s * 0.40, -s * 0.65, s * 0.09, 0, Math.PI * 2);
  ctx.fill();

  // Big sparkly shine (makes eyes look alive!)
  ctx.fillStyle = 'white';
  ctx.beginPath();
  ctx.arc(s * 0.44, -s * 0.70, s * 0.055, 0, Math.PI * 2);
  ctx.fill();
  // Small second shine
  ctx.beginPath();
  ctx.arc(s * 0.32, -s * 0.60, s * 0.03, 0, Math.PI * 2);
  ctx.fill();

  // ── Rosy cheek blush ─────────────────────────────────────
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = '#ff8a80';
  ctx.beginPath();
  ctx.ellipse(s * 0.5, -s * 0.52, s * 0.13, s * 0.08, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // ── Tiny feet peeking out at the bottom ──────────────────
  ctx.strokeStyle = '#e65100';
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  // Left foot
  ctx.beginPath();
  ctx.moveTo(-s * 0.1, s * 0.72);
  ctx.lineTo(-s * 0.22, s * 0.88);
  ctx.moveTo(-s * 0.22, s * 0.88);
  ctx.lineTo(-s * 0.32, s * 0.88);
  ctx.moveTo(-s * 0.22, s * 0.88);
  ctx.lineTo(-s * 0.18, s * 1.0);
  ctx.moveTo(-s * 0.22, s * 0.88);
  ctx.lineTo(-s * 0.08, s * 0.96);
  ctx.stroke();
  // Right foot
  ctx.beginPath();
  ctx.moveTo(s * 0.14, s * 0.72);
  ctx.lineTo(s * 0.22, s * 0.88);
  ctx.moveTo(s * 0.22, s * 0.88);
  ctx.lineTo(s * 0.34, s * 0.88);
  ctx.moveTo(s * 0.22, s * 0.88);
  ctx.lineTo(s * 0.18, s * 1.0);
  ctx.moveTo(s * 0.22, s * 0.88);
  ctx.lineTo(s * 0.08, s * 0.96);
  ctx.stroke();

  ctx.restore();
}

// ── 🦆 Daffy the Duck ────────────────────────────────────
function drawDuck(time, previewMode = false) {
  ctx.save();
  if (!previewMode) {
    ctx.translate(PARROT_X, parrot.y);
    const targetAngle = Math.max(-0.4, Math.min(1.0, parrot.vy * 0.06));
    parrot.angle += (targetAngle - parrot.angle) * 0.15;
    ctx.rotate(parrot.angle);
  }
  const s = PARROT_SIZE;
  const wing = gameState === 'playing' ? Math.sin(time * 9) * 0.5 : Math.sin(time * 3) * 0.15;

  // Tail
  ctx.fillStyle = '#ffe082';
  ctx.beginPath();
  ctx.ellipse(-s * 0.55, s * 0.1, s * 0.18, s * 0.38, 0.4, 0, Math.PI * 2);
  ctx.fill();

  // Wing
  ctx.save();
  ctx.rotate(-wing);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(-s * 0.05, s * 0.05, s * 0.5, s * 0.22, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fffde7';
  ctx.beginPath();
  ctx.ellipse(-s * 0.05, 0, s * 0.3, s * 0.12, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Body — very round and chubby
  ctx.fillStyle = '#ffee58';
  ctx.beginPath();
  ctx.ellipse(0, s * 0.1, s * 0.62, s * 0.7, 0, 0, Math.PI * 2);
  ctx.fill();

  // Belly lighter patch
  ctx.fillStyle = '#fff9c4';
  ctx.beginPath();
  ctx.ellipse(s * 0.1, s * 0.25, s * 0.34, s * 0.46, 0.15, 0, Math.PI * 2);
  ctx.fill();

  // Head
  ctx.fillStyle = '#ffee58';
  ctx.beginPath();
  ctx.arc(s * 0.15, -s * 0.55, s * 0.43, 0, Math.PI * 2);
  ctx.fill();

  // Cute little tuft on top
  ['#ffa000', '#ff8f00'].forEach((c, i) => {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.ellipse(s * 0.1 + i * s * 0.14, -s * 0.96 + i * s * 0.06, s * 0.07, s * 0.17, i * 0.3 - 0.1, 0, Math.PI * 2);
    ctx.fill();
  });

  // Flat orange bill
  ctx.fillStyle = '#ff8f00';
  ctx.beginPath();
  ctx.ellipse(s * 0.56, -s * 0.56, s * 0.26, s * 0.1, 0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#e65100';
  ctx.beginPath();
  ctx.ellipse(s * 0.56, -s * 0.50, s * 0.22, s * 0.08, 0.05, 0, Math.PI * 2);
  ctx.fill();

  // Big eye
  ctx.fillStyle = 'white';
  ctx.beginPath();
  ctx.arc(s * 0.36, -s * 0.65, s * 0.19, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1a237e';
  ctx.beginPath();
  ctx.arc(s * 0.38, -s * 0.65, s * 0.12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#111';
  ctx.beginPath();
  ctx.arc(s * 0.39, -s * 0.65, s * 0.08, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'white';
  ctx.beginPath();
  ctx.arc(s * 0.44, -s * 0.70, s * 0.05, 0, Math.PI * 2);
  ctx.fill();

  // Blush
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = '#ff8a80';
  ctx.beginPath();
  ctx.ellipse(s * 0.5, -s * 0.52, s * 0.12, s * 0.07, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // Orange feet
  ctx.strokeStyle = '#e65100';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  [[-s*0.12, s*0.72], [s*0.18, s*0.72]].forEach(([fx, fy]) => {
    const dir = fx < 0 ? -1 : 1;
    ctx.beginPath();
    ctx.moveTo(fx, fy);
    ctx.lineTo(fx + dir * s * 0.14, fy + s * 0.2);
    ctx.moveTo(fx + dir * s * 0.14, fy + s * 0.2);
    ctx.lineTo(fx + dir * s * 0.28, fy + s * 0.2);
    ctx.moveTo(fx + dir * s * 0.14, fy + s * 0.2);
    ctx.lineTo(fx + dir * s * 0.1, fy + s * 0.34);
    ctx.moveTo(fx + dir * s * 0.14, fy + s * 0.2);
    ctx.lineTo(fx + dir * s * 0.0, fy + s * 0.28);
    ctx.stroke();
  });

  ctx.restore();
}

// ── 🦉 Hoot the Owl ──────────────────────────────────────
function drawOwl(time, previewMode = false) {
  ctx.save();
  if (!previewMode) {
    ctx.translate(PARROT_X, parrot.y);
    const targetAngle = Math.max(-0.4, Math.min(1.0, parrot.vy * 0.06));
    parrot.angle += (targetAngle - parrot.angle) * 0.15;
    ctx.rotate(parrot.angle);
  }
  const s = PARROT_SIZE;
  const wing = gameState === 'playing' ? Math.sin(time * 9) * 0.5 : Math.sin(time * 3) * 0.15;

  // Tail
  ctx.fillStyle = '#5d4037';
  ctx.beginPath();
  ctx.ellipse(-s * 0.48, s * 0.18, s * 0.16, s * 0.35, 0.3, 0, Math.PI * 2);
  ctx.fill();

  // Wing
  ctx.save();
  ctx.rotate(-wing);
  ctx.fillStyle = '#795548';
  ctx.beginPath();
  ctx.ellipse(-s * 0.05, s * 0.05, s * 0.52, s * 0.24, -0.3, 0, Math.PI * 2);
  ctx.fill();
  // Wing feather lines
  ctx.strokeStyle = '#4e342e';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(-s * 0.4 + i * s * 0.2, s * 0.0);
    ctx.lineTo(-s * 0.35 + i * s * 0.2, s * 0.2);
    ctx.stroke();
  }
  ctx.restore();

  // Round body
  ctx.fillStyle = '#6d4c41';
  ctx.beginPath();
  ctx.ellipse(0, s * 0.08, s * 0.58, s * 0.68, 0, 0, Math.PI * 2);
  ctx.fill();

  // Speckled chest — heart-shaped white patch
  ctx.fillStyle = '#efebe9';
  ctx.beginPath();
  ctx.ellipse(s * 0.06, s * 0.18, s * 0.33, s * 0.48, 0.1, 0, Math.PI * 2);
  ctx.fill();
  // Speckle dots on chest
  ctx.fillStyle = 'rgba(109,76,65,0.3)';
  [[0, 0], [s*0.14, s*0.1], [-s*0.1, s*0.18], [s*0.05, s*0.32], [-s*0.08, -s*0.1]].forEach(([dx, dy]) => {
    ctx.beginPath();
    ctx.arc(s * 0.06 + dx, s * 0.18 + dy, s * 0.045, 0, Math.PI * 2);
    ctx.fill();
  });

  // Facial disc (heart-shaped face)
  ctx.fillStyle = '#bcaaa4';
  ctx.beginPath();
  ctx.arc(s * 0.15, -s * 0.52, s * 0.42, 0, Math.PI * 2);
  ctx.fill();

  // Ear tufts
  [[-s*0.08, -s*0.94], [s*0.34, -s*0.92]].forEach(([ex, ey], i) => {
    ctx.fillStyle = '#4e342e';
    ctx.beginPath();
    ctx.ellipse(ex, ey, s * 0.1, s * 0.22, i === 0 ? -0.25 : 0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#6d4c41';
    ctx.beginPath();
    ctx.ellipse(ex, ey + s*0.04, s * 0.06, s * 0.14, i === 0 ? -0.25 : 0.25, 0, Math.PI * 2);
    ctx.fill();
  });

  // HUGE round eyes
  [s * 0.02, s * 0.30].forEach((ex, i) => {
    const ey = -s * 0.58;
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(ex, ey, s * 0.18, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f9a825'; // golden iris
    ctx.beginPath();
    ctx.arc(ex, ey, s * 0.13, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.arc(ex, ey, s * 0.09, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(ex + s*0.05, ey - s*0.05, s * 0.045, 0, Math.PI * 2);
    ctx.fill();
  });

  // Tiny triangle beak between eyes
  ctx.fillStyle = '#ff8f00';
  ctx.beginPath();
  ctx.moveTo(s * 0.14, -s * 0.46);
  ctx.lineTo(s * 0.22, -s * 0.34);
  ctx.lineTo(s * 0.06, -s * 0.34);
  ctx.closePath();
  ctx.fill();

  // Blush
  ctx.globalAlpha = 0.3;
  ctx.fillStyle = '#ff8a80';
  ctx.beginPath();
  ctx.ellipse(s * 0.44, -s * 0.52, s * 0.1, s * 0.07, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  ctx.restore();
}

// ── 🐣 Chirpy the Baby Chick ──────────────────────────────
function drawChick(time, previewMode = false) {
  ctx.save();
  if (!previewMode) {
    ctx.translate(PARROT_X, parrot.y);
    const targetAngle = Math.max(-0.4, Math.min(1.0, parrot.vy * 0.06));
    parrot.angle += (targetAngle - parrot.angle) * 0.15;
    ctx.rotate(parrot.angle);
  }
  const s = PARROT_SIZE;
  const wing = gameState === 'playing' ? Math.sin(time * 12) * 0.6 : Math.sin(time * 3) * 0.15;

  // Fluffy tail
  ['#fff176', '#ffee58', '#fdd835'].forEach((c, i) => {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.arc(-s * (0.42 + i * 0.06), s * (0.0 - i * 0.08), s * (0.18 - i * 0.04), 0, Math.PI * 2);
    ctx.fill();
  });

  // Tiny stub wing (flaps a lot — chicks flap like crazy!)
  ctx.save();
  ctx.rotate(-wing * 1.2);
  ctx.fillStyle = '#fdd835';
  ctx.beginPath();
  ctx.ellipse(-s * 0.08, s * 0.08, s * 0.38, s * 0.16, -0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Round fluffy body (very round!)
  const bodyGrad = ctx.createRadialGradient(-s*0.1, -s*0.1, s*0.1, 0, s*0.08, s*0.68);
  bodyGrad.addColorStop(0, '#fff9c4');
  bodyGrad.addColorStop(1, '#ffee58');
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.arc(0, s * 0.08, s * 0.68, 0, Math.PI * 2); // nearly perfect circle = max cuteness
  ctx.fill();

  // Fluffy chest wisps
  ctx.fillStyle = '#fffde7';
  [[s*0.2, -s*0.08], [s*0.28, s*0.08], [s*0.18, s*0.22]].forEach(([fx, fy]) => {
    ctx.beginPath();
    ctx.arc(fx, fy, s * 0.12, 0, Math.PI * 2);
    ctx.fill();
  });

  // Big round head (almost same size as body — baby proportions!)
  const headGrad = ctx.createRadialGradient(s*0.05, -s*0.65, s*0.05, s*0.15, -s*0.55, s*0.42);
  headGrad.addColorStop(0, '#fff9c4');
  headGrad.addColorStop(1, '#ffee58');
  ctx.fillStyle = headGrad;
  ctx.beginPath();
  ctx.arc(s * 0.15, -s * 0.55, s * 0.46, 0, Math.PI * 2);
  ctx.fill();

  // Single fluffy tuft on top (just hatched look!)
  ctx.fillStyle = '#fdd835';
  ctx.beginPath();
  ctx.arc(s * 0.12, -s * 1.0, s * 0.12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffee58';
  ctx.beginPath();
  ctx.arc(s * 0.22, -s * 0.94, s * 0.09, 0, Math.PI * 2);
  ctx.fill();

  // Tiny little beak (so cute!)
  ctx.fillStyle = '#ff8f00';
  ctx.beginPath();
  ctx.moveTo(s * 0.54, -s * 0.58);
  ctx.lineTo(s * 0.72, -s * 0.52);
  ctx.lineTo(s * 0.54, -s * 0.46);
  ctx.closePath();
  ctx.fill();

  // VERY big eyes (takes up lots of face — max kawaii)
  ctx.fillStyle = 'white';
  ctx.beginPath();
  ctx.arc(s * 0.34, -s * 0.65, s * 0.22, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1b5e20';
  ctx.beginPath();
  ctx.arc(s * 0.36, -s * 0.65, s * 0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#111';
  ctx.beginPath();
  ctx.arc(s * 0.38, -s * 0.65, s * 0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'white';
  ctx.beginPath();
  ctx.arc(s * 0.43, -s * 0.71, s * 0.06, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(s * 0.30, -s * 0.60, s * 0.03, 0, Math.PI * 2);
  ctx.fill();

  // Big rosy cheeks
  ctx.globalAlpha = 0.4;
  ctx.fillStyle = '#ff8a80';
  ctx.beginPath();
  ctx.ellipse(s * 0.52, -s * 0.50, s * 0.14, s * 0.09, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // Tiny stick legs
  ctx.strokeStyle = '#e65100';
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  [[-s*0.1, s*0.72], [s*0.2, s*0.72]].forEach(([lx, ly]) => {
    ctx.beginPath();
    ctx.moveTo(lx, ly);
    ctx.lineTo(lx, ly + s * 0.28);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(lx, ly + s * 0.28);
    ctx.lineTo(lx - s * 0.14, ly + s * 0.28);
    ctx.moveTo(lx, ly + s * 0.28);
    ctx.lineTo(lx + s * 0.14, ly + s * 0.28);
    ctx.stroke();
  });

  ctx.restore();
}

// ── Characters list ───────────────────────────────────────
// Each entry: name, emoji, fun description, and draw function
const CHARACTERS = [
  { name: 'Polly',  emoji: '🦜', desc: 'The colorful parrot!',  color: '#4caf50', drawFn: drawParrot },
  { name: 'Daffy',  emoji: '🦆', desc: 'The waddly duck!',      color: '#ffee58', drawFn: drawDuck   },
  { name: 'Hoot',   emoji: '🦉', desc: 'The wise old owl!',     color: '#795548', drawFn: drawOwl    },
  { name: 'Chirpy', emoji: '🐣', desc: 'The tiny baby chick!',  color: '#fdd835', drawFn: drawChick  },
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

  // Character name below
  ctx.textAlign = 'center';
  if (isSelected) {
    ctx.fillStyle = ch.color;
    ctx.font = 'bold 18px Arial';
    ctx.fillText(`${ch.emoji} ${ch.name}`, cx, cy + cardH * 0.38);
    ctx.fillStyle = '#ccddff';
    ctx.font = '13px Arial';
    ctx.fillText(ch.desc, cx, cy + cardH * 0.52);
  } else {
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
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
