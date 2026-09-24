const canvas = document.querySelector('#gameCanvas');
const ctx = canvas.getContext('2d');
const overlay = document.querySelector('#gameOverlay');
const overlayKicker = document.querySelector('#overlayKicker');
const overlayTitle = document.querySelector('#overlayTitle');
const overlayMessage = document.querySelector('#overlayMessage');
const startButton = document.querySelector('#startButton');
const scoreElement = document.querySelector('#score');
const highScoreElement = document.querySelector('#highScore');
const killsElement = document.querySelector('#kills');
const highKillsElement = document.querySelector('#highKills');
const levelElement = document.querySelector('#level');
const statusText = document.querySelector('#statusText');

const WORLD = { width: 1200, height: 520, groundY: 404 };
const player = { x: 145, y: WORLD.groundY - 82, width: 48, height: 82, velocityY: 0, grounded: true };
let obstacles = [];
let enemies = [];
let bullets = [];
let particles = [];
let stars = [];
let running = false;
let paused = false;
let gameOver = false;
let score = 0;
let highScore = Number(localStorage.getItem('neonRunnerBest') || 0);
let kills = 0;
let highKills = Number(localStorage.getItem('neonRunnerHighKills') || 0);
let speed = 7;
let spawnTimer = 0;
let nextSpawn = 92;
let enemySpawnTimer = 0;
let nextEnemySpawn = 175;
let lastTime = 0;
let animationFrame;

for (let i = 0; i < 80; i += 1) {
  stars.push({ x: Math.random() * WORLD.width, y: Math.random() * 285, size: Math.random() * 2 + 0.5, alpha: Math.random() * 0.55 + 0.15, drift: Math.random() * 0.6 + 0.15 });
}

function formatScore(value) { return Math.floor(value).toString().padStart(6, '0'); }
function updateHud() {
  scoreElement.textContent = formatScore(score);
  highScoreElement.textContent = formatScore(Math.max(highScore, score));
  killsElement.textContent = String(kills).padStart(3, '0');
  highKillsElement.textContent = String(Math.max(highKills, kills)).padStart(3, '0');
  levelElement.textContent = String(Math.min(99, Math.floor(score / 500) + 1)).padStart(2, '0');
}

function setOverlay(mode) {
  overlay.classList.remove('is-hidden');
  if (mode === 'ready') {
    overlayKicker.textContent = 'RUN PROTOCOL'; overlayTitle.textContent = 'READY TO RUN?';
    overlayMessage.textContent = '按下 Space 或 W 跳躍，使用 X 鎖定並摧毀前方敵人。'; startButton.querySelector('span').textContent = 'START RUN';
  } else {
    overlayKicker.textContent = 'SIGNAL LOST'; overlayTitle.textContent = 'GAME OVER';
    overlayMessage.textContent = `距離 ${formatScore(score)} / 擊殺 ${String(kills).padStart(3, '0')}。突破你的戰鬥紀錄。`; startButton.querySelector('span').textContent = 'RESTART RUN';
  }
}

function resetGame() {
  player.y = WORLD.groundY - player.height; player.velocityY = 0; player.grounded = true;
  obstacles = []; enemies = []; bullets = []; particles = []; score = 0; kills = 0; speed = 7; spawnTimer = 0; nextSpawn = 92; enemySpawnTimer = 0; nextEnemySpawn = 175;
  running = true; paused = false; gameOver = false; overlay.classList.add('is-hidden');
  statusText.textContent = 'RUNNING'; updateHud();
}

function jump() {
  if (!running || paused || gameOver) return;
  if (player.grounded) {
    player.velocityY = -17.2; player.grounded = false;
    for (let i = 0; i < 7; i += 1) particles.push({ x: player.x + 10, y: WORLD.groundY - 5, vx: -Math.random() * 3, vy: -Math.random() * 2, life: 1, size: Math.random() * 3 + 1 });
  }
}

function spawnObstacle() {
  const tall = Math.random() > 0.46;
  const width = tall ? 32 + Math.random() * 11 : 46 + Math.random() * 18;
  const height = tall ? 61 + Math.random() * 38 : 31 + Math.random() * 19;
  obstacles.push({ x: WORLD.width + 25, y: WORLD.groundY - height, width, height, tall, phase: Math.random() * 10 });
  nextSpawn = Math.max(54, 108 - speed * 3 + Math.random() * 58);
}

function spawnEnemy() {
  const types = ['scout', 'drone', 'brute'];
  const type = types[Math.floor(Math.random() * types.length)];
  const specs = {
    scout: { width: 35, height: 57, speed: 1.15, color: '#e15f43' },
    drone: { width: 44, height: 42, speed: 0.92, color: '#75c7d8' },
    brute: { width: 56, height: 78, speed: 0.66, color: '#f3a847' },
  };
  const spec = specs[type];
  enemies.push({ type, x: WORLD.width + 35, y: WORLD.groundY - spec.height, width: spec.width, height: spec.height, speed: spec.speed, phase: Math.random() * 10, health: 1 });
  nextEnemySpawn = Math.max(92, 185 - speed * 4 + Math.random() * 120);
}

function fire() {
  if (!running || paused || gameOver) return;
  bullets.push({ x: player.x + player.width - 2, y: player.y + 29, width: 19, height: 4, speed: 18, life: 1 });
  for (let i = 0; i < 3; i += 1) particles.push({ x: player.x + player.width, y: player.y + 31, vx: Math.random() * 2, vy: (Math.random() - .5) * 2, life: .7, size: 2 });
}

function update(delta) {
  if (!running || paused || gameOver) return;
  const frame = Math.min(delta / 16.67, 2);
  score += delta * 0.012 * speed;
  speed = Math.min(15, 7 + score / 1150);
  spawnTimer += frame;
  if (spawnTimer > nextSpawn) { spawnTimer = 0; spawnObstacle(); }
  enemySpawnTimer += frame;
  if (enemySpawnTimer > nextEnemySpawn) { enemySpawnTimer = 0; spawnEnemy(); }

  player.velocityY += 0.84 * frame;
  player.y += player.velocityY * frame;
  if (player.y >= WORLD.groundY - player.height) { player.y = WORLD.groundY - player.height; player.velocityY = 0; player.grounded = true; }

  obstacles.forEach((obstacle) => { obstacle.x -= speed * frame; obstacle.phase += 0.08 * frame; });
  obstacles = obstacles.filter((obstacle) => obstacle.x + obstacle.width > -30);
  enemies.forEach((enemy) => { enemy.x -= speed * enemy.speed * frame; enemy.phase += 0.09 * frame; });
  enemies = enemies.filter((enemy) => enemy.x + enemy.width > -50);
  bullets.forEach((bullet) => { bullet.x += bullet.speed * frame; bullet.life -= 0.018 * frame; });
  bullets = bullets.filter((bullet) => bullet.x < WORLD.width + 30 && bullet.life > 0);
  particles.forEach((particle) => { particle.x += particle.vx * frame; particle.y += particle.vy * frame; particle.vy += 0.15 * frame; particle.life -= 0.035 * frame; });
  particles = particles.filter((particle) => particle.life > 0);

  const playerBox = { x: player.x + 9, y: player.y + 7, width: player.width - 16, height: player.height - 11 };
  if (obstacles.some((obstacle) => playerBox.x < obstacle.x + obstacle.width - 5 && playerBox.x + playerBox.width > obstacle.x + 5 && playerBox.y < obstacle.y + obstacle.height && playerBox.y + playerBox.height > obstacle.y + 4)) endGame();
  if (enemies.some((enemy) => playerBox.x < enemy.x + enemy.width - 5 && playerBox.x + playerBox.width > enemy.x + 5 && playerBox.y < enemy.y + enemy.height && playerBox.y + playerBox.height > enemy.y + 4)) endGame();
  bullets.forEach((bullet) => {
    enemies.forEach((enemy) => {
      if (bullet.x < enemy.x + enemy.width && bullet.x + bullet.width > enemy.x && bullet.y < enemy.y + enemy.height && bullet.y + bullet.height > enemy.y) {
        enemy.health = 0; bullet.life = 0; kills += 1;
        for (let i = 0; i < 12; i += 1) particles.push({ x: enemy.x + enemy.width / 2, y: enemy.y + enemy.height / 2, vx: (Math.random() - .5) * 7, vy: (Math.random() - .5) * 7, life: 1, size: Math.random() * 4 + 1 });
      }
    });
  });
  enemies = enemies.filter((enemy) => enemy.health > 0);
  updateHud();
}

function endGame() {
  gameOver = true; running = false; highScore = Math.max(highScore, Math.floor(score)); highKills = Math.max(highKills, kills);
  localStorage.setItem('neonRunnerBest', highScore); localStorage.setItem('neonRunnerHighKills', highKills); statusText.textContent = 'RUN TERMINATED'; setOverlay('gameover');
  for (let i = 0; i < 22; i += 1) particles.push({ x: player.x + player.width / 2, y: player.y + player.height / 2, vx: (Math.random() - .5) * 8, vy: (Math.random() - .5) * 8, life: 1, size: Math.random() * 4 + 1 });
  updateHud();
}

function drawBackground(time) {
  const gradient = ctx.createLinearGradient(0, 0, 0, WORLD.height); gradient.addColorStop(0, '#111c24'); gradient.addColorStop(1, '#080d12'); ctx.fillStyle = gradient; ctx.fillRect(0, 0, WORLD.width, WORLD.height);
  stars.forEach((star) => { const x = (star.x - time * star.drift * 0.01 * speed) % WORLD.width; ctx.globalAlpha = star.alpha * .65; ctx.fillStyle = '#b7d5d7'; ctx.fillRect(x < 0 ? x + WORLD.width : x, star.y, star.size, star.size); }); ctx.globalAlpha = 1;
  ctx.strokeStyle = 'rgba(117, 199, 216, .08)'; ctx.lineWidth = 1;
  for (let x = 0; x < WORLD.width; x += 55) { ctx.beginPath(); ctx.moveTo(x, 310); ctx.lineTo(x - 150, WORLD.groundY); ctx.stroke(); }
  ctx.strokeStyle = 'rgba(117, 199, 216, .18)'; ctx.beginPath(); ctx.moveTo(0, WORLD.groundY); ctx.lineTo(WORLD.width, WORLD.groundY); ctx.stroke();
  ctx.strokeStyle = 'rgba(243, 168, 71, .26)'; ctx.setLineDash([4, 22]); ctx.lineDashOffset = -time * speed * .12; ctx.beginPath(); ctx.moveTo(0, WORLD.groundY + 15); ctx.lineTo(WORLD.width, WORLD.groundY + 15); ctx.stroke(); ctx.setLineDash([]);
}

function drawPlayer() {
  ctx.save(); ctx.translate(player.x, player.y); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const armor = '#687780'; const armorLight = '#a6b4b5'; const dark = '#18242c'; const orange = '#f3a847'; const blue = '#75c7d8';

  ctx.shadowColor = orange; ctx.shadowBlur = 13; ctx.strokeStyle = '#354650'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.arc(11, 69, 9, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.arc(39, 69, 9, 0, Math.PI * 2); ctx.stroke();
  ctx.shadowBlur = 0; ctx.fillStyle = '#11191f'; ctx.beginPath(); ctx.arc(11, 69, 5, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(39, 69, 5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = orange; ctx.fillRect(5, 74, 13, 3); ctx.fillRect(34, 74, 12, 3);

  ctx.shadowColor = orange; ctx.shadowBlur = 16; ctx.fillStyle = armor;
  ctx.beginPath(); ctx.moveTo(5, 65); ctx.lineTo(13, 51); ctx.lineTo(20, 47); ctx.lineTo(37, 48); ctx.lineTo(46, 58); ctx.lineTo(40, 68); ctx.lineTo(13, 68); ctx.closePath(); ctx.fill();
  ctx.shadowBlur = 0; ctx.fillStyle = dark; ctx.beginPath(); ctx.moveTo(14, 57); ctx.lineTo(22, 50); ctx.lineTo(35, 51); ctx.lineTo(42, 58); ctx.lineTo(37, 64); ctx.lineTo(15, 64); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = orange; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(15, 57); ctx.lineTo(25, 53); ctx.lineTo(38, 57); ctx.stroke();
  ctx.fillStyle = blue; ctx.fillRect(36, 61, 9, 3);

  ctx.fillStyle = armorLight; ctx.beginPath(); ctx.moveTo(17, 47); ctx.lineTo(21, 32); ctx.lineTo(34, 30); ctx.lineTo(40, 47); ctx.lineTo(34, 54); ctx.lineTo(22, 52); ctx.closePath(); ctx.fill();
  ctx.fillStyle = dark; ctx.fillRect(24, 37, 9, 12); ctx.fillStyle = orange; ctx.fillRect(27, 39, 4, 6);
  ctx.strokeStyle = '#d7d8c9'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(20, 34); ctx.lineTo(27, 49); ctx.lineTo(38, 46); ctx.stroke();

  ctx.fillStyle = '#293943'; ctx.beginPath(); ctx.moveTo(16, 31); ctx.lineTo(16, 18); ctx.lineTo(21, 8); ctx.lineTo(31, 5); ctx.lineTo(40, 11); ctx.lineTo(41, 23); ctx.lineTo(35, 34); ctx.lineTo(23, 35); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = armorLight; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(21, 9); ctx.lineTo(28, 17); ctx.lineTo(39, 12); ctx.moveTo(28, 17); ctx.lineTo(29, 30); ctx.stroke();
  ctx.fillStyle = '#0d151a'; ctx.beginPath(); ctx.moveTo(19, 19); ctx.lineTo(28, 16); ctx.lineTo(39, 17); ctx.lineTo(35, 25); ctx.lineTo(24, 27); ctx.closePath(); ctx.fill();
  ctx.shadowColor = orange; ctx.shadowBlur = 9; ctx.strokeStyle = orange; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(22, 22); ctx.lineTo(35, 20); ctx.stroke();

  ctx.shadowBlur = 0; ctx.fillStyle = '#303f49'; ctx.fillRect(41, 32, 7, 17); ctx.fillStyle = orange; ctx.fillRect(45, 35, 5, 3); ctx.fillStyle = blue; ctx.fillRect(42, 47, 6, 2);
  ctx.fillStyle = '#3f5059'; ctx.fillRect(9, 36, 6, 13); ctx.fillStyle = orange; ctx.fillRect(8, 39, 3, 5);
  ctx.restore();
}

function drawObstacle(obstacle) {
  const pulse = Math.sin(obstacle.phase) * 2; ctx.save(); ctx.shadowColor = '#e15f43'; ctx.shadowBlur = 15; ctx.fillStyle = '#c84c3d';
  ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height); ctx.shadowBlur = 0; ctx.fillStyle = '#552d2e';
  ctx.fillRect(obstacle.x + 6, obstacle.y + 7, obstacle.width - 12, 5); ctx.fillRect(obstacle.x + 6, obstacle.y + 20, obstacle.width - 12, 3);
  ctx.strokeStyle = '#f3a847'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(obstacle.x + 4, obstacle.y + obstacle.height - 7); ctx.lineTo(obstacle.x + obstacle.width - 4, obstacle.y + obstacle.height - 7); ctx.stroke();
  ctx.fillStyle = '#f3a847'; ctx.fillRect(obstacle.x - 4, obstacle.y + obstacle.height - 5 + pulse, obstacle.width + 8, 3); ctx.restore();
}

function drawEnemy(enemy) {
  const bob = enemy.type === 'drone' ? Math.sin(enemy.phase) * 5 : 0;
  ctx.save(); ctx.translate(enemy.x, enemy.y + bob); ctx.lineJoin = 'round';
  const palette = { scout: { body: '#9b403a', light: '#e15f43', accent: '#75c7d8' }, drone: { body: '#31505b', light: '#75c7d8', accent: '#f3a847' }, brute: { body: '#76532e', light: '#f3a847', accent: '#e15f43' } }[enemy.type];
  ctx.shadowColor = palette.light; ctx.shadowBlur = 13; ctx.fillStyle = palette.body;
  if (enemy.type === 'scout') {
    ctx.beginPath(); ctx.moveTo(5, enemy.height); ctx.lineTo(7, 22); ctx.lineTo(14, 9); ctx.lineTo(27, 6); ctx.lineTo(34, 18); ctx.lineTo(31, enemy.height); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#11191f'; ctx.fillRect(15, 15, 14, 7); ctx.fillStyle = palette.accent; ctx.fillRect(18, 17, 10, 2);
    ctx.fillStyle = palette.light; ctx.fillRect(1, 27, 7, 18); ctx.fillRect(29, 25, 7, 20);
  } else if (enemy.type === 'drone') {
    ctx.beginPath(); ctx.moveTo(5, 16); ctx.lineTo(15, 7); ctx.lineTo(36, 7); ctx.lineTo(43, 17); ctx.lineTo(35, 32); ctx.lineTo(12, 34); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#11191f'; ctx.fillRect(13, 15, 21, 8); ctx.fillStyle = palette.accent; ctx.fillRect(18, 18, 13, 2);
    ctx.strokeStyle = palette.light; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(3, 39); ctx.lineTo(14, 34); ctx.moveTo(40, 34); ctx.lineTo(48, 39); ctx.stroke();
  } else {
    ctx.beginPath(); ctx.moveTo(5, enemy.height); ctx.lineTo(7, 19); ctx.lineTo(15, 9); ctx.lineTo(42, 9); ctx.lineTo(53, 22); ctx.lineTo(51, enemy.height); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#11191f'; ctx.fillRect(18, 17, 23, 9); ctx.fillStyle = palette.accent; ctx.fillRect(22, 20, 16, 3);
    ctx.fillStyle = palette.light; ctx.fillRect(1, 25, 9, 25); ctx.fillRect(47, 25, 9, 25); ctx.fillStyle = '#11191f'; ctx.fillRect(16, 58, 9, 20); ctx.fillRect(36, 58, 9, 20);
  }
  ctx.shadowBlur = 0; ctx.fillStyle = '#f3a847'; ctx.fillRect(2, enemy.height - 4, enemy.width - 4, 3); ctx.restore();
}

function drawBullets() {
  bullets.forEach((bullet) => { ctx.save(); ctx.shadowColor = '#75c7d8'; ctx.shadowBlur = 12; ctx.fillStyle = '#d8fbf5'; ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height); ctx.fillStyle = '#f3a847'; ctx.fillRect(bullet.x - 5, bullet.y + 1, 6, 2); ctx.restore(); });
}

function drawParticles() { particles.forEach((particle) => { ctx.globalAlpha = particle.life; ctx.fillStyle = particle.life > .45 ? '#75c7d8' : '#e15f43'; ctx.fillRect(particle.x, particle.y, particle.size, particle.size); }); ctx.globalAlpha = 1; }
function render(time) { drawBackground(time); obstacles.forEach(drawObstacle); enemies.forEach(drawEnemy); drawBullets(); drawParticles(); drawPlayer(); }
function loop(time) { const delta = lastTime ? time - lastTime : 16.67; lastTime = time; update(delta); render(time); animationFrame = requestAnimationFrame(loop); }

function togglePause() {
  if (!running || gameOver) return; paused = !paused; statusText.textContent = paused ? 'PAUSED' : 'RUNNING';
  if (paused) { overlayKicker.textContent = 'SYSTEM HOLD'; overlayTitle.textContent = 'PAUSED'; overlayMessage.textContent = '按下 P 繼續你的奔跑。'; startButton.querySelector('span').textContent = 'RESUME'; overlay.classList.remove('is-hidden'); }
  else overlay.classList.add('is-hidden');
}

startButton.addEventListener('click', () => { if (paused) togglePause(); else resetGame(); });
document.addEventListener('keydown', (event) => {
  if (event.code === 'Space' || event.key.toLowerCase() === 'w') { event.preventDefault(); if (!running || gameOver) resetGame(); else jump(); }
  if (event.key.toLowerCase() === 'x') { event.preventDefault(); fire(); }
  if (event.key.toLowerCase() === 'p') togglePause();
  if (event.key.toLowerCase() === 'r') resetGame();
});
canvas.addEventListener('pointerdown', () => { if (!running || gameOver) resetGame(); else jump(); });
updateHud(); render(0); animationFrame = requestAnimationFrame(loop);
