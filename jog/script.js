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
let isRunning = false;
let shouldStopExecution = false;

// ==================== PROGRESSO ==================== //
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
  updateProgressBar();
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
    corruptedChips: [],
    traps: [],
    solution: `
moverBaixo()
moverBaixo()
moverEsquerda()
moverEsquerda()
moverCima()
moverCima()
moverCima()
moverCima()
moverCima()
moverCima()
moverDireita()
moverDireita()
moverDireita()
moverDireita()
moverDireita()
moverBaixo()
moverBaixo()
moverBaixo()
moverBaixo()
moverBaixo()`
  },
  {
    number: 2,
    title: "Nível 2 — Chipes em linha reta! ⚠️ Cuidado com os chips corrompidos",
    startX: 0,
    startY: 7,
    chips: [
      { x: 7, y: 7 },
      { x: 7, y: 4 },
      { x: 7, y: 1 },
      { x: 3, y: 3 }
    ],
    corruptedChips: [
      { x: 2, y: 6 },
      { x: 4, y: 5 },
      { x: 6, y: 3 },
      { x: 1, y: 1 },
      { x: 5, y: 0 }
    ],
    traps: [],
    solution: `moverDireita()
moverDireita()
moverDireita()
moverDireita()
moverDireita()
moverDireita()
moverDireita()
moverCima()
moverCima()
moverCima()
moverCima()
moverCima()
moverCima()
moverEsquerda()
moverEsquerda()
moverEsquerda()
moverEsquerda()
moverBaixo()
moverBaixo()`
  },
  {
    number: 3,
    title: "Nível 3 — Labirinto simples 🕳️ Evite os buracos e pisos quebrados!",
    startX: 7,
    startY: 0,
    chips: [
      { x: 0, y: 0 },
      { x: 2, y: 4 },
      { x: 5, y: 2 },
      { x: 4, y: 7 },
      { x: 1, y: 6 }
    ],
    corruptedChips: [],
    traps: [
      { x: 3, y: 1 },
      { x: 6, y: 4 },
      { x: 4, y: 3 },
      { x: 2, y: 3 },
      { x: 0, y: 5 },
      { x: 7, y: 3 },
      { x: 5, y: 6 },
      { x: 3, y: 6 },
      { x: 1, y: 2 }
    ],
    solution: `moverEsquerda()
moverEsquerda()
moverEsquerda()
moverEsquerda()
moverEsquerda()
moverEsquerda()
moverEsquerda()
moverBaixo()
moverDireita()
moverDireita()
moverBaixo()
moverDireita()
moverDireita()
moverDireita()
moverBaixo()
moverBaixo()
moverEsquerda()
moverEsquerda()
moverEsquerda()
moverEsquerda()
moverBaixo()
moverBaixo()
moverBaixo()
moverDireita()
moverDireita()
moverDireita()`
  },
  {
    number: 4,
    title: "Nível 4 — Desafio Final! ⚠️ Boa Sorte!!",
    startX: 3,
    startY: 3,
    chips: [
      { x: 0, y: 0 },
      { x: 7, y: 0 },
      { x: 0, y: 7 },
      { x: 7, y: 7 },
      { x: 2, y: 5 },
      { x: 5, y: 1 }
    ],
    corruptedChips: [
      { x: 1, y: 4 },
      { x: 6, y: 2 },
      { x: 4, y: 5 },
      { x: 2, y: 6 }
    ],
    traps: [
      { x: 3, y: 1 },
      { x: 5, y: 3 },
      { x: 0, y: 2 },
      { x: 7, y: 4 },
      { x: 1, y: 6 },
      { x: 6, y: 0 },
      { x: 4, y: 7 },
      { x: 2, y: 0 }
    ],
    solution: `Boa sorte meu consagrado... 🤖\n\nSegure na mão de Deus e vá na Fé!!`
  },
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
  ctx.fill();
  ctx.stroke();
  roundRect(ctx, ox - 32, oy - 56, 64, 49, 15);
  ctx.fill();
  ctx.stroke();
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
  ctx.beginPath(); 
  ctx.arc(ox - 23, oy - 81, 4.8, 0, Math.PI * 2); 
  ctx.fill();
  ctx.beginPath(); 
  ctx.arc(ox + 23, oy - 81, 4.8, 0, Math.PI * 2); 
  ctx.fill();
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
  if (chips[index].collected) return;
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
  ctx.shadowColor = '#059669';
  ctx.shadowBlur = 14;
  ctx.shadowOffsetY = 4;
  ctx.fillStyle = '#10b981';
  roundRect(ctx, -21, -25, 42, 50, 10);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = '#26ff0a';
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

  traps.forEach((trap, i) => drawTrap(trap.x, trap.y, time + i));
  corruptedChips.forEach((_, i) => drawCorruptedChip(corruptedChips[i].x, corruptedChips[i].y, i, time));
  chips.forEach((_, i) => drawChip(chips[i].x, chips[i].y, i, time));

  drawRobot(robotPixel.x, robotPixel.y);
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function moveTo(newGridX, newGridY) {
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

  if (traps.some(t => t.x === robot.gridX && t.y === robot.gridY)) {
    shouldStopExecution = true;
    alert('💥 Você caiu no buraco negro!\n\nA fase foi resetada.');
    document.getElementById('status').innerHTML = `💥 Caiu em um buraco! Resetando...`;
    setTimeout(resetNivel, 800);
    return;
  }

  for (let i = 0; i < corruptedChips.length; i++) {
    if (corruptedChips[i].x === robot.gridX && corruptedChips[i].y === robot.gridY) {
      shouldStopExecution = true;
      alert('⚠️ Chip corrompido coletado!\n\nA fase foi resetada.');
      document.getElementById('status').innerHTML = `⚠️ Chip corrompido! Resetando...`;
      setTimeout(resetNivel, 800);
      return;
    }
  }

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
    saveProgress(levels[currentLevelIndex].number);
  }
}

// ==================== EXECUTAR CÓDIGO ==================== //
async function executarCodigo() {
  if (isRunning) return;

  isRunning = true;
  shouldStopExecution = false;
  const status = document.getElementById('status');
  const codeArea = document.getElementById('code');

  status.innerHTML = '🚀 Executando código...';
  document.getElementById('btn-proximo').style.display = 'none';

  const lines = codeArea.innerText.trim().split('\n');

  for (let line of lines) {
    const cmd = line.trim();
    if (cmd === '') continue;

    const match = cmd.match(/^(\w+)\s*\(?\s*(\d*)\s*\)?$/);
    
    if (!match) {
      status.innerHTML = `❌ Comando inválido: <b>${cmd}</b>`;
      isRunning = false;
      return;
    }

    const commandName = match[1];
    let quantidade = 1;

    if (match[2] !== '') {
      quantidade = parseInt(match[2]);
      if (isNaN(quantidade) || quantidade < 1) {
        status.innerHTML = `❌ Quantidade inválida em: <b>${cmd}</b>`;
        isRunning = false;
        return;
      }
    }

    if (commandFunctions[commandName]) {
      await commandFunctions[commandName](quantidade);
    } else {
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

  if (chips.every(c => c.collected)) {
    status.innerHTML = `🎉 Nível ${levels[currentLevelIndex].number} concluído!`;
    document.getElementById('btn-proximo').style.display = 'flex';
  } else {
    status.innerHTML = '✅ Código executado! Editor limpo.';
    codeArea.innerHTML = '';
  }
}

async function moverDireita(quantidade = 1) {
  for (let i = 0; i < quantidade; i++) {
    if (robot.gridX >= COLS - 1) break;
    await moveTo(robot.gridX + 1, robot.gridY);
  }
}

async function moverEsquerda(quantidade = 1) {
  for (let i = 0; i < quantidade; i++) {
    if (robot.gridX <= 0) break;
    await moveTo(robot.gridX - 1, robot.gridY);
  }
}

async function moverCima(quantidade = 1) {
  for (let i = 0; i < quantidade; i++) {
    if (robot.gridY <= 0) break;
    await moveTo(robot.gridX, robot.gridY - 1);
  }
}

async function moverBaixo(quantidade = 1) {
  for (let i = 0; i < quantidade; i++) {
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

// ==================== ATALHOS COM SETAS DO TECLADO ==================== //
const codeArea = document.getElementById('code');

codeArea.addEventListener('keydown', function(e) {
    if (e.ctrlKey || e.shiftKey || e.altKey) return;

    let comando = '';

    switch (e.key) {
        case 'ArrowRight':
            comando = 'moverDireita()';
            break;
        case 'ArrowLeft':
            comando = 'moverEsquerda()';
            break;
        case 'ArrowUp':
            comando = 'moverCima()';
            break;
        case 'ArrowDown':
            comando = 'moverBaixo()';
            break;
        default:
            return;
    }

    e.preventDefault();
    inserirNoCursor(comando);
    inserirNoCursor('\n');
});

function inserirNoCursor(texto) {
    const sel = window.getSelection();
    if (!sel.rangeCount) return;

    const range = sel.getRangeAt(0);
    range.deleteContents();

    const textNode = document.createTextNode(texto);
    range.insertNode(textNode);

    range.setStartAfter(textNode);
    range.setEndAfter(textNode);
    sel.removeAllRanges();
    sel.addRange(range);

    codeArea.scrollTop = codeArea.scrollHeight;
}

// ==================== FUNÇÕES DO JOGO ==================== //
function loadLevel(index) {
  currentLevelIndex = index;
  const level = levels[index];

  robot = { gridX: level.startX, gridY: level.startY };
  robotPixel = { 
    x: level.startX * CELL + CELL/2, 
    y: level.startY * CELL + CELL/2 
  };

  chips = level.chips.map(chip => ({ ...chip, collected: false }));
  corruptedChips = level.corruptedChips ? level.corruptedChips.map(c => ({...c})) : [];
  traps = level.traps ? [...level.traps] : [];

  document.getElementById('level-title').innerText = level.title;
  document.getElementById('code').innerHTML = '';
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
  alert('💡 Dica: Planeje o caminho antes de executar. Evite chips vermelhos e buracos!');
}

function mostrarSolucao() {
  const level = levels[currentLevelIndex];
  document.getElementById('code').innerText = level.solution;
  document.getElementById('status').innerHTML = currentLevelIndex === 3 
    ? '💡 Mensagem carregada!' 
    : '📋 Solução carregada!';
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