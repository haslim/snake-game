const COLS = 24, ROWS = 24;
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
let cell = 20;

const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const statusEl = document.getElementById('status');
const wrapToggle = document.getElementById('wrap');

// Overlay Elements
const overlayEl = document.getElementById('game-overlay');
const gameOverScreen = document.getElementById('game-over-screen');
const leaderboardScreen = document.getElementById('leaderboard-screen');
const finalScoreEl = document.getElementById('final-score');
const scoreForm = document.getElementById('score-form');
const playerNameInput = document.getElementById('player-name');
const leaderboardBody = document.getElementById('leaderboard-body');

const DIRS = {
  ArrowUp: { x: 0, y: -1 }, ArrowDown: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 }, ArrowRight: { x: 1, y: 0 },
  w: { x: 0, y: -1 }, s: { x: 0, y: 1 }, a: { x: -1, y: 0 }, d: { x: 1, y: 0 },
  k: { x: 0, y: -1 }, j: { x: 0, y: 1 }, h: { x: -1, y: 0 }, l: { x: 1, y: 0 },
};

let snake, dir, nextDir, food, score, speed, acc, state;
let best = +(localStorage.getItem('snakeBest') || 0);
bestEl.textContent = best;

// Remember last entered player name
if (localStorage.getItem('playerName')) {
  playerNameInput.value = localStorage.getItem('playerName');
}

function resize() {
  const container = canvas.parentElement;
  const size = Math.min(container.clientWidth, 480);
  cell = Math.floor(size / COLS);
  canvas.width = cell * COLS;
  canvas.height = cell * ROWS;
}
window.addEventListener('resize', () => { resize(); draw(); });

function reset() {
  snake = [{ x: 12, y: 12 }, { x: 11, y: 12 }, { x: 10, y: 12 }];
  dir = { x: 1, y: 0 };
  nextDir = { x: 1, y: 0 };
  score = 0;
  speed = 140;
  acc = 0;
  state = 'running';
  placeFood();
  updateHud();
  hideOverlay();
}

function placeFood() {
  const free = [];
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (!snake.some(s => s.x === x && s.y === y)) free.push({ x, y });
    }
  }
  food = free.length ? free[Math.floor(Math.random() * free.length)] : null;
}

function updateHud() {
  scoreEl.textContent = score;
  if (score > best) {
    best = score;
    localStorage.setItem('snakeBest', best);
    bestEl.textContent = best;
  }
}

function step() {
  if (state !== 'running') return;
  dir = nextDir;
  const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

  if (wrapToggle.checked) {
    head.x = (head.x + COLS) % COLS;
    head.y = (head.y + ROWS) % ROWS;
  } else if (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS) {
    handleGameOver();
    return;
  }

  if (snake.slice(1).some(s => s.x === head.x && s.y === head.y)) {
    handleGameOver();
    return;
  }

  snake.unshift(head);

  if (food && head.x === food.x && head.y === food.y) {
    score++;
    if (score % 5 === 0) speed = Math.max(50, speed - 8);
    placeFood();
    if (!food) {
      state = 'win';
      handleGameOver();
    }
  } else {
    snake.pop();
  }
  updateHud();
}

function handleGameOver() {
  state = state === 'win' ? 'win' : 'over';
  finalScoreEl.textContent = score;
  showOverlay('gameover');
}

// Overlay Screens management
function showOverlay(screenType) {
  overlayEl.classList.add('active');
  if (screenType === 'gameover') {
    gameOverScreen.classList.add('active');
    leaderboardScreen.classList.remove('active');
  } else if (screenType === 'leaderboard') {
    gameOverScreen.classList.remove('active');
    leaderboardScreen.classList.add('active');
    loadLeaderboard();
  }
}

function hideOverlay() {
  overlayEl.classList.remove('active');
  gameOverScreen.classList.remove('active');
  leaderboardScreen.classList.remove('active');
}

async function loadLeaderboard() {
  try {
    leaderboardBody.innerHTML = '<tr><td colspan="3" style="text-align:center;">Loading...</td></tr>';
    const res = await fetch('/api/scores');
    const scores = await res.json();
    leaderboardBody.innerHTML = '';
    
    if (scores.length === 0) {
      leaderboardBody.innerHTML = '<tr><td colspan="3" style="text-align:center; color: var(--text-secondary);">No scores yet. Be the first!</td></tr>';
      return;
    }
    
    scores.forEach((entry, index) => {
      const tr = document.createElement('tr');
      const rank = index + 1;
      let rankBadge = `<span class="rank-badge rank-other">${rank}</span>`;
      if (rank === 1) rankBadge = `<span class="rank-badge rank-1">🥇</span>`;
      else if (rank === 2) rankBadge = `<span class="rank-badge rank-2">🥈</span>`;
      else if (rank === 3) rankBadge = `<span class="rank-badge rank-3">🥉</span>`;
      
      tr.innerHTML = `
        <td>${rankBadge}</td>
        <td style="font-weight: 500;">${escapeHtml(entry.name)}</td>
        <td style="font-weight: bold; color: var(--accent-cyan); font-variant-numeric: tabular-nums;">${entry.score}</td>
      `;
      leaderboardBody.appendChild(tr);
    });
  } catch (err) {
    console.error(err);
    leaderboardBody.innerHTML = '<tr><td colspan="3" style="text-align:center; color: var(--food-color);">Failed to load leaderboard.</td></tr>';
  }
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Submit score
scoreForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = playerNameInput.value.trim();
  if (!name) return;
  
  localStorage.setItem('playerName', name);
  
  try {
    const btn = scoreForm.querySelector('button');
    btn.disabled = true;
    btn.textContent = 'Submitting...';
    
    await fetch('/api/scores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, score })
    });
    
    btn.disabled = false;
    btn.textContent = 'Submit Score';
    
    // Smooth transition to leaderboard
    showOverlay('leaderboard');
  } catch (err) {
    console.error(err);
    alert('Error submitting score, please try again.');
  }
});

function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function draw() {
  // BG
  ctx.fillStyle = '#06080c';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Subtle grid lines
  ctx.strokeStyle = 'rgba(255,255,255,0.015)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= COLS; i++) {
    ctx.beginPath();
    ctx.moveTo(i * cell, 0);
    ctx.lineTo(i * cell, ROWS * cell);
    ctx.stroke();
  }
  for (let j = 0; j <= ROWS; j++) {
    ctx.beginPath();
    ctx.moveTo(0, j * cell);
    ctx.lineTo(COLS * cell, j * cell);
    ctx.stroke();
  }

  // Draw Food with glow
  if (food) {
    ctx.save();
    ctx.shadowBlur = 12;
    ctx.shadowColor = '#ff3366';
    ctx.fillStyle = '#ff3366';
    
    // Pulsing size effect
    const pulse = 1 + Math.sin(Date.now() * 0.01) * 0.1;
    const r = (cell - 4) / 2 * pulse;
    const cx = food.x * cell + cell / 2;
    const cy = food.y * cell + cell / 2;
    
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Draw Snake with gradient and glow
  snake.forEach((s, i) => {
    ctx.save();
    if (i === 0) {
      // Head
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#00f2fe';
      ctx.fillStyle = '#00f2fe';
      roundRect(s.x * cell + 1.5, s.y * cell + 1.5, cell - 3, cell - 3, cell * 0.35);
      ctx.fill();
      
      // Eyes based on direction
      ctx.fillStyle = '#06080c';
      const eyeSize = cell * 0.15;
      const offset = cell * 0.25;
      
      if (dir.x !== 0) { // Moving Left/Right
        const eyeX = s.x * cell + (dir.x > 0 ? cell - offset - eyeSize : offset);
        ctx.fillRect(eyeX, s.y * cell + offset, eyeSize, eyeSize);
        ctx.fillRect(eyeX, s.y * cell + cell - offset - eyeSize, eyeSize, eyeSize);
      } else { // Moving Up/Down
        const eyeY = s.y * cell + (dir.y > 0 ? cell - offset - eyeSize : offset);
        ctx.fillRect(s.x * cell + offset, eyeY, eyeSize, eyeSize);
        ctx.fillRect(s.x * cell + cell - offset - eyeSize, eyeY, eyeSize, eyeSize);
      }
    } else {
      // Body
      const t = i / snake.length;
      ctx.fillStyle = `rgba(56, 239, 125, ${0.95 - t * 0.6})`;
      roundRect(s.x * cell + 2, s.y * cell + 2, cell - 4, cell - 4, cell * 0.25);
      ctx.fill();
    }
    ctx.restore();
  });

  // UI state notification text on the header
  if (state === 'over') statusEl.textContent = '💀 Game Over';
  else if (state === 'win') statusEl.textContent = '🎉 You Win!';
  else if (state === 'paused') statusEl.textContent = '⏸ Paused';
  else statusEl.textContent = '';
}

let last = 0;
function loop(ts) {
  if (!last) last = ts;
  const dt = ts - last;
  last = ts;
  if (state === 'running') {
    acc += dt;
    while (acc >= speed) {
      step();
      acc -= speed;
      if (state !== 'running') break;
    }
  }
  draw();
  requestAnimationFrame(loop);
}

window.addEventListener('keydown', (e) => {
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  if (k === ' ') {
    if (state === 'running') state = 'paused';
    else if (state === 'paused') state = 'running';
    e.preventDefault();
    return;
  }
  if (k === 'r') { reset(); return; }
  const d = DIRS[k];
  if (d) {
    if (dir.x + d.x === 0 && dir.y + d.y === 0) return;
    nextDir = d;
    e.preventDefault();
  }
});

// Touch swipe
let tsx = 0, tsy = 0;
canvas.addEventListener('touchstart', (e) => {
  const t = e.touches[0];
  tsx = t.clientX;
  tsy = t.clientY;
}, { passive: true });
canvas.addEventListener('touchend', (e) => {
  const t = e.changedTouches[0];
  const dx = t.clientX - tsx;
  const dy = t.clientY - tsy;
  if (Math.abs(dx) < 20 && Math.abs(dy) < 20) {
    if (state !== 'running') reset();
    return;
  }
  let d;
  if (Math.abs(dx) > Math.abs(dy)) d = dx > 0 ? { x: 1, y: 0 } : { x: -1, y: 0 };
  else d = dy > 0 ? { x: 0, y: 1 } : { x: 0, y: -1 };
  if (!(dir.x + d.x === 0 && dir.y + d.y === 0)) nextDir = d;
}, { passive: true });

document.getElementById('restart').addEventListener('click', reset);
document.getElementById('overlay-restart').addEventListener('click', reset);
document.getElementById('show-leaderboard-btn').addEventListener('click', () => {
  if (state === 'running') state = 'paused';
  showOverlay('leaderboard');
});
document.getElementById('leaderboard-close').addEventListener('click', () => {
  hideOverlay();
  if (state === 'paused') state = 'running';
});

resize();
reset();
requestAnimationFrame(loop);

resize();
reset();
requestAnimationFrame(loop);
