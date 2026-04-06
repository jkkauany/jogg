const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

const CELL = 70;
const COLS = 8;
const ROWS = 8;

let nivelAtual = 1;
let isRunning = false;

let robot = { gridX: 1, gridY: 1 };
let robotPixel = { x: 0, y: 0 };

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
      { x: 2, y: 3, tipo: "falso" }
    ]
  }
];

// ========= CARREGAR =========
function carregarNivel(n) {
  const nivel = niveis[n-1];

  maze = nivel.maze;
  itens = nivel.itens.map(i => ({...i, coletado:false}));

  robot.gridX = nivel.robotStart.x;
  robot.gridY = nivel.robotStart.y;

  robotPixel.x = robot.gridX * CELL + CELL/2;
  robotPixel.y = robot.gridY * CELL + CELL/2;

  document.getElementById('status').innerHTML = nivel.nome;
}

// ========= DESENHO =========
function draw() {
  ctx.clearRect(0,0,canvas.width,canvas.height);

  for (let y=0;y<ROWS;y++){
    for (let x=0;x<COLS;x++){
      if (maze[y][x]===1){
        ctx.fillStyle="#444";
        ctx.fillRect(x*CELL,y*CELL,CELL,CELL);
      }
    }
  }

  itens.forEach(item=>{
    if(item.coletado) return;
    ctx.font="30px Arial";
    ctx.fillText(item.tipo==="real"?"⭐":"✕", item.x*CELL+20, item.y*CELL+40);
  });

  ctx.fillStyle="blue";
  ctx.beginPath();
  ctx.arc(robotPixel.x, robotPixel.y, 15, 0, Math.PI*2);
  ctx.fill();
}

// ========= MOVIMENTO =========
const sleep = ms => new Promise(r=>setTimeout(r,ms));

async function moveTo(x,y){
  if(maze[y][x]===1) return;

  robot.gridX = x;
  robot.gridY = y;

  robotPixel.x = x*CELL + CELL/2;
  robotPixel.y = y*CELL + CELL/2;

  checarItens();
  draw();
  await sleep(200);
}

// ========= COMANDOS =========
const commands = {
  'moverEsquerda()': ()=> moveTo(robot.gridX-1, robot.gridY),
  'moverDireita()': ()=> moveTo(robot.gridX+1, robot.gridY),
  'moverCima()': ()=> moveTo(robot.gridX, robot.gridY-1),
  'moverBaixo()': ()=> moveTo(robot.gridX, robot.gridY+1),
};

// ========= EXECUTAR =========
async function executarCodigo(){
  if(isRunning) return;
  isRunning = true;

  const codigo = document.getElementById('codigo').value.trim().split('\n');

  for(let linha of codigo){
    const cmd = linha.trim();
    if(commands[cmd]){
      await commands[cmd]();
    } else {
      document.getElementById('status').innerHTML = "❌ Comando inválido";
      isRunning = false;
      return;
    }
  }

  isRunning = false;
}

// ========= ITENS =========
function checarItens(){
  itens.forEach(item=>{
    if(!item.coletado && item.x===robot.gridX && item.y===robot.gridY){
      item.coletado = true;

      if(item.tipo==="real"){
        document.getElementById('status').innerHTML="🎉 Você venceu!";
      } else {
        document.getElementById('status').innerHTML="❌ Pegou errado!";
        setTimeout(resetNivelAtual,1000);
      }
    }
  });
}

// ========= CONTROLES =========
function resetNivelAtual(){
  carregarNivel(nivelAtual);
  draw();
}

function mostrartutorial(){
  document.getElementById('modal-tutorial').style.display='flex';
}

function fecharModal(){
  document.getElementById('modal-tutorial').style.display='none';
}

// START
carregarNivel(1);
draw();