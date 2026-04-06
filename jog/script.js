// =============== CONFIGURAÇÃO ===============
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const CELL = 70;
const COLS = 8, ROWS = 8;

let robot = { gridX: 4, gridY: 5 };
let robotPixel = { x: 4*CELL + CELL/2, y: 5*CELL + CELL/2 };

let cards = [
  { x: 2, y: 2, collected: false },
  { x: 5, y: 1, collected: false },
  { x: 7, y: 6, collected: false },
  { x: 3, y: 7, collected: false }
];

let isRunning = false;

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

// Desenha o ROBÔ
function drawRobot(px, py) {
  ctx.save();
  ctx.translate(px, py);
  ctx.scale(0.50, 0.37); // AQUI está o tamanho atual do robo

  ctx.shadowColor = '#1e3a5f';
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 8;

  // Corpo
  ctx.fillStyle = '#e0f2ff';
  ctx.strokeStyle = '#1e3a5f';
  ctx.lineWidth = 9;
  roundRect(ctx, -28, -12, 56, 65, 18);
  ctx.fill();
  ctx.stroke();

  // Cabeça
  roundRect(ctx, -31, -58, 62, 52, 14);
  ctx.fill();
  ctx.stroke();

  // Tela
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#0a2540';
  roundRect(ctx, -23, -51, 46, 37, 9);
  ctx.fill();

  // Olhos
  ctx.fillStyle = '#00f5ff';
  ctx.fillRect(-14, -45, 9, 14);
  ctx.fillRect(5, -45, 9, 14);

  ctx.fillStyle = 'white';
  ctx.fillRect(-11, -47, 3, 4);
  ctx.fillRect(8, -47, 3, 4);

  // Sorriso
  ctx.strokeStyle = '#00f5ff';
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.arc(0, -28, 9, 0.3 * Math.PI, 0.7 * Math.PI);
  ctx.stroke();

  // Antenas
  ctx.strokeStyle = '#1e3a5f';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(-17, -65); ctx.lineTo(-23, -82);
  ctx.moveTo(17, -65); ctx.lineTo(23, -82);
  ctx.stroke();

  ctx.fillStyle = '#1e3a5f';
  ctx.beginPath(); ctx.arc(-23, -82, 5, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(23, -82, 5, 0, Math.PI*2); ctx.fill();

  // Braços e pernas
  ctx.strokeStyle = '#1e3a5f';
  ctx.lineWidth = 11;
  ctx.beginPath(); ctx.moveTo(-28, 8); ctx.quadraticCurveTo(-48, 18, -52, 38); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(28, 8); ctx.quadraticCurveTo(48, 18, 52, 38); ctx.stroke();

  ctx.lineWidth = 9;
  ctx.beginPath(); ctx.moveTo(-13, 48); ctx.lineTo(-18, 72); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(13, 48); ctx.lineTo(18, 72); ctx.stroke();

  ctx.restore();
}

// Desenha carta flutuante
function drawCard(x, y, index, time) {
  if (cards[index].collected) return;
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
  ctx.fillText('⟨⟩', 0, 3);

  ctx.restore();
}

// Desenho completo
function draw() {
  const time = Date.now() / 1000;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Fundo
  ctx.fillStyle = '#f8f7f2';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Símbolo sutil de código
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
    ctx.beginPath();
    ctx.moveTo(i * CELL, 0);
    ctx.lineTo(i * CELL, canvas.height);
    ctx.stroke();
  }
  for (let i = 0; i <= ROWS; i++) {
    ctx.beginPath();
    ctx.moveTo(0, i * CELL);
    ctx.lineTo(canvas.width, i * CELL);
    ctx.stroke();
  }

  // Cartas
  cards.forEach((_, i) => drawCard(cards[i].x, cards[i].y, i, time));

  // Robô
  drawRobot(robotPixel.x, robotPixel.y);
}

// Movimento suave
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

  // Coleta de carta
  let collectedCount = 0;
  cards.forEach(card => {
    if (!card.collected && card.x === robot.gridX && card.y === robot.gridY) {
      card.collected = true;
      collectedCount++;
    }
  });

  if (collectedCount > 0) {
    const total = cards.filter(c => c.collected).length;
    document.getElementById('status').innerHTML = `✅ Carta coletada! (${total}/4)`;
  }

  if (cards.every(c => c.collected)) {
    document.getElementById('status').innerHTML = '🎉 PARABÉNS! Todas as cartas coletadas!';
    setTimeout(() => {
      alert('🏆 Nível 1 concluído com sucesso! 🎉');
    }, 300);
  }
}

// Comandos
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
  if (!cards.every(c => c.collected)) {
    document.getElementById('status').innerHTML = '✅ Código executado com sucesso!';
  }
}

function mostrarDica() {
  alert('💡 Dica: Comece indo para a esquerda e depois suba para pegar a primeira carta em (2,2)!');
}

function resetNivel() {
  robot = { gridX: 4, gridY: 5 };
  robotPixel = { x: 4*CELL + CELL/2, y: 5*CELL + CELL/2 };
  
  cards = [
    { x: 2, y: 2, collected: false },
    { x: 5, y: 1, collected: false },
    { x: 7, y: 6, collected: false },
    { x: 3, y: 7, collected: false }
  ];
  
  document.getElementById('code').innerText = 'moverEsquerda()\nmoverEsquerda()\nmoverCima()\nmoverCima()';
  document.getElementById('status').innerHTML = '🔄 Nível reiniciado!';
  draw();
}

function mostrarDocs() {
  document.getElementById('modal-docs').style.display = 'flex';
}

function fecharModal() {
  document.getElementById('modal-docs').style.display = 'none';
}

// Iniciar o jogo
draw();
setInterval(() => { 
  if (!isRunning) draw(); 
}, 80);