const readline = require('readline');

readline.emitKeypressEvents(process.stdin);
if (process.stdin.isTTY) process.stdin.setRawMode(true);

const W = 20;
const H = 20;
const TICK_MS = 50;

let snake = [];
let direction = { x: 0, y: 0 };
let nextDirection = { x: 0, y: 0 };
let food = null;
let score = 0;
let gameOver = false;
let win = false;
let paused = false;
let speed = 150;
let tick = 0;

function spawnFood() {
  const set = new Set(snake.map(s => `${s.x},${s.y}`));
  const free = [];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (!set.has(`${x},${y}`)) free.push({ x, y });
    }
  }
  if (free.length === 0) return null;
  return free[Math.floor(Math.random() * free.length)];
}

function reset() {
  snake = [{ x: 10, y: 10 }];
  direction = { x: 0, y: 0 };
  nextDirection = { x: 0, y: 0 };
  score = 0;
  gameOver = false;
  win = false;
  paused = false;
  speed = 150;
  tick = 0;
  food = spawnFood();
}

function render() {
  const out = [];
  const set = new Set(snake.map(s => `${s.x},${s.y}`));
  const head = snake[0];

  out.push('┌' + '─'.repeat(W) + '┐');
  for (let y = 0; y < H; y++) {
    let row = '│';
    for (let x = 0; x < W; x++) {
      if (x === head.x && y === head.y) row += '■';
      else if (set.has(`${x},${y}`)) row += '□';
      else if (food && x === food.x && y === food.y) row += '●';
      else row += ' ';
    }
    row += '│';
    out.push(row);
  }
  out.push('└' + '─'.repeat(W) + '┘');
  out.push(` Score: ${score}  |  Speed: ${speed}ms  |  P: pause  R: restart  Q: quit`);

  if (gameOver) out.push('\n 💀 GAME OVER — Press R to restart, Q to quit.');
  if (win) out.push('\n 🎉 YOU WIN! — Press R to restart, Q to quit.');
  if (paused && !gameOver && !win) out.push('\n ⏸  PAUSED');

  console.clear();
  console.log(out.join('\n'));
}

function step() {
  if (gameOver || win || paused) return;
  direction = { ...nextDirection };
  if (direction.x === 0 && direction.y === 0) return;

  const head = { x: snake[0].x + direction.x, y: snake[0].y + direction.y };

  // Wall wrap
  if (head.x < 0) head.x = W - 1;
  if (head.x >= W) head.x = 0;
  if (head.y < 0) head.y = H - 1;
  if (head.y >= H) head.y = 0;

  // Self collision (ignore tail tip since it moves away — unless growing)
  if (snake.slice(1).some(s => s.x === head.x && s.y === head.y)) {
    gameOver = true;
    return;
  }

  snake.unshift(head);

  if (food && head.x === food.x && head.y === food.y) {
    score++;
    if (score % 5 === 0 && speed > 50) speed -= 10;
    food = spawnFood();
    if (!food) win = true;
  } else {
    snake.pop();
  }
}

const KEY_MAP = {
  up: { x: 0, y: -1 }, down: { x: 0, y: 1 },
  left: { x: -1, y: 0 }, right: { x: 1, y: 0 },
  w: { x: 0, y: -1 }, s: { x: 0, y: 1 },
  a: { x: -1, y: 0 }, d: { x: 1, y: 0 },
  k: { x: 0, y: -1 }, j: { x: 0, y: 1 },
  h: { x: -1, y: 0 }, l: { x: 1, y: 0 },
};

process.stdin.on('keypress', (_, key) => {
  if (!key) return;
  if (key.name === 'q') process.exit(0);
  if (key.name === 'p') { paused = !paused; render(); return; }
  if (key.name === 'r') { reset(); render(); return; }

  const nd = KEY_MAP[key.name];
  if (!nd) return;
  // No 180° reverse
  if (direction.x + nd.x === 0 && direction.y + nd.y === 0) return;
  nextDirection = nd;
});

console.log('🐍 SNAKE GAME');
console.log('Arrow keys / WASD / Vim (hjkl) to move');
console.log('P: pause   R: restart   Q: quit');
console.log('\nPress any movement key to start...');

process.stdin.on('keypress', function starter(_v, key) {
  if (!key || !KEY_MAP[key.name]) return;
  process.stdin.removeListener('keypress', starter);
  reset();
  nextDirection = KEY_MAP[key.name];
  render();
  setInterval(() => {
    tick++;
    const stepEvery = Math.max(1, Math.round(speed / TICK_MS));
    if (tick % stepEvery === 0) step();
    render();
  }, TICK_MS);
});
