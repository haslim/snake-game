const COLS = 24, ROWS = 24;
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
let cell = 20;

const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const statusEl = document.getElementById('status');
const wrapToggle = document.getElementById('wrap');

const DIRS = {
  ArrowUp: { x: 0, y: -1 }, ArrowDown: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 }, ArrowRight: { x: 1, y: 0 },
  w: { x: 0, y: -1 }, s: { x: 0, y: 1 }, a: { x: -1, y: 0 }, d: { x: 1, y: 0 },
  k: { x: 0, y: -1 }, j: { x: 0, y: 1 }, h: { x: -1, y: 0 }, l: { x: 1, y: 0 },
};

let snake, dir, nextDir, food, score, speed, acc, state;
let best = +(localStorage.getItem('snakeBest') || 0);
bestEl.textContent = best;

function resize() {
  const max = Math.min(window.innerWidth - 52, window.innerHeight - 220, 560);
  cell = Math.max(10, Math.floor(max / COLS));
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
    state = 'over';
    return;
  }

  if (snake.slice(1).some(s => s.x === head.x && s.y === head.y)) {
    state = 'over';
    return;
  }

  snake.unshift(head);

  if (food && head.x === food.x && head.y === food.y) {
    score++;
    if (score % 5 === 0) speed = Math.max(60, speed - 8);
    placeFood();
    if (!food) state = 'win';
  } else {
    snake.pop();
  }
  updateHud();
}

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
  ctx.fillStyle = '#0a0e14';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = 'rgba(255,255,255,0.03)';
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

  if (food) {
    ctx.fillStyle = '#ff5470';
    roundRect(food.x * cell + 2, food.y * cell + 2, cell - 4, cell - 4, cell * 0.25);
    ctx.fill();
  }

  snake.forEach((s, i) => {
    const t = i / snake.length;
    ctx.fillStyle = i === 0 ? '#7afcff' : `rgba(106,255,170,${0.95 - t * 0.5})`;
    roundRect(s.x * cell + 1, s.y * cell + 1, cell - 2, cell - 2, cell * 0.25);
    ctx.fill();
  });

  if (state === 'over') statusEl.textContent = '💀 Game Over — press R / tap to restart';
  else if (state === 'win') statusEl.textContent = '🎉 You Win! — press R';
  else if (state === 'paused') statusEl.textContent = '⏸ Paused — Space to resume';
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

resize();
reset();
requestAnimationFrame(loop);
