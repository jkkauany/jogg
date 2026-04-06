// =============== CONFIGURAÇÃO ===============
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const CELL = 70;
const COLS = 8;
const ROWS = 8;

let nivelAtual = 1;
let jogoTerminado = false;
let isRunning = false;

let robot = { gridX: 1, gridY: 1 };
let robotPixel = { x: 1 * CELL + CELL / 2, y: 1 * CELL + CELL / 2 };

// ==================== NÍVEIS ====================
const niveis = [
  {
    nome: "Nível 1 - Laboratório ",
    maze: [
      [1, 1, 1, 1, 1, 1, 1, 1],
      [1, 0, 0, 1, 0, 0, 0, 1],
      [1, 0, 1, 1, 0, 1, 0, 1],
      [1, 0, 0, 0, 0, 1, 0, 1],
      [1, 1, 1, 1, 0, 1, 0, 1],
      [1, 0, 0, 1, 0, 0, 0, 1],
      [1, 0, 1, 0, 0, 1, 1, 1],
      [1, 0, 0, 0, 0, 0, 0, 1]
    ],
    robotStart: { x: 1, y: 1 },
    itens: [
      { x: 6, y: 6, tipo: "real" },
      { x: 2, y: 3, tipo: "falso" },
      { x: 5, y: 4, tipo: "falso" }
    ]
  },
  {
    nome: "Nível 2 - Labirinto em Z",
    maze: [
      [1, 1, 1, 1, 1, 1, 1, 1],
      [1, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 1, 1, 1, 1, 0, 1],
      [1, 0, 1, 0, 0, 1, 0, 1],
      [1, 0, 1, 0, 1, 1, 0, 1],
      [1, 0, 0, 0, 1, 0, 0, 1],
      [1, 1, 1, 0, 1, 0, 1, 1],
      [1, 0, 0, 0, 0, 0, 0, 1]
    ],
    robotStart: { x: 1, y: 6 },
    itens: [
      { x: 6, y: 1, tipo: "real" },
      { x: 3, y: 3, tipo: "falso" },
      { x: 4, y: 5, tipo: "falso" },
      { x: 2, y: 2, tipo: "falso" }
    ]
  },
  {
    nome: "Nível 3 - Desafio Avançado",
    maze: [
      [1, 1, 1, 1, 1, 1, 1, 1],
      [1, 0, 1, 0, 0, 1, 0, 1],
      [1, 0, 1, 0, 1, 1, 0, 1],
      [1, 0, 0, 0, 1, 0, 0, 1],
      [1, 1, 1, 0, 1, 0, 1, 1],
      [1, 0, 0, 0, 0, 0, 1, 1],
      [1, 0, 1, 1, 0, 1, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 1]
    ],
    robotStart: { x: 1, y: 1 },
    itens: [
      { x: 5, y: 6, tipo: "real" },
      { x: 3, y: 2, tipo: "falso" },
      { x: 6, y: 3, tipo: "falso" },
      { x: 2, y: 5, tipo: "falso" },
      { x: 4, y: 4, tipo: "falso" }
    ]
  }
];

// Variáveis do nível atual
let maze = [];
let itens = [];

// Função para carregar um nível
function carregarNivel(n) {
  const nivel = niveis[n - 1];
  maze = nivel.maze.map(linha => [...linha]); // cópia
  itens = nivel.itens.map(item => ({ ...item, coletado: false }));

  robot.gridX = nivel.robotStart.x;
  robot.gridY = nivel.robotStart.y;
  robotPixel.x = robot.gridX * CELL + CELL / 2;
  robotPixel.y = robot.gridY * CELL + CELL / 2;

  jogoTerminado = false;
  document.getElementById('status').innerHTML =
    `<strong>${nivel.nome}</strong> — Encontre a ⭐ sem pegar os ✕`;
}

// ==================== DESENHO ====================
function roundRect(ctx, x, y, w, h, r) { /* mantenha sua função original aqui */
  // ... (cole sua função roundRect aqui se quiser)
}

// Desenho do Robô (mantenha sua função drawRobot completa)
function drawRobot(px, py) {
  // Cole aqui TODO o seu código original da função drawRobot
  // (o que você me enviou antes)
  ctx.save();
  ctx.translate(px, py);
  ctx.scale(0.50, 0.37);
  // ... resto do seu robô
  ctx.restore();
}

function draw() {
  const time = Date.now() / 1000;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#f8f7f2';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Paredes
  ctx.fillStyle = '#475569';
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (maze[y][x] === 1) {
        ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
      }
    }
  }

  // Grade
  ctx.strokeStyle = '#d1d5db';
  ctx.lineWidth = 2;
  for (let i = 0; i <= COLS; i++) {
    ctx.beginPath(); ctx.moveTo(i * CELL, 0); ctx.lineTo(i * CELL, canvas.height); ctx.stroke();
  }
  for (let i = 0; i <= ROWS; i++) {
    ctx.beginPath(); ctx.moveTo(0, i * CELL); ctx.lineTo(canvas.width, i * CELL); ctx.stroke();
  }

  // Itens
  itens.forEach(item => {
    if (item.coletado) return;
    const px = item.x * CELL + CELL / 2;
    const py = item.y * CELL + CELL / 2 + Math.sin(time * 3 + item.x) * 8;

    ctx.save();
    ctx.translate(px, py);
    if (item.tipo === "real") {
      ctx.font = 'bold 45px Arial';
      ctx.fillText('⭐', 0, 0);
    } else {
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 40px Arial';
      ctx.fillText('✕', 0, 4);
    }
    ctx.restore();
  });

  drawRobot(robotPixel.x, robotPixel.y);
}

// ==================== MOVIMENTO COM COLISÃO ====================
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function moveTo(newGridX, newGridY) {
  if (jogoTerminado || maze[newGridY][newGridX] === 1) {
    document.getElementById('status').innerHTML = '🚧 Parede bloqueando o caminho!';
    setTimeout(() => { if (!jogoTerminado) document.getElementById('status').innerHTML = ''; }, 1000);
    return;
  }

  // Animação suave (seu código original)
  const startX = robotPixel.x;
  const startY = robotPixel.y;
  const targetX = newGridX * CELL + CELL / 2;
  const targetY = newGridY * CELL + CELL / 2;

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

  checarItens();
}

function checarItens() {
  for (let item of itens) {
    if (!item.coletado && item.x === robot.gridX && item.y === robot.gridY) {
      item.coletado = true;


      async function executarCodigo() {
        if (isRunning) return;
        isRunning = true;
        document.getElementById('status').innerHTML = '🚀 Executando código...';

        const lines = document.getElementById('codigo').innerText.trim().split('\n');
        for (let line of lines) {
          const cmd = line.trim();
          if (cmd === '') continue;
          if (commands[cmd]) {
            await commands[cmd]();
          } else {
            document.getElementById('status').innerHTML = `❌ Comando desconhecido: <b>${cmd}</b>`;
            isRunning = false;

            if (item.tipo === "real") {
              jogoTerminado = true;
              document.getElementById('status').innerHTML = `🎉 Nível ${nivelAtual} concluído!`;
              setTimeout(() => {
                if (nivelAtual < niveis.length) {
                  if (confirm(`Parabéns! Deseja ir para o Nível ${nivelAtual + 1}?`)) {
                    proximoNivel();
                  }
                } else {
                  alert('🏆 Você completou todos os níveis!');
                }
              }, 800);
            } else {
              document.getElementById('status').innerHTML = '❌ Era falso! Reiniciando nível...';
              setTimeout(resetNivelAtual, 1400);
            }
            draw();

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
        robotPixel = { x: 4 * CELL + CELL / 2, y: 5 * CELL + CELL / 2 };

        cards = [
          { x: 2, y: 2, collected: false },
          { x: 5, y: 1, collected: false },
          { x: 7, y: 6, collected: false },
          { x: 3, y: 7, collected: false }
        ];

        document.getElementById('codigo').innerText = 'moverEsquerda()\nmoverEsquerda()\nmoverCima()\nmoverCima()';
        document.getElementById('status').innerHTML = '🔄 Nível reiniciado!';
        draw();
      }

function mostrartutorial() {
  document.getElementById('modal-tutorial').style.display = 'flex';
}

function fecharModal() {
  document.getElementById('modal-tutorial').style.display = 'none';
}

// Iniciar o jogo
draw();
setInterval(() => {
  if (!isRunning) draw();
}, 80);