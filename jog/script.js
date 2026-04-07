// =============== CONFIGURAÇÃO =============== //
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const CELL = 70;
const COLS = 8, ROWS = 8;

let currentLevelIndex = 0;
let robot = { gridX: 0, gridY: 0 };
let robotPixel = { x: 0, y: 0 };
let chips = [];
let isRunning = false;

// ==================== [MODIFICAÇÃO 1] SALVAR PROGRESSO ==================== //
let completedLevels = [];

function loadProgress() {
  const saved = localStorage.getItem('robotCodificadorProgress');
  if (saved) {
    completedLevels = JSON.parse(saved);
  } else {
    completedLevels = [];
  }
}

function saveProgress(levelNumber) {
  if (!completedLevels.includes(levelNumber)) {
    completedLevels.push(levelNumber);
    completedLevels.sort((a, b) => a - b);
    localStorage.setItem('robotCodificadorProgress', JSON.stringify(completedLevels));
  }
  updateProgressBar(); // ← Correção: atualiza a barra visualmente
}

function resetProgress() {
  if (confirm('🗑️ Deseja apagar TODO o progresso e começar do zero?')) {
    localStorage.removeItem('robotCodificadorProgress');
    completedLevels = [];
    updateProgressBar();
    loadLevel(0);
    alert('✅ Progresso resetado! O jogo voltou ao início.');
  }
}

// ==================== FUNÇÃO DA BARRA DE PROGRESSO ==================== //
function updateProgressBar() {
  const bar = document.getElementById('progress-bar');
  if (!bar) return;
  bar.innerHTML = '';
  for (let i = 1; i <= 4; i++) {
    const dot = document.createElement('div');
    dot.className = `level-dot ${completedLevels.includes(i) ? 'completed' : ''}`;
    dot.textContent = i;
    bar.appendChild(dot);
  }
}

// =============== NÍVEIS =============== //
const levels = [
  {
    number: 1,
    title: "Nível 1 — Colete os 4 chipes!",
    startX: 4,
    startY: 5,
    chips: [
      { x: 2, y: 2 },
      { x: 5, y: 1 },
      { x: 7, y: 6 },
      { x: 3, y: 7 }
    ],
    solution: `moverEsquerda()
moverEsquerda()
moverCima()
moverCima()
moverDireita()
moverDireita()
moverBaixo()
moverBaixo()
moverEsquerda()
moverCima()
moverDireita()
moverDireita()
moverBaixo()
moverBaixo()
moverEsquerda()`
  },
  {
    number: 2,
    title: "Nível 2 — Chipes em linha reta!",
    startX: 0,
    startY: 7,
    chips: [
      { x: 7, y: 7 },
      { x: 7, y: 4 },
      { x: 7, y: 1 },
      { x: 3, y: 3 }
    ],
    solution: `moverDireita()\nmoverDireita()\nmoverDireita()\nmoverDireita()\nmoverDireita()\nmoverDireita()\nmoverDireita()\nmoverCima()\nmoverCima()\nmoverCima()`
  },
  {
    number: 3,
    title: "Nível 3 — Labirinto simples",
    startX: 7,
    startY: 0,
    chips: [{ x: 0, y: 0 }, 
      { x: 2, y: 4 }, 
      { x: 5, y: 2 }, 
      { x: 4, y: 7 }, 
      { x: 1, y: 6 }],
    solution: `moverEsquerda()
moverEsquerda()
moverEsquerda()
moverBaixo()
moverBaixo()
moverEsquerda()`
  },
  {
    number: 4,
    title: "Nível 4 — Desafio Final!",
    startX: 3,
    startY: 3,
    chips: [{ x: 0, y: 0 }, 
      { x: 7, y: 0 }, 
      { x: 0, y: 7 }, 
      { x: 7, y: 7 }, 
      { x: 2, y: 5 }, 
      { x: 5, y: 1 }],
    solution: ``
  }
];

// Função auxiliar para retângulos arredondados
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

// Desenha o ROBÔ (mesmo código anterior)
function drawRobot(px, py) {
  ctx.save();
  ctx.translate(px, py);
  ctx.scale(0.92, 0.92);
  ctx.shadowColor = '#1e3a5f';
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 8;
  ctx.fillStyle = '#e0f2ff';
  ctx.strokeStyle = '#1e3a5f';
  ctx.lineWidth = 9;
  roundRect(ctx, -28, -12, 56, 65, 18);
  ctx.fill();
  ctx.stroke();
  roundRect(ctx, -31, -58, 62, 52, 14);
  ctx.fill();
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#0a2540';
  roundRect(ctx, -23, -51, 46, 37, 9);
  ctx.fill();
  ctx.fillStyle = '#00f5ff';
  ctx.fillRect(-14, -45, 9, 14);
  ctx.fillRect(5, -45, 9, 14);
  ctx.fillStyle = 'white';
  ctx.fillRect(-11, -47, 3, 4);
  ctx.fillRect(8, -47, 3, 4);
  ctx.strokeStyle = '#00f5ff';
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.arc(0, -28, 9, 0.3 * Math.PI, 0.7 * Math.PI);
  ctx.stroke();
  ctx.strokeStyle = '#1e3a5f';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(-17, -65); ctx.lineTo(-23, -82);
  ctx.moveTo(17, -65); ctx.lineTo(23, -82);
  ctx.stroke();
  ctx.fillStyle = '#1e3a5f';
  ctx.beginPath(); ctx.arc(-23, -82, 5, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(23, -82, 5, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = '#1e3a5f';
  ctx.lineWidth = 11;
  ctx.beginPath(); ctx.moveTo(-28, 8); ctx.quadraticCurveTo(-48, 18, -52, 38); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(28, 8); ctx.quadraticCurveTo(48, 18, 52, 38); ctx.stroke();
  ctx.lineWidth = 9;
  ctx.beginPath(); ctx.moveTo(-13, 48); ctx.lineTo(-18, 72); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(13, 48); ctx.lineTo(18, 72); ctx.stroke();
  ctx.restore();
}

// Desenha chipe (some quando collected = true)
function drawChip(x, y, index, time) {
  if (chips[index].collected) return;   // ← CHIPE SOME AQUI
  const px = x * CELL + CELL/2;
  const py = y * CELL + CELL/2 + Math.sin(time * 3 + index) * 8;
  const rot = Math.sin(time * 2.5 + index * 1.3) * 7;
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(rot * Math.PI / 180);
  ctx.fillStyle = '#10b981';
  ctx.shadowColor = '#059669';
  ctx.shadowBlur = 15;
  roundRect(ctx, -23, -27, 46, 54, 9);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 5;
  ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 26px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('💾', 0, 3);
  ctx.restore();
}

// Desenho completo
function draw() {
  const time = Date.now() / 1000;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#f8f7f2';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.globalAlpha = 0.07;
  ctx.font = '290px system-ui';
  ctx.fillStyle = '#64748b';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('< />', canvas.width/2, canvas.height/2 + 15);
  ctx.restore();

  // Grade
  ctx.strokeStyle = '#d1d5db';
  ctx.lineWidth = 2.8;
  for (let i = 0; i <= COLS; i++) {
    ctx.beginPath(); ctx.moveTo(i * CELL, 0); ctx.lineTo(i * CELL, canvas.height); ctx.stroke();
  }
  for (let i = 0; i <= ROWS; i++) {
    ctx.beginPath(); ctx.moveTo(0, i * CELL); ctx.lineTo(canvas.width, i * CELL); ctx.stroke();
  }

  chips.forEach((_, i) => drawChip(chips[i].x, chips[i].y, i, time));
  drawRobot(robotPixel.x, robotPixel.y);
}

// Movimento suave
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function moveTo(newGridX, newGridY) {
  // ... (código de movimento igual ao anterior - não mudou)
  const startX = robotPixel.x;
  const startY = robotPixel.y;
  const targetX = newGridX * CELL + CELL/2;
  const targetY = newGridY * CELL + CELL/2;
  const steps = 24;

  for (let i = 1; i <= steps; i++) {
    let p = i / steps;
    p = 1 - Math.pow(1 - p, 3);
    robotPixel.x = startX + (targetX - startX) * p;
    robotPixel.y = startY + (targetY - startY) * p;
    draw();
    await sleep(13);
  }

  robot.gridX = newGridX;
  robot.gridY = newGridY;
  robotPixel.x = targetX;
  robotPixel.y = targetY;
  draw();

  // Coleta de chipe
  chips.forEach(chip => {
    if (!chip.collected && chip.x === robot.gridX && chip.y === robot.gridY) {
      chip.collected = true;
    }
  });

  const totalCollected = chips.filter(c => c.collected).length;
  if (totalCollected > 0) {
    document.getElementById('status').innerHTML = `✅ Chipe coletado! (${totalCollected}/${chips.length})`;
  }

  if (chips.every(c => c.collected)) {
    document.getElementById('status').innerHTML = `🎉 Nível ${levels[currentLevelIndex].number} concluído!`;
    document.getElementById('btn-proximo').style.display = 'flex';
    setTimeout(() => alert(`🏆 Nível ${levels[currentLevelIndex].number} concluído com sucesso!`), 400);
  }
}

// ==================== [MODIFICAÇÃO 2] EXECUTAR + LIMPA EDITOR ==================== //
async function executarCodigo() {
  if (isRunning) return;

  isRunning = true;
  document.getElementById('status').innerHTML = '🚀 Executando código...';
  document.getElementById('btn-proximo').style.display = 'none';

  const lines = document.getElementById('code').innerText.trim().split('\n');

  for (let line of lines) {
    const cmd = line.trim();
    if (cmd === '') continue;
    if (commands[cmd]) {
      await commands[cmd]();
    } else {
      document.getElementById('status').innerHTML = `❌ Comando desconhecido: <b>${cmd}</b>`;
      isRunning = false;
      return;
    }
  }

  isRunning = false;
  document.getElementById('code').innerText = '';

  if (!chips.every(c => c.collected)) {
    document.getElementById('status').innerHTML = '✅ Código executado com sucesso! (Robô continua no lugar)';
  }
}

// Comandos (igual)
const commands = {
  'moverEsquerda()': () => moveTo(Math.max(0, robot.gridX - 1), robot.gridY),
  'moverDireita()': () => moveTo(Math.min(COLS-1, robot.gridX + 1), robot.gridY),
  'moverCima()': () => moveTo(robot.gridX, Math.max(0, robot.gridY - 1)),
  'moverBaixo()': () => moveTo(robot.gridX, Math.min(ROWS-1, robot.gridY + 1))
};

async function executarCodigo() {
  if (isRunning) return;
  isRunning = true;
  document.getElementById('status').innerHTML = '🚀 Executando código...';
  document.getElementById('btn-proximo').style.display = 'none';

  const lines = document.getElementById('code').innerText.trim().split('\n');

  for (let line of lines) {
    const cmd = line.trim();
    if (cmd === '') continue;
    if (commands[cmd]) {
      await commands[cmd]();
    } else {
      document.getElementById('status').innerHTML = `❌ Comando desconhecido: <b>${cmd}</b>`;
      isRunning = false;
      return;
    }
  }
  isRunning = false;
  if (!chips.every(c => c.collected)) {
    document.getElementById('status').innerHTML = '✅ Código executado com sucesso!';
  }
}

function loadLevel(index) {
  currentLevelIndex = index;
  const level = levels[index];

  robot = { gridX: level.startX, gridY: level.startY };
  robotPixel = { x: level.startX * CELL + CELL/2, y: level.startY * CELL + CELL/2 };

  chips = level.chips.map(chip => ({ ...chip, collected: false }));

  document.getElementById('level-title').innerText = level.title;
  document.getElementById('code').innerText = level.solution || 'Escreva seu código aqui...';
  document.getElementById('status').innerHTML = '';
  document.getElementById('btn-proximo').style.display = 'none';

  draw();
}

function proximoNivel() {
  if (currentLevelIndex < levels.length - 1) {
    loadLevel(currentLevelIndex + 1);
  } else {
    alert('🎉 Parabéns! Você completou todos os 4 níveis!');
    loadLevel(0);
  }
}

function mostrarDica() {
  alert('💡 Dica: Planeje o caminho antes de executar. Cada chipe deve ser visitado!');
}

function mostrarSolucao() {
  const level = levels[currentLevelIndex];
  if (level.solution) {
    document.getElementById('code').innerText = level.solution;
    document.getElementById('status').innerHTML = '📋 Solução carregada!';
  } else {
    alert('🤖 Neste nível a solução não foi fornecida. Tente resolver sozinho!');
  }
}

function resetNivel() {
  loadLevel(currentLevelIndex);
}

function mostrarDocs() {
  document.getElementById('modal-docs').style.display = 'flex';
}

function fecharModal() {
  document.getElementById('modal-docs').style.display = 'none';
}

// ==================== INICIAR O JOGO ==================== //
loadProgress();
const maxCompleted = completedLevels.length ? Math.max(...completedLevels) : 0;
const startIndex = Math.min(maxCompleted, levels.length - 1);
loadLevel(startIndex);

setInterval(() => {
  if (!isRunning) draw();
}, 80);

// Atalho Ctrl + Enter para executar
document.getElementById('code').addEventListener('keydown', function(e) {
  if (e.ctrlKey && e.key === 'Enter') {
    e.preventDefault();
    executarCodigo();
  }
});