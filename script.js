// =============== CONFIGURAÇÃO =============== //
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const CELL = 70;
const COLS = 8, ROWS = 8;

let currentLevelIndex = 0;
let robot = { gridX: 0, gridY: 0 };
let robotPixel = { x: 0, y: 0 };
let chips = [];
let corruptedChips = [];
let traps = [];
let timeBonusChips = [];
let timeExpired = false;
let isRunning = false;
let shouldStopExecution = false;
let isPaused = false;

// ==================== VIDAS E TIMER ==================== //
let lives = 3;
let timeLeft = 0;                    // ← Alterado (não mais fixo em 60)
let timerInterval = null;

const levelTimes = [60, 75, 90, 100];

let penaltyTime = 0;
let levelStartTime = 0;
let livesLostThisLevel = 0;
let collectedChipsMemory = []; // chips coletados que persistem ao perder vida
let collectedTimeBonusMemory = []; // chips de tempo coletados — só resetam no game over

let completedLevels = [];
let levelStars = {};
let usedSolution = false;
let fromMenu = false;

// ==================== SISTEMA DE PARTÍCULAS ==================== //
let particles = [];
let floatingTexts = [];
let robotDeathAnim = null; // { startTime, px, py }

function spawnChipCollectParticles(px, py) {
  const colors = ['#10b981', '#34d399', '#6ee7b7', '#ffffff', '#ffd93d', '#00f5ff'];
  for (let i = 0; i < 18; i++) {
    const angle = (Math.PI * 2 * i) / 18 + (Math.random() - 0.5) * 0.4;
    const speed = 2.5 + Math.random() * 3.5;
    particles.push({
      x: px, y: py,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1.0,
      decay: 0.028 + Math.random() * 0.018,
      radius: 3 + Math.random() * 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      type: 'chip'
    });
  }
  floatingTexts.push({
    x: px, y: py - 10,
    vy: -1.5,
    life: 1.0,
    decay: 0.022,
    text: '+1 💾',
    color: '#34d399'
  });
}

function spawnDeathParticles(px, py) {
  const colors = ['#ef4444', '#f97316', '#fbbf24', '#ffffff', '#ff6b6b'];
  for (let i = 0; i < 28; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1.5 + Math.random() * 5;
    particles.push({
      x: px, y: py,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 2,
      life: 1.0,
      decay: 0.018 + Math.random() * 0.022,
      radius: 2 + Math.random() * 6,
      color: colors[Math.floor(Math.random() * colors.length)],
      type: 'death'
    });
  }
  floatingTexts.push({
    x: px, y: py - 15,
    vy: -1.2,
    life: 1.0,
    decay: 0.018,
    text: '💥 -1 ❤️',
    color: '#ef4444'
  });
}

function updateAndDrawParticles() {
  // Particles
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.12; // gravity
    p.life -= p.decay;
    if (p.life <= 0) { particles.splice(i, 1); continue; }
    ctx.save();
    ctx.globalAlpha = Math.max(0, p.life);
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius * p.life, 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    if (p.type === 'death') {
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 8;
    }
    ctx.fill();
    ctx.restore();
  }
  // Floating texts
  for (let i = floatingTexts.length - 1; i >= 0; i--) {
    const ft = floatingTexts[i];
    ft.y += ft.vy;
    ft.life -= ft.decay;
    if (ft.life <= 0) { floatingTexts.splice(i, 1); continue; }
    ctx.save();
    ctx.globalAlpha = Math.max(0, ft.life);
    ctx.font = `bold ${Math.round(18 + (1 - ft.life) * 4)}px system-ui`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = ft.color;
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 6;
    ctx.fillText(ft.text, ft.x, ft.y);
    ctx.restore();
  }
}

function drawRobotDeath(px, py, progress) {
  // progress: 0 → 1 (full animation)
  ctx.save();
  const shake = progress < 0.4 ? Math.sin(progress * Math.PI * 20) * (12 * (1 - progress / 0.4)) : 0;
  const scale = progress < 0.5 ? 1 + progress * 0.3 : Math.max(0, 1.3 - (progress - 0.5) * 2.6);
  ctx.globalAlpha = progress < 0.7 ? 1 : Math.max(0, 1 - (progress - 0.7) / 0.3);
  ctx.translate(px + shake, py);
  ctx.scale(scale, scale);
  ctx.translate(-px, -py);
  // Red tint overlay
  ctx.globalCompositeOperation = 'source-over';
  drawRobot(px, py);
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = `rgba(255, 80, 80, ${Math.min(0.8, progress * 2)})`;
  ctx.beginPath();
  ctx.arc(px, py - 5, 38, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// ====================== TEMAS POR NÍVEL ======================
const levelThemes = [
  { canvasBg: '#e0f2ff', gridColor: '#7dd3fc', editorBg: '#0a1428', headerBg: '#1e2a4a', primaryBtn: '#00e6b8', successColor: '#22ffaa' },
  { canvasBg: '#f3e8ff', gridColor: '#c084fc', editorBg: '#1a0f2e', headerBg: '#2e1b4a', primaryBtn: '#a855f7', successColor: '#e879f9' },
  { canvasBg: '#ecfdf5', gridColor: '#4ade80', editorBg: '#052e16', headerBg: '#14532d', primaryBtn: '#22c55e', successColor: '#86efac' },
  { canvasBg: '#fffbeb', gridColor: '#fcd34d', editorBg: '#3f2a0f', headerBg: '#78350f', primaryBtn: '#f97316', successColor: '#fbbf24' }
];

// ==================== PROGRESSO ==================== //
function loadProgress() {
  const saved = localStorage.getItem('robotCodificadorProgress');
  if (saved) {
    const data = JSON.parse(saved);
    completedLevels = Array.isArray(data) ? data : (data.completed || []);
    levelStars = data.stars || {};
  } else {
    completedLevels = [];
    levelStars = {};
  }
}

function saveProgress(levelNumber, earnedStars) {
  if (!completedLevels.includes(levelNumber)) {
    completedLevels.push(levelNumber);
    completedLevels.sort((a, b) => a - b);
  }
  if (!levelStars[levelNumber] || earnedStars > levelStars[levelNumber]) {
    levelStars[levelNumber] = earnedStars;
  }
  localStorage.setItem('robotCodificadorProgress', JSON.stringify({
    completed: completedLevels,
    stars: levelStars
  }));
  updateProgressBar();
}

function resetProgress() {
  if (confirm('🗑️ Deseja apagar TODO o progresso e começar do zero?')) {
    localStorage.removeItem('robotCodificadorProgress');
    completedLevels = [];
    levelStars = {};
    updateProgressBar();
    updateMenuStars();
    loadLevel(0, true);
    alert('✅ Progresso resetado!');
  }
}

function updateProgressBar() {
  const bar = document.getElementById('progress-bar');
  bar.innerHTML = '';
  for (let i = 1; i <= 4; i++) {
    const dot = document.createElement('div');
    dot.className = `level-dot ${completedLevels.includes(i) ? 'completed' : ''}`;
    const starCount = levelStars[i] || 0;
    const starsHtml = starCount > 0 ? '⭐'.repeat(starCount) : (completedLevels.includes(i) ? '' : '');
    dot.innerHTML = `<span class="dot-num">${i}</span><span class="dot-stars">${starsHtml}</span>`;
    bar.appendChild(dot);
  }
}

// ====================== TELA DE MENU ======================
function showMainMenu() {
  document.getElementById('main-menu-screen').style.display = 'flex';
  updateMenuStars();
}

function updateMenuStars() {
  const total = Object.values(levelStars).reduce((a, b) => a + b, 0);
  document.getElementById('menu-total-stars').textContent = total;
}

function startGameFromMenu() {
  document.getElementById('main-menu-screen').style.display = 'none';
  const maxCompleted = completedLevels.length ? Math.max(...completedLevels) : 0;
  const startIndex = Math.min(maxCompleted, levels.length - 1);
  loadLevel(startIndex, true);
}

function showLevelSelector() {
  document.getElementById('main-menu-screen').style.display = 'none';
  const modal = document.getElementById('level-selector-modal');
  modal.style.display = 'flex';

  const grid = document.getElementById('levels-grid');
  grid.innerHTML = '';

  for (let i = 1; i <= 4; i++) {
    const level = levels.find(l => l.number === i);
    if (!level) continue;
    const isUnlocked = (i === 1) || completedLevels.includes(i - 1);
    const stars = levelStars[i] || 0;

    const card = document.createElement('div');
    card.className = `level-card ${isUnlocked ? '' : 'locked'} ${stars > 0 ? 'completed' : ''}`;
    card.innerHTML = `
      <div class="level-num">${i}</div>
      <div class="level-title">${level.title.split('—')[1] || level.title}</div>
      <div class="stars">${'⭐'.repeat(stars) || '☆☆☆'}</div>
    `;

    if (isUnlocked) {
      card.onclick = () => {
        document.getElementById('level-selector-modal').style.display = 'none';
        document.getElementById('main-menu-screen').style.display = 'none';
        loadLevel(i - 1, true);
      };
    }
    grid.appendChild(card);
  }
}

function closeLevelSelector() {
  document.getElementById('level-selector-modal').style.display = 'none';
  showMainMenu();
}

function resetProgressFromMenu() {
  if (confirm('🗑️ Deseja apagar TODO o progresso e começar do zero?')) {
    localStorage.removeItem('robotCodificadorProgress');
    completedLevels = [];
    levelStars = {};
    updateProgressBar();
    updateMenuStars();
    alert('✅ Progresso resetado!');
    closeLevelSelector();
  }
}

// ==================== MODAL DE COMANDOS ====================
function mostrarDocs() {
  const menuScreen = document.getElementById('main-menu-screen');
  fromMenu = (menuScreen.style.display === 'flex');
  if (fromMenu) menuScreen.style.display = 'none';
  document.getElementById('modal-docs').style.display = 'flex';
}

function fecharModal() {
  document.getElementById('modal-docs').style.display = 'none';
  if (fromMenu) {
    document.getElementById('main-menu-screen').style.display = 'flex';
    fromMenu = false;
  }
}

// ==================== NÍVEIS ==================== //
const levels = [
  {
    number: 1,
    title: "Nível 1 — Colete os 4 chipes!",
    startX: 4,
    startY: 5,
    chips: [{ x: 2, y: 2 }, { x: 5, y: 1 }, { x: 7, y: 6 }, { x: 3, y: 7 }],
    corruptedChips: [],
    traps: [],
    timeBonusChips: [{ x: 0, y: 3 }],
    solution: `moverBaixo()\nmoverBaixo()\nmoverEsquerda()\nmoverEsquerda()\nmoverCima()\nmoverCima()\nmoverCima()\nmoverCima()\nmoverCima()\nmoverCima()\nmoverDireita()\nmoverDireita()\nmoverDireita()\nmoverDireita()\nmoverDireita()\nmoverBaixo()\nmoverBaixo()\nmoverBaixo()\nmoverBaixo()\nmoverBaixo()`
  },
  {
    number: 2,
    title: "Nível 2 — Chipes em linha reta! ⚠️ Cuidado com os chips corrompidos",
    startX: 0,
    startY: 7,
    chips: [{ x: 7, y: 7 }, { x: 7, y: 4 }, { x: 7, y: 1 }, { x: 3, y: 3 }],
    corruptedChips: [{ x: 2, y: 6 }, { x: 4, y: 5 }, { x: 6, y: 3 }, { x: 1, y: 1 }, { x: 5, y: 0 }],
    traps: [],
    timeBonusChips: [{ x: 5, y: 7 }],
    solution: `moverDireita()\nmoverDireita()\nmoverDireita()\nmoverDireita()\nmoverDireita()\nmoverDireita()\nmoverDireita()\nmoverCima()\nmoverCima()\nmoverCima()\nmoverCima()\nmoverCima()\nmoverCima()\nmoverEsquerda()\nmoverEsquerda()\nmoverEsquerda()\nmoverEsquerda()\nmoverBaixo()\nmoverBaixo()`
  },
  {
    number: 3,
    title: "Nível 3 — Labirinto simples 🕳️ Evite os buracos e pisos quebrados!",
    startX: 7,
    startY: 0,
    chips: [{ x: 0, y: 0 }, { x: 2, y: 4 }, { x: 5, y: 2 }, { x: 4, y: 7 }, { x: 1, y: 6 }],
    corruptedChips: [],
    traps: [{ x: 3, y: 1 }, { x: 6, y: 4 }, { x: 4, y: 3 }, { x: 2, y: 3 }, { x: 0, y: 5 }, { x: 7, y: 3 }, { x: 5, y: 6 }, { x: 3, y: 6 }, { x: 1, y: 2 }],
    timeBonusChips: [{ x: 6, y: 1 }],
    solution: `moverEsquerda()\nmoverEsquerda()\nmoverEsquerda()\nmoverEsquerda()\nmoverEsquerda()\nmoverEsquerda()\nmoverEsquerda()\nmoverBaixo()\nmoverDireita()\nmoverDireita()\nmoverBaixo()\nmoverDireita()\nmoverDireita()\nmoverDireita()\nmoverBaixo()\nmoverBaixo()\nmoverEsquerda()\nmoverEsquerda()\nmoverEsquerda()\nmoverEsquerda()\nmoverBaixo()\nmoverBaixo()\nmoverBaixo()\nmoverDireita()\nmoverDireita()\nmoverDireita()`
  },
  {
    number: 4,
    title: "Nível 4 — Desafio Final! ⚠️ Boa Sorte!!",
    startX: 3,
    startY: 3,
    chips: [{ x: 0, y: 0 }, { x: 7, y: 0 }, { x: 0, y: 7 }, { x: 7, y: 7 }, { x: 2, y: 5 }, { x: 5, y: 1 }],
    corruptedChips: [{ x: 1, y: 4 }, { x: 6, y: 2 }, { x: 4, y: 5 }, { x: 2, y: 6 }],
    traps: [{ x: 3, y: 1 }, { x: 5, y: 3 }, { x: 0, y: 2 }, { x: 7, y: 4 }, { x: 1, y: 6 }, { x: 6, y: 0 }, { x: 4, y: 7 }, { x: 2, y: 0 }],
    timeBonusChips: [{ x: 7, y: 2 }],
    solution: `Boa sorte meu consagrado... 🤖\n\nSegure na mão de Deus e vá na Fé!!`
  }
];

// ==================== FUNÇÕES DE DESENHO ==================== //
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawRobot(px, py) { 
  ctx.save();
  ctx.translate(px, py);
  const scale = 0.51;
  ctx.scale(scale, scale);
  const ox = 0;
  const oy = -9;
  ctx.shadowColor = 'rgba(30, 58, 95, 0.35)';
  ctx.shadowBlur = 15;
  ctx.shadowOffsetY = 8;
  ctx.fillStyle = '#e0f2ff';
  ctx.strokeStyle = '#1e3a5f';
  ctx.lineWidth = 8;
  roundRect(ctx, ox - 29, oy - 10, 58, 63, 17);
  ctx.fill(); ctx.stroke();
  roundRect(ctx, ox - 32, oy - 56, 64, 49, 15);
  ctx.fill(); ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#0a2540';
  roundRect(ctx, ox - 23.5, oy - 49, 47, 35, 9);
  ctx.fill();
  ctx.fillStyle = '#00f5ff';
  ctx.fillRect(ox - 14.5, oy - 44, 9, 13.5);
  ctx.fillRect(ox + 5.5, oy - 44, 9, 13.5);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(ox - 12, oy - 46, 3, 4);
  ctx.fillRect(ox + 8, oy - 46, 3, 4);
  ctx.strokeStyle = '#00f5ff';
  ctx.lineWidth = 3.3;
  ctx.beginPath();
  ctx.arc(ox, oy - 28, 9, 0.25 * Math.PI, 0.75 * Math.PI);
  ctx.stroke();
  ctx.strokeStyle = '#1e3a5f';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(ox - 17, oy - 61);
  ctx.lineTo(ox - 23, oy - 81);
  ctx.moveTo(ox + 17, oy - 61);
  ctx.lineTo(ox + 23, oy - 81);
  ctx.stroke();
  ctx.fillStyle = '#1e3a5f';
  ctx.beginPath(); ctx.arc(ox - 23, oy - 81, 4.8, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(ox + 23, oy - 81, 4.8, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#1e3a5f';
  ctx.lineWidth = 9.8;
  ctx.beginPath();
  ctx.moveTo(ox - 28, oy + 14);
  ctx.quadraticCurveTo(ox - 46, oy + 21, ox - 50, oy + 39);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(ox + 28, oy + 14);
  ctx.quadraticCurveTo(ox + 46, oy + 21, ox + 50, oy + 39);
  ctx.stroke();
  ctx.lineWidth = 8.8;
  ctx.beginPath();
  ctx.moveTo(ox - 13.5, oy + 49);
  ctx.lineTo(ox - 18, oy + 73);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(ox + 13.5, oy + 49);
  ctx.lineTo(ox + 16, oy + 73);
  ctx.stroke();
  ctx.restore();
}

function drawChip(x, y, index, time) { 
  if (chips[index] && chips[index].collected) return;
  const px = x * CELL + CELL / 2;
  const py = y * CELL + CELL / 2 + Math.sin(time * 3 + index) * 7;
  const rot = Math.sin(time * 2.5 + index * 1.3) * 6;
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(rot * Math.PI / 180);
  const chipScale = 0.78;
  ctx.scale(chipScale, chipScale);
  ctx.shadowColor = '#059669';
  ctx.shadowBlur = 14;
  ctx.shadowOffsetY = 4;
  ctx.fillStyle = '#10b981';
  roundRect(ctx, -21, -25, 42, 50, 10);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 4.5;
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 29px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('💾', 0, 2);
  ctx.restore();
}

function drawCorruptedChip(x, y, index, time) { 
  const px = x * CELL + CELL / 2;
  const py = y * CELL + CELL / 2 + Math.sin(time * 3 + index) * 7;
  const rot = Math.sin(time * 2.5 + index * 1.3) * 6;
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(rot * Math.PI / 180);
  const chipScale = 0.78;
  ctx.scale(chipScale, chipScale);
  ctx.shadowColor = '#b91c1c';
  ctx.shadowBlur = 14;
  ctx.shadowOffsetY = 4;
  ctx.fillStyle = '#ef4444';
  roundRect(ctx, -21, -25, 42, 50, 10);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 4.5;
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 29px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('💾', 0, 2);
  ctx.restore();
}

function drawTrap(x, y, time) { 
  const px = x * CELL + CELL / 2;
  const py = y * CELL + CELL / 2;
  ctx.save();
  ctx.translate(px, py);
  const shake = Math.sin(time * 12) * 1.5;
  ctx.shadowColor = '#334155';
  ctx.shadowBlur = 16;
  ctx.shadowOffsetY = 5;
  ctx.fillStyle = '#475569';
  roundRect(ctx, -29, -29, 58, 58, 9);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = '#1e2937';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-20 + shake, -20);
  ctx.quadraticCurveTo(-5, -8, 18, -15);
  ctx.moveTo(20 + shake, 10);
  ctx.quadraticCurveTo(5, 20, -18, 22);
  ctx.stroke();
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.ellipse(0, 0, 19, 14, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#e2e8f0';
  ctx.font = 'bold 32px system-ui';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🕳️', 0, 3);
  ctx.restore();
}

function drawTimeBonus(x, y, index, time) { 
  if (timeBonusChips[index] && timeBonusChips[index].collected) return;
  const px = x * CELL + CELL / 2;
  const py = y * CELL + CELL / 2 + Math.sin(time * 3 + index) * 7;
  const rot = Math.sin(time * 2.5 + index * 1.3) * 6;
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(rot * Math.PI / 180);
  const chipScale = 0.78;
  ctx.scale(chipScale, chipScale);
  ctx.shadowColor = '#f59e0b';
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 5;
  ctx.fillStyle = '#f59e0b';
  roundRect(ctx, -21, -25, 42, 50, 10);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 4.5;
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 29px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('⏱️', 0, 2);
  ctx.restore();
}

function draw() {
  const time = Date.now() / 1000;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  ctx.fillStyle = window.currentCanvasBg || '#e0f2ff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.globalAlpha = 0.07;
  ctx.font = '290px system-ui';
  ctx.fillStyle = '#64748b';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('< />', canvas.width/2, canvas.height/2 + 15);
  ctx.restore();

  ctx.strokeStyle = window.currentGridColor || '#d1d5db';
  ctx.lineWidth = 2.8;
  for (let i = 0; i <= COLS; i++) {
    ctx.beginPath(); ctx.moveTo(i * CELL, 0); ctx.lineTo(i * CELL, canvas.height); ctx.stroke();
  }
  for (let i = 0; i <= ROWS; i++) {
    ctx.beginPath(); ctx.moveTo(0, i * CELL); ctx.lineTo(canvas.width, i * CELL); ctx.stroke();
  }

  traps.forEach((trap, i) => drawTrap(trap.x, trap.y, time + i));
  corruptedChips.forEach((_, i) => drawCorruptedChip(corruptedChips[i].x, corruptedChips[i].y, i, time));
  chips.forEach((_, i) => drawChip(chips[i].x, chips[i].y, i, time));
  timeBonusChips.forEach((_, i) => drawTimeBonus(timeBonusChips[i].x, timeBonusChips[i].y, i, time));

  // Death animation or normal robot
  if (robotDeathAnim) {
    const elapsed = (Date.now() - robotDeathAnim.startTime) / 1000;
    const progress = Math.min(1, elapsed / 0.85);
    drawRobotDeath(robotDeathAnim.px, robotDeathAnim.py, progress);
    if (progress >= 1) robotDeathAnim = null;
  } else {
    drawRobot(robotPixel.x, robotPixel.y);
  }

  updateAndDrawParticles();
}

// ====================== APLICAR TEMA DO NÍVEL ======================
function applyLevelTheme() {
  const theme = levelThemes[currentLevelIndex];
  if (!theme) return;

  window.currentCanvasBg = theme.canvasBg;
  window.currentGridColor = theme.gridColor;

  const editor = document.querySelector('.editor');
  const codeArea = document.getElementById('code');
  if (editor) editor.style.background = theme.editorBg;
  if (codeArea) {
    codeArea.style.background = theme.editorBg;
    codeArea.style.color = '#e0f2fe';
  }

  const header = document.querySelector('.header');
  if (header) header.style.background = theme.headerBg;

  const btnExec = document.getElementById('btn-exec');
  const btnProximo = document.getElementById('btn-proximo');
  if (btnExec) btnExec.style.background = theme.primaryBtn;
  if (btnProximo) btnProximo.style.background = theme.primaryBtn;

  let style = document.getElementById('dynamic-theme-style');
  if (!style) {
    style = document.createElement('style');
    style.id = 'dynamic-theme-style';
    document.head.appendChild(style);
  }
  style.innerHTML = `
    .status.success { color: ${theme.successColor} !important; }
    .btn-start { background: linear-gradient(135deg, ${theme.primaryBtn}, #10b981) !important; }
  `;
}

// ==================== MOVIMENTO ==================== //
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function moveTo(newGridX, newGridY) {
  if (timeExpired || isPaused || shouldStopExecution) return;

  const startX = robotPixel.x;
  const startY = robotPixel.y;
  const targetX = newGridX * CELL + CELL/2;
  const targetY = newGridY * CELL + CELL/2;
  const steps = 24;

  for (let i = 1; i <= steps; i++) {
    if (shouldStopExecution) return;
    let p = i / steps;
    p = 1 - Math.pow(1 - p, 3);
    robotPixel.x = startX + (targetX - startX) * p;
    robotPixel.y = startY + (targetY - startY) * p;
    draw();
    await sleep(13);
  }
  if (shouldStopExecution) return;

  robot.gridX = newGridX;
  robot.gridY = newGridY;
  robotPixel.x = targetX;
  robotPixel.y = targetY;
  draw();

  if (traps.some(t => t.x === robot.gridX && t.y === robot.gridY)) {
    shouldStopExecution = true;
    loseLife("💥 Você caiu no buraco negro!");
    return;
  }

  for (let i = 0; i < corruptedChips.length; i++) {
    if (corruptedChips[i].x === robot.gridX && corruptedChips[i].y === robot.gridY) {
      shouldStopExecution = true;
      loseLife("⚠️ Chip corrompido coletado!");
      return;
    }
  }

  chips.forEach(chip => {
    if (!chip.collected && chip.x === robot.gridX && chip.y === robot.gridY) {
      chip.collected = true;
      spawnChipCollectParticles(robotPixel.x, robotPixel.y);
    }
  });

  timeBonusChips.forEach(bonus => {
    if (!bonus.collected && bonus.x === robot.gridX && bonus.y === robot.gridY) {
      bonus.collected = true;
      if (timeLeft > 0 && !timeExpired) {
        timeLeft += 15;
        document.getElementById('time-left').textContent = timeLeft;
        document.getElementById('timer').classList.remove('low');
        const statusEl = document.getElementById('status');
        statusEl.classList.remove('success', 'error');
        statusEl.classList.add('success');
        statusEl.innerHTML = `⏱️ +15s de bônus de tempo!`;
      }
    }
  });

  const totalCollected = chips.filter(c => c.collected).length;
  if (totalCollected > 0) {
    const statusEl = document.getElementById('status');
    statusEl.classList.remove('success', 'error');
    statusEl.classList.add('success');
    statusEl.innerHTML = `✅ Chipe coletado! (${totalCollected}/${chips.length})`;
  }

  updateChipCounter();
  checkVictory();
}

// ==================== EXECUTAR CÓDIGO ==================== //
async function executarCodigo() {
  if (isRunning || timeExpired || isPaused) return;
  isRunning = true;
  shouldStopExecution = false;

  const status = document.getElementById('status');
  const codeArea = document.getElementById('code');

  status.classList.remove('success', 'error');
  status.innerHTML = '🚀 Executando código...';
  document.getElementById('btn-proximo').style.display = 'none';

  const lines = codeArea.innerText.trim().split('\n');

  for (let line of lines) {
    const cmd = line.trim();
    if (cmd === '') continue;

    const match = cmd.match(/^(\w+)\s*\(?\s*(\d*)\s*\)?$/);
    if (!match) {
      status.classList.add('error');
      status.innerHTML = `❌ Comando inválido: <b>${cmd}</b>`;
      isRunning = false;
      return;
    }

    const commandName = match[1];
    let quantidade = 1;
    if (match[2] !== '') {
      quantidade = parseInt(match[2]);
      if (isNaN(quantidade) || quantidade < 1) {
        status.classList.add('error');
        status.innerHTML = `❌ Quantidade inválida em: <b>${cmd}</b>`;
        isRunning = false;
        return;
      }
    }

    const MAX_MOVES = 20;
    if (quantidade > MAX_MOVES) {
      status.innerHTML = `⚠️ Limite de ${MAX_MOVES} movimentos! (usando ${MAX_MOVES})`;
      quantidade = MAX_MOVES;
    }

    if (commandFunctions[commandName]) {
      status.classList.remove('success', 'error');
      status.innerHTML = `🔄 Executando: <b>${cmd}</b>`;
      await commandFunctions[commandName](quantidade);
    } else {
      status.classList.add('error');
      status.innerHTML = `❌ Comando desconhecido: <b>${commandName}</b>`;
      isRunning = false;
      return;
    }

    if (shouldStopExecution) {
      isRunning = false;
      shouldStopExecution = false;
      return;
    }
  }

  isRunning = false;

  if (!chips.every(c => c.collected)) {
    status.classList.remove('success', 'error');
    status.innerHTML = '✅ Código executado com sucesso!';
    codeArea.innerHTML = '';
  }
}

// ==================== COMANDOS ==================== //
async function moverDireita(quantidade = 1) {
  for (let i = 0; i < quantidade; i++) {
    if (shouldStopExecution) return;
    if (robot.gridX >= COLS - 1) break;
    await moveTo(robot.gridX + 1, robot.gridY);
  }
}
async function moverEsquerda(quantidade = 1) {
  for (let i = 0; i < quantidade; i++) {
    if (shouldStopExecution) return;
    if (robot.gridX <= 0) break;
    await moveTo(robot.gridX - 1, robot.gridY);
  }
}
async function moverCima(quantidade = 1) {
  for (let i = 0; i < quantidade; i++) {
    if (shouldStopExecution) return;
    if (robot.gridY <= 0) break;
    await moveTo(robot.gridX, robot.gridY - 1);
  }
}
async function moverBaixo(quantidade = 1) {
  for (let i = 0; i < quantidade; i++) {
    if (shouldStopExecution) return;
    if (robot.gridY >= ROWS - 1) break;
    await moveTo(robot.gridX, robot.gridY + 1);
  }
}

const commandFunctions = {
  'moverDireita': moverDireita,
  'moverEsquerda': moverEsquerda,
  'moverCima': moverCima,
  'moverBaixo': moverBaixo
};

// ==================== SOLUÇÃO AUTOMÁTICA ======================
function computeAutomaticSolution() {
  if (chips.every(c => c.collected)) {
    return "✅ Todos os chips já foram coletados!";
  }

  const startX = robot.gridX;
  const startY = robot.gridY;

  const targets = chips.filter(c => !c.collected).map(c => ({ x: c.x, y: c.y }));
  const numTargets = targets.length;
  if (numTargets === 0) return "✅ Todos os chips já foram coletados!";

  const targetMap = {};
  targets.forEach((t, idx) => {
    targetMap[`${t.x},${t.y}`] = idx;
  });

  const fullMask = (1 << numTargets) - 1;

  const forbidden = new Set();
  traps.forEach(t => forbidden.add(`${t.x},${t.y}`));
  corruptedChips.forEach(c => forbidden.add(`${c.x},${c.y}`));

  const dirs = [
    { dx: 1,  dy: 0, cmd: 'moverDireita' },
    { dx: -1, dy: 0, cmd: 'moverEsquerda' },
    { dx: 0,  dy: -1, cmd: 'moverCima' },
    { dx: 0,  dy: 1, cmd: 'moverBaixo' }
  ];

  const queue = [];
  const visited = new Set();
  const cameFrom = {};
  const cameCommand = {};

  let startMask = 0;
  const startPosKey = `${startX},${startY}`;
  if (targetMap[startPosKey] !== undefined) {
    startMask |= (1 << targetMap[startPosKey]);
  }

  const startKey = `${startX},${startY},${startMask}`;
  queue.push({ x: startX, y: startY, mask: startMask });
  visited.add(startKey);

  let goalKey = null;

  while (queue.length > 0) {
    const { x, y, mask } = queue.shift();
    const currentKey = `${x},${y},${mask}`;

    if (mask === fullMask) {
      goalKey = currentKey;
      break;
    }

    for (let d of dirs) {
      const nx = x + d.dx;
      const ny = y + d.dy;

      if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) continue;
      if (forbidden.has(`${nx},${ny}`)) continue;

      let newMask = mask;
      const nposKey = `${nx},${ny}`;
      if (targetMap[nposKey] !== undefined) {
        newMask |= (1 << targetMap[nposKey]);
      }

      const newKey = `${nx},${ny},${newMask}`;
      if (!visited.has(newKey)) {
        visited.add(newKey);
        cameFrom[newKey] = currentKey;
        cameCommand[newKey] = d.cmd;
        queue.push({ x: nx, y: ny, mask: newMask });
      }
    }
  }

  if (!goalKey) return null;

  const pathCommands = [];
  let current = goalKey;
  const startKeyFull = startKey;

  while (current !== startKeyFull) {
    pathCommands.push(cameCommand[current]);
    current = cameFrom[current];
  }
  pathCommands.reverse();

  const grouped = [];
  let i = 0;
  while (i < pathCommands.length) {
    const cmd = pathCommands[i];
    let count = 1;
    i++;
    while (i < pathCommands.length && pathCommands[i] === cmd) {
      count++;
      i++;
    }
    grouped.push(count === 1 ? `${cmd}()` : `${cmd}(${count})`);
  }

  return grouped.join('\n');
}

function mostrarSolucao() {
  const codeArea = document.getElementById('code');
  const currentCode = codeArea.innerText.trim();
  const statusEl = document.getElementById('status');

  if (currentCode) {
    codeArea.innerText = '';
    statusEl.classList.remove('success', 'error');
    statusEl.innerHTML = '✅ Solução removida!';
    return;
  }

  statusEl.classList.remove('success', 'error');
  statusEl.innerHTML = '🤖 Calculando rota automática...';

  setTimeout(() => {
    const solutionStr = computeAutomaticSolution();

    if (solutionStr) {
      codeArea.innerText = solutionStr;
      usedSolution = true;
      statusEl.classList.add('success');
      statusEl.innerHTML = `📋 Solução automática carregada!<br><small>Do ponto atual até os chips restantes</small>`;
    } else {
      statusEl.classList.add('error');
      statusEl.innerHTML = '❌ Não foi possível encontrar uma solução automática deste ponto.<br>Tente mover o robô manualmente antes.';
    }
  }, 30);
}

// ==================== CHECK VICTORY ==================== //
function checkVictory() {
  if (chips.every(c => c.collected)) {
    clearInterval(timerInterval);

    const levelNum = levels[currentLevelIndex].number;
    const maxTime = levelTimes[currentLevelIndex];
    const realTimeSpent = Math.floor((Date.now() - levelStartTime) / 1000);
    const totalTimeSpent = realTimeSpent + penaltyTime;

    let earnedStars = 3;

    if (usedSolution) earnedStars -= 1;
    if (livesLostThisLevel > 0) earnedStars -= 1;
    const timeThreshold = Math.floor(maxTime * 0.5);
    if (totalTimeSpent >= timeThreshold) earnedStars -= 1;

    earnedStars = Math.max(1, earnedStars);

    saveProgress(levelNum, earnedStars);
    shouldStopExecution = true;

    setTimeout(() => mostrarOverlayVitoria(levelNum, earnedStars, totalTimeSpent), 600);

    return true;
  }
  return false;
}

function mostrarOverlayVitoria(levelNum, earnedStars, totalTimeSpent) {
  const old = document.getElementById('victory-overlay');
  if (old) old.remove();

  const isLast = currentLevelIndex === levels.length - 1;
  const maxTime = levelTimes[currentLevelIndex];
  const timeThreshold = Math.floor(maxTime * 0.5);
  const timeOk = totalTimeSpent < timeThreshold;

  const detailLines = [];
  detailLines.push(`${timeOk ? '✅' : '❌'} Tempo rápido (< ${timeThreshold}s): ${timeOk ? '+1 ⭐' : '0'}`);
  detailLines.push(`${livesLostThisLevel === 0 ? '✅' : '❌'} Sem perder vidas: ${livesLostThisLevel === 0 ? '+1 ⭐' : '0'}`);
  detailLines.push(`${!usedSolution ? '✅' : '❌'} Sem usar solução: ${!usedSolution ? '+1 ⭐' : '0'}`);

  const overlay = document.createElement('div');
  overlay.id = 'victory-overlay';
  overlay.innerHTML = `
    <div class="victory-box">
      <div class="victory-robot">🤖</div>
      <div class="victory-title">Nível ${levelNum} Concluído!</div>
      <div class="victory-stars">${'⭐'.repeat(earnedStars)}${'☆'.repeat(3 - earnedStars)}</div>
      <div class="victory-time">⏱️ Tempo: ${totalTimeSpent}s${penaltyTime > 0 ? ` <span class="penalty">(+${penaltyTime}s penalidade)</span>` : ''}</div>
      <div class="victory-details">
        ${detailLines.map(l => `<div class="victory-detail-line">${l}</div>`).join('')}
      </div>
      ${isLast
        ? `<button class="victory-btn victory-btn-final" onclick="fecharOverlayVitoriaFinal()">🏆 Ver Resultado Final</button>`
        : `<button class="victory-btn victory-btn-next" onclick="fecharOverlayEAvancar()">Próxima Fase ▶</button>`
      }
      <button class="victory-btn victory-btn-menu" onclick="fecharOverlayEMenu()">🏠 Menu Principal</button>
    </div>
  `;

  document.getElementById('btn-exec').disabled = true;
  document.getElementById('btn-proximo').style.display = 'none';
  const codeArea = document.getElementById('code');
  codeArea.contentEditable = 'false';
  codeArea.style.opacity = '0.4';
  codeArea.style.cursor = 'not-allowed';

  document.body.appendChild(overlay);
}

function fecharOverlayEAvancar() {
  const overlay = document.getElementById('victory-overlay');
  if (overlay) overlay.remove();
  const nextIndex = currentLevelIndex + 1;
  showLevelTransition(nextIndex);
}

function fecharOverlayVitoriaFinal() {
  const overlay = document.getElementById('victory-overlay');
  if (overlay) overlay.remove();
  mostrarTelaFinal();
}

function fecharOverlayEMenu() {
  const overlay = document.getElementById('victory-overlay');
  if (overlay) overlay.remove();
  voltarAoMenuDoJogo();
}

function mostrarTelaFinal() {
  let totalStars = Object.values(levelStars).reduce((a, b) => a + b, 0);
  const maxPossible = 12;

  let solutionPenaltyText = "";
  if (usedSolution) {
    totalStars = Math.max(0, totalStars - 2);
    solutionPenaltyText = `<p style="color:#f87171; margin:15px 0; font-size:17px;">⚠️ -2 estrelas de penalidade por usar a solução</p>`;
  }

  let rating = "", emoji = "", color = "";
  if (totalStars === 12) { 
    rating = "🏆 Desempenho PERFEITO! é isso ai meu nobre!"; 
    emoji = "🌟"; 
    color = "#facc15"; 
  }
  else if (totalStars >= 10) { 
    rating = "🎖️ Excelente desempenho, poderia melhorar!"; 
    emoji = "🔥"; 
    color = "#22c55e"; 
  }
  else if (totalStars >= 7) { 
    rating = "👍 Melho do que nada, parabéns"; 
    emoji = "✅"; 
    color = "#eab308"; 
  }
  else if (totalStars >= 4) { 
    rating = "🙂 Tinha que ser um beta, mas completou o jogo!"; 
    emoji = "👏"; 
    color = "#3b82f6"; 
  }
  else { 
    rating = "Continue treinando! alguma hora você melhorar."; 
    emoji = "💪"; 
    color = "#ef4444"; 
  }

  let finalHTML = `
    <div style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.88); display:flex; align-items:center; justify-content:center; z-index:9999; font-family: system-ui, sans-serif;">
      <div style="background:#1e2937; color:white; padding:40px 35px; border-radius:20px; max-width:480px; text-align:center; box-shadow:0 20px 50px rgba(0,0,0,0.7);">
        <h1 style="font-size:42px; margin:0 0 8px 0;">🏆 PARABÉNS!</h1>
        <p style="font-size:20px; margin:0 0 25px 0; opacity:0.9;">Você completou todos os 4 níveis</p>
        
        <div style="font-size:68px; font-weight:bold; margin:15px 0 8px 0; color:${color}; line-height:1;">
          ${totalStars}<span style="font-size:32px; opacity:0.6;">/${maxPossible}</span>
        </div>
        <p style="margin:0 0 20px 0; font-size:18px; color:#94a3b8;">estrelas conquistadas</p>
        
        ${solutionPenaltyText}
        
        <p style="font-size:23px; margin:20px 0 30px 0;">${emoji} ${rating}</p>
        
        <div style="background:#0f172a; padding:18px; border-radius:12px; margin:25px 0; text-align:left; font-size:16px;">
          <strong style="color:#cbd5e1;">Desempenho por fase:</strong><br><br>
          Nível 1 — ${'⭐'.repeat(levelStars[1] || 0)}<br>
          Nível 2 — ${'⭐'.repeat(levelStars[2] || 0)}<br>
          Nível 3 — ${'⭐'.repeat(levelStars[3] || 0)}<br>
          Nível 4 — ${'⭐'.repeat(levelStars[4] || 0)}
        </div>

        <div style="display:flex; gap:12px; margin-top:25px; flex-wrap:wrap;">
          <button onclick="reiniciarTudo()" style="flex:1; min-width:140px; background:#22c55e; color:#0f172a; border:none; padding:16px; font-size:18px; font-weight:bold; border-radius:12px; cursor:pointer;">
            ▶️ Jogar Novamente
          </button>
          <button onclick="voltarAoMenu()" style="flex:1; min-width:140px; background:#64748b; color:white; border:none; padding:16px; font-size:18px; font-weight:bold; border-radius:12px; cursor:pointer;">
            🏠 Voltar ao Menu
          </button>
        </div>

        <button onclick="mostrarCreditos()" style="width:100%; margin-top:14px; background:linear-gradient(135deg,#7c83ff,#a855f7); color:white; border:none; padding:14px; font-size:16px; font-weight:bold; border-radius:12px; cursor:pointer; letter-spacing:1px;">
          🎓 Créditos do Projeto
        </button>
      </div>
    </div>
  `;

  const finalScreen = document.createElement('div');
  finalScreen.id = "final-screen";
  finalScreen.innerHTML = finalHTML;
  document.body.appendChild(finalScreen);
}

function mostrarCreditos() {
        const existing = document.getElementById('modal-creditos');
        if (existing) existing.remove();

        const modal = document.createElement('div');
        modal.id = 'modal-creditos';
        modal.style.cssText = `position: fixed; inset: 0; background: rgba(10, 10, 30, 0.95); z-index: 20000; display: flex; align-items: center; justify-content: center; font-family: 'Roboto Mono', monospace; animation: fadeIn 0.35s ease forwards; padding: 20px;`;

        modal.innerHTML = `
            <div style="background: linear-gradient(160deg, #0f172a, #1e293b); border: 2px solid rgba(124,131,255,0.45); border-radius: 24px; padding: 40px 36px 32px; max-width: 500px; width: 100%; max-height: 90vh; overflow-y: auto; text-align: center; color: white; box-shadow: 0 0 0 1px rgba(124,131,255,0.12), 0 30px 80px rgba(0,0,0,0.7);">
                <div style="font-size:52px; margin-bottom:8px;">🎓</div>
                <h2 style="font-size: 22px; font-weight: 800; color: #a5b4fc; letter-spacing: 2px; margin-bottom: 20px; text-transform: uppercase;">Créditos do Projeto</h2>
                <p style="font-size: 13px; color: #94a3b8; line-height: 1.8; margin-bottom: 24px; text-align: left; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.07); border-radius: 12px; padding: 16px 18px;">
                    Projeto desenvolvido no âmbito do curso <strong style="color:#c4b5fd;">Técnico em Desenvolvimento de Sistemas</strong>, oferecido pelo <strong style="color:#c4b5fd;">Serviço Nacional de Aprendizagem Comercial (SENAC)</strong>, unidade de Serra Talhada.<br><br>
                    Este trabalho consiste na criação de um jogo de lógica, elaborado como parte das atividades acadêmicas da turma de Desenvolvimento de Sistemas.
                </p>
                <div style="background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.07); border-radius: 12px; padding: 18px 20px; margin-bottom: 18px; text-align: left;">
                    <p style="font-size:12px; color:#7c83ff; font-weight:700; letter-spacing:2px; text-transform:uppercase; margin-bottom:12px;">✏️ Autores</p>
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px 16px;">
                        <span style="font-size:14px; color:#e2e8f0;">👩‍💻 Kauany Juliana</span>
                        <span style="font-size:14px; color:#e2e8f0;">👩‍💻 Jennifer Mirelly</span>
                        <span style="font-size:14px; color:#e2e8f0;">👨‍💻 Luann Charles</span>
                        <span style="font-size:14px; color:#e2e8f0;">👩‍💻 Edilene Camila</span>
                        <span style="font-size:14px; color:#e2e8f0;">👨‍💻 Charles Samuel</span>
                        <span style="font-size:14px; color:#e2e8f0;">👨‍💻 Luiz Gabriel</span>
                        <span style="font-size:14px; color:#e2e8f0; grid-column:1/-1;">👩‍💻 Luana Christina</span>
                    </div>
                </div>
                <div style="background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.07); border-radius: 12px; padding: 14px 20px; margin-bottom: 18px; text-align: left; display: flex; align-items: center; gap: 12px;">
                    <span style="font-size:28px;">🧑‍🏫</span>
                    <div>
                        <p style="font-size:12px; color:#7c83ff; font-weight:700; letter-spacing:2px; text-transform:uppercase; margin-bottom:4px;">Orientador</p>
                        <p style="font-size:15px; color:#e2e8f0; font-weight:600;">Tobias Alves</p>
                    </div>
                </div>
                <div style="background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.07); border-radius: 12px; padding: 14px 20px; margin-bottom: 28px; display: flex; align-items: center; gap: 12px;">
                    <span style="font-size:28px;">📅</span>
                    <div style="text-align:left;">
                        <p style="font-size:12px; color:#7c83ff; font-weight:700; letter-spacing:2px; text-transform:uppercase; margin-bottom:4px;">Ano</p>
                        <p style="font-size:15px; color:#e2e8f0; font-weight:600;">2026</p>
                    </div>
                </div>
                <button onclick="fecharCreditos()" style="width: 100%; padding: 15px; background: linear-gradient(135deg, #7c83ff, #a855f7); color: white; border: none; border-radius: 12px; font-size: 15px; font-weight: 700; cursor: pointer; font-family: 'Roboto Mono', monospace; letter-spacing: 1px;">✕ Fechar</button>
            </div>
        `;

        document.body.appendChild(modal);
    }

    function fecharCreditos() {
        const modal = document.getElementById('modal-creditos');
        if (modal) modal.remove();
    }
function voltarAoMenu() {
  if (document.getElementById("final-screen")) document.getElementById("final-screen").remove();
  showMainMenu();
}

function reiniciarTudo() {
  if (document.getElementById("final-screen")) document.getElementById("final-screen").remove();
  resetProgress();
}

// ====================== TRANSIÇÃO ENTRE NÍVEIS ======================
function showLevelTransition(nextIndex) {
  const currentNum = levels[currentLevelIndex].number;
  const nextNum = levels[nextIndex].number;

  document.getElementById('current-level-num').textContent = currentNum;
  document.getElementById('next-level-num').textContent = nextNum;

  const starsEl = document.getElementById('transition-stars');
  const earnedStars = levelStars[currentNum] || 0;
  starsEl.innerHTML = '⭐'.repeat(earnedStars) + '☆'.repeat(3 - earnedStars);

  const transitionScreen = document.getElementById('level-transition-screen');
  transitionScreen.style.display = 'flex';

  const progressBar = document.querySelector('.loading-progress');
  progressBar.style.animation = 'none';
  void progressBar.offsetWidth;
  progressBar.style.animation = 'loadingAnim 1.8s ease-in-out forwards';

  setTimeout(() => {
    transitionScreen.style.display = 'none';
    loadLevel(nextIndex, true);
  }, 2250);
}

function proximoNivel() {
  const nextIndex = currentLevelIndex + 1;
  if (nextIndex >= levels.length) {
    alert('🎉 Você completou todos os níveis!');
    return;
  }
  showLevelTransition(nextIndex);
}

// ==================== LOAD LEVEL ==================== //
function loadLevel(index, showStartButton = true, keepTimerRunning = false) {
  // Para qualquer execução em andamento imediatamente
  shouldStopExecution = true;
  isRunning = false;

  currentLevelIndex = index;

  // === CORREÇÃO: define o tempo correto ANTES de mostrar a tela "Iniciar" ===
  if (showStartButton) {
    timeLeft = levelTimes[currentLevelIndex] || 60;
    document.getElementById('time-left').textContent = timeLeft;
    document.getElementById('timer').classList.remove('low');
  }

  const level = levels[index];

  if (showStartButton) {
    lives = 3;
    collectedChipsMemory = [];
    collectedTimeBonusMemory = [];
    updateLivesUI();
  }

  robot = { gridX: level.startX, gridY: level.startY };
  robotPixel = { x: level.startX * CELL + CELL/2, y: level.startY * CELL + CELL/2 };

  chips = level.chips.map(chip => ({ ...chip, collected: false }));

  if (collectedChipsMemory.length > 0) {
    collectedChipsMemory.forEach(i => {
      if (chips[i]) chips[i].collected = true;
    });
  }

  corruptedChips = level.corruptedChips ? level.corruptedChips.map(c => ({...c})) : [];
  traps = level.traps ? [...level.traps] : [];
  timeBonusChips = level.timeBonusChips ? level.timeBonusChips.map(c => ({...c, collected: false})) : [];

  if (collectedTimeBonusMemory.length > 0) {
    collectedTimeBonusMemory.forEach(i => {
      if (timeBonusChips[i]) timeBonusChips[i].collected = true;
    });
  }

  document.getElementById('level-title').innerText = level.title;
  document.getElementById('status').innerHTML = '';
  document.getElementById('btn-proximo').style.display = 'none';

  const codeArea = document.getElementById('code');
  codeArea.innerHTML = '';

  if (showStartButton) {
    codeArea.contentEditable = 'false';
    codeArea.style.opacity = '0.5';
    codeArea.style.cursor = 'not-allowed';
  } else {
    codeArea.contentEditable = 'true';
    codeArea.style.opacity = '1';
    codeArea.style.cursor = 'text';
  }

  const execBtn = document.getElementById('btn-exec');
  execBtn.disabled = showStartButton;

  document.getElementById('btn-start').style.display = showStartButton ? 'flex' : 'none';
  
  document.getElementById('btn-solucao').style.display = (showStartButton || index === 3) ? 'none' : 'flex';

  if (showStartButton) {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  } else {
    document.getElementById('status').innerHTML = '🎮 Fase reiniciada!';
    if (!keepTimerRunning) startTimer();
  }

  updateLivesUI();
  applyLevelTheme();
  draw();
  updateChipCounter();
  particles = [];
  floatingTexts = [];
  robotDeathAnim = null;
}

// ==================== CONTADOR DE CHIPS EM TEMPO REAL ==================== //
function updateChipCounter() {
  const collected = chips.filter(c => c.collected).length;
  const total = chips.length;
  document.getElementById('chips-collected').textContent = collected;
  document.getElementById('total-chips').textContent = total;
}

// ==================== PAUSE SYSTEM ==================== //
function showPause() {
  if (isRunning) return;
  if (isPaused) return;

  isPaused = true;
  pauseTimer();

  document.getElementById('modal-pause').style.display = 'flex';
}

function resumeGame() {
  document.getElementById('modal-pause').style.display = 'none';
  isPaused = false;
  resumeTimer();
}

function endGameFromPause() {
  document.getElementById('modal-pause').style.display = 'none';
  isPaused = false;
  voltarAoMenuDoJogo();
}

function pauseTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function resumeTimer() {
  if (timerInterval || timeExpired || isPaused) return;
  timerInterval = setInterval(() => {
    if (timeExpired || isPaused) return;
    timeLeft--;
    document.getElementById('time-left').textContent = timeLeft;
    if (timeLeft <= 10) document.getElementById('timer').classList.add('low');
    else document.getElementById('timer').classList.remove('low');
    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      timerInterval = null;
      handleTimeOut();
    }
  }, 1000);
}

function loseLife(msg = "Você perdeu uma vida!") {
  lives--;
  livesLostThisLevel++;
  updateLivesUI();
  penaltyTime += 30;

  // Trigger death animation + particles
  robotDeathAnim = { startTime: Date.now(), px: robotPixel.x, py: robotPixel.y };
  spawnDeathParticles(robotPixel.x, robotPixel.y);

  if (lives <= 0) {
    setTimeout(() => {
      alert("💀 GAME OVER\n\nVocê perdeu todas as 3 vidas!\n\nVoltando para o nível atual com vidas novas.");
      lives = 3;
      collectedChipsMemory = [];
      collectedTimeBonusMemory = [];
      robotDeathAnim = null;
      particles = [];
      floatingTexts = [];
      updateLivesUI();
      loadLevel(currentLevelIndex, true);
    }, 900);
  } else {
    collectedChipsMemory = chips
      .map((c, i) => c.collected ? i : -1)
      .filter(i => i !== -1);

    collectedTimeBonusMemory = timeBonusChips
      .map((c, i) => c.collected ? i : -1)
      .filter(i => i !== -1);

    const statusEl = document.getElementById('status');
    statusEl.classList.add('error');
    statusEl.innerHTML = `💥 ${msg} — Reiniciando automaticamente... (+30s de penalidade)`;

    setTimeout(() => {
      robotDeathAnim = null;
      particles = [];
      floatingTexts = [];
      loadLevel(currentLevelIndex, false, true);
    }, 1100);
  }
}

function startGame() {
  const codeArea = document.getElementById('code');
  codeArea.contentEditable = 'true';
  codeArea.style.opacity = '1';
  codeArea.style.cursor = 'text';

  document.getElementById('btn-start').style.display = 'none';
  document.getElementById('btn-exec').disabled = false;
  document.getElementById('btn-solucao').style.display = (currentLevelIndex === 3) ? 'none' : 'flex';

  document.getElementById('status').innerHTML = '🎮 Fase iniciada! Boa sorte!';
  startTimer();
  draw();
}

function resetNivel() {
  document.getElementById('modal-reset-nivel').style.display = 'flex';
}

function confirmarResetNivel() {
  document.getElementById('modal-reset-nivel').style.display = 'none';
  loadLevel(currentLevelIndex, true);
}

function cancelarResetNivel() {
  document.getElementById('modal-reset-nivel').style.display = 'none';
}

function mostrarDica() {
  alert('💡 Dica: Planeje antes de agir. Assim você evita erros e avança com mais segurança. Tente imaginar o caminho do robô e quais comandos serão necessários para coletar os chips sem cair nas armadilhas!');
}

function updateLivesUI() {
  document.getElementById('lives').innerHTML = '❤️'.repeat(lives) + '♡'.repeat(3 - lives);
}

function startTimer() {
  if (timerInterval) clearInterval(timerInterval);
  
  timeLeft = levelTimes[currentLevelIndex];   // continua aqui (seguro)
  penaltyTime = 0;
  livesLostThisLevel = 0;
  usedSolution = false;
  levelStartTime = Date.now();
  timeExpired = false;

  document.getElementById('time-left').textContent = timeLeft;
  document.getElementById('timer').classList.remove('low');

  resumeTimer();
}

function handleTimeOut() {
  timeExpired = true;
  lives--;
  livesLostThisLevel++;
  updateLivesUI();
  penaltyTime += 30;

  const statusEl = document.getElementById('status');
  statusEl.classList.add('error');
  statusEl.innerHTML = `⏰ Seu tempo acabou! — Perdeu 1 vida (+30s penalidade)`;

  document.getElementById('btn-exec').disabled = true;
  const codeArea = document.getElementById('code');
  codeArea.contentEditable = 'false';
  codeArea.style.opacity = '0.5';
  codeArea.style.cursor = 'not-allowed';

  if (lives <= 0) {
    alert("💀 GAME OVER\n\nVocê perdeu todas as 3 vidas!\n\nVoltando para o nível atual com vidas novas.");
    lives = 3;
    collectedChipsMemory = [];
    collectedTimeBonusMemory = [];
    updateLivesUI();
    loadLevel(currentLevelIndex, true);
    return;
  }

  collectedChipsMemory = chips
    .map((c, i) => c.collected ? i : -1)
    .filter(i => i !== -1);

  collectedTimeBonusMemory = timeBonusChips
    .map((c, i) => c.collected ? i : -1)
    .filter(i => i !== -1);

  document.getElementById('modal-timeout').style.display = 'flex';
}

function reiniciarNivelDoTimeout() {
  document.getElementById('modal-timeout').style.display = 'none';
  loadLevel(currentLevelIndex, false, false);
}

function fecharModalTimeout() {
  document.getElementById('modal-timeout').style.display = 'none';
}

// ==================== TECLADO ==================== //
document.addEventListener('keydown', function(e) {
  const codeArea = document.getElementById('code');
  if (codeArea.contentEditable === 'false') return;
  if (isRunning || isPaused) return;
  if (document.activeElement !== codeArea) return;

  let command = '';
  switch (e.key) {
    case 'ArrowUp':    command = 'moverCima()'; break;
    case 'ArrowDown':  command = 'moverBaixo()'; break;
    case 'ArrowLeft':  command = 'moverEsquerda()'; break;
    case 'ArrowRight': command = 'moverDireita()'; break;
    default: return;
  }
  e.preventDefault();

  const currentText = codeArea.innerText.trim();
  codeArea.innerText = currentText ? currentText + '\n' + command : command;

  const range = document.createRange();
  const sel = window.getSelection();
  range.selectNodeContents(codeArea);
  range.collapse(false);
  sel.removeAllRanges();
  sel.addRange(range);
});

// ====================== VOLTAR AO MENU ======================
function voltarAoMenuDoJogo() {
  if (isRunning) {
    isRunning = false;
    shouldStopExecution = true;
  }
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  isPaused = false;
  document.getElementById('modal-pause').style.display = 'none';

  document.getElementById('status').innerHTML = '';

  showMainMenu();
}

// ==================== INICIAR O JOGO ==================== //
loadProgress();
updateProgressBar();
showMainMenu();
gameLoop();

// ==================== LOOP PRINCIPAL ==================== //
function gameLoop() {
  if (!isRunning) draw();
  requestAnimationFrame(gameLoop);
}

document.getElementById('code').addEventListener('keydown', function(e) {
  if (e.ctrlKey && e.key === 'Enter') {
    e.preventDefault();
    executarCodigo();
  }
});
