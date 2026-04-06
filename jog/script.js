const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

const CELL = 70;
const COLS = 8;
const ROWS = 8;

let nivelAtual = 1;
let isRunning = false;
let jogoTerminado = false;

let robot = { gridX: 1, gridY: 1 };
let robotPixel = { x: 1*CELL + CELL/2, y: 1*CELL + CELL/2 };

let maze = [];
let itens = [];

// ========= NÍVEIS =========
const niveis = [
  {
    nome: "Nível 1",
    maze: [
      [1,1,1,1,1,1,1,1],
      [1,0,0,1,0,0,0,1],
      [1,0,1,1,0,1,0,1],
      [1,0,0,0,0,1,0,1],
      [1,1,1,1,0,1,0,1],
      [1,0,0,1,0,0,0,1],
      [1,0,1,0,0,1,1,1],
      [1,0,0,0,0,0,0,1]
    ],
    robotStart: { x: 1, y: 1 },
    itens: [
      { x: 6, y: 6, tipo: "real" },
      { x: 2, y: 3, tipo: "falso" },
      { x: 5, y: 4, tipo: "falso" }
    ]
  }
];

// ========= CARREGAR =========
function carregarNivel(n) {
  const nivel = niveis[n-1];

  maze = nivel.maze.map(l => [...l]);
  itens = nivel.itens.map(i => ({...i, coletado:false}));

  robot.gridX = nivel.robotStart.x;
  robot.gridY = nivel.robotStart.y;

  robotPixel.x = robot.gridX * CELL + CELL/2;
  robotPixel.y = robot.gridY * CELL + CELL/2;

  jogoTerminado = false;

  document.getElementById('status').innerHTML =
    `<strong>${nivel.nome}</strong> — Pegue ⭐ e evite ✕`;
}

// ========= DESENHO =========
function draw() {
  ctx.clearRect(0,0,canvas.width,canvas.height);

  // paredes
  ctx.fillStyle = '#475569';
  for (let y=0;y<ROWS;y++){
    for (let x=0;x<COLS;x++){
      if (maze[y][x]===1){
        ctx.fillRect(x*CELL,y*CELL,CELL,CELL);
      }
    }
  }

  // grade
  ctx.strokeStyle='#d1d5db';
  for (let i=0;i<=COLS;i++){
    ctx.beginPath();
    ctx.moveTo(i*CELL,0);
    ctx.lineTo(i*CELL,canvas.height);
    ctx.stroke();
  }
  for (let i=0;i<=ROWS;i++){
    ctx.beginPath();
    ctx.moveTo(0,i*CELL);
    ctx.lineTo(canvas.width,i*CELL);
    ctx.stroke();
  }

  // itens
  itens.forEach(item=>{
    if(item.coletado) return;

    const px = item.x*CELL + CELL/2;
    const py = item.y*CELL + CELL/2;

    ctx.save();
    ctx.translate(px,py);

    if(item.tipo==="real"){
      ctx.font='40px Arial';
      ctx.fillText('⭐',0,0);
    } else {
      ctx.fillStyle='red';
      ctx.font='40px Arial';
      ctx.fillText('✕',0,0);
    }

    ctx.restore();
  });

  // robô
  ctx.beginPath();
  ctx.arc(robotPixel.x, robotPixel.y, 20, 0, Math.PI*2);
  ctx.fillStyle = '#22c55e';
  ctx.fill();
}

// ========= MOVIMENTO =========
const sleep = ms => new Promise(r=>setTimeout(r,ms));

async function moveTo(nx, ny) {
  if (jogoTerminado || maze[ny][nx] === 1) return;

  const tx = nx*CELL + CELL/2;
  const ty = ny*CELL + CELL/2;

  const steps = 20;
  const sx = robotPixel.x;
  const sy = robotPixel.y;

  for (let i=1;i<=steps;i++){
    const p = i/steps;
    robotPixel.x = sx + (tx-sx)*p;
    robotPixel.y = sy + (ty-sy)*p;
    draw();
    await sleep(10);
  }

  robot.gridX = nx;
  robot.gridY = ny;

  checarItens();
}

// ========= ITENS =========
function checarItens() {
  for (let item of itens) {
    if (!item.coletado &&
        item.x === robot.gridX &&
        item.y === robot.gridY) {

      item.coletado = true;

      if (item.tipo === "real") {
        jogoTerminado = true;
        document.getElementById('status').innerHTML =
          `🎉 Nível concluído!`;
      } else {
        document.getElementById('status').innerHTML =
          '❌ Item falso!';
        setTimeout(resetNivel, 1200);
      }

      draw();
      return;
    }
  }
}

// ========= COMANDOS =========
const commands = {
  moverDireita: ()=> moveTo(robot.gridX+1, robot.gridY),
  moverEsquerda: ()=> moveTo(robot.gridX-1, robot.gridY),
  moverCima: ()=> moveTo(robot.gridX, robot.gridY-1),
  moverBaixo: ()=> moveTo(robot.gridX, robot.gridY+1)
};

// ========= EXECUÇÃO =========
async function executarCodigo() {
  if (isRunning) return;

  isRunning = true;

  const linhas = document
    .getElementById('codigo')
    .innerText.trim().split('\n');

  for (let linha of linhas) {
    const cmd = linha.trim();
    if (!cmd) continue;

    if (commands[cmd]) {
      await commands[cmd]();
      if (jogoTerminado) break;
    } else {
      document.getElementById('status').innerHTML =
        `❌ Comando inválido: ${cmd}`;
      break;
    }
  }

  isRunning = false;
}

// ========= RESET =========
function resetNivel() {
  carregarNivel(nivelAtual);
  draw();
}

// ========= UI =========
function mostrartutorial(){
  document.getElementById('modal-tutorial').style.display='flex';
}

function fecharModal(){
  document.getElementById('modal-tutorial').style.display='none';
}

// ========= START =========
carregarNivel(1);
draw();

setInterval(()=>{
  if(!isRunning) draw();
},80);