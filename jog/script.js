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

// ========= NÍVEL =========
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

  atualizarPixel();
  document.getElementById('status').innerHTML = nivel.nome;
}

// ========= DESENHO =========
function draw() {
  ctx.clearRect(0,0,canvas.width,canvas.height);

  // paredes
  for (let y=0;y<ROWS;y++){
    for (let x=0;x<COLS;x++){
      if (maze[y][x]===1){
        ctx.fillStyle="#444";
        ctx.fillRect(x*CELL,y*CELL,CELL,CELL);
      }
    }
  }

  // itens
  itens.forEach(item=>{
    if(item.coletado) return;
    ctx.font="30px Arial";
    ctx.fillText(item.tipo==="real"?"⭐":"✕", item.x*CELL+20, item.y*CELL+40);
  });

  // robô (simples)
  ctx.fillStyle="blue";
  ctx.beginPath();
  ctx.arc(robotPixel.x, robotPixel.y, 15, 0, Math.PI*2);
  ctx.fill();
}

// ========= AUX =========
function atualizarPixel(){
  robotPixel.x = robot.gridX * CELL + CELL/2;
  robotPixel.y = robot.gridY * CELL + CELL/2;
}

// ========= MOVIMENTO =========
const sleep = ms => new Promise(r=>setTimeout(r,ms));

async function moveTo(x,y){

  // 🚨 validação completa
  if (x < 0 || y < 0 || x >= COLS || y >= ROWS) return;
  if (maze[y][x] === 1) return;

  robot.gridX = x;
  robot.gridY = y;

  atualizarPixel();
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

    if(cmd === "") continue;

    if(commands[cmd]){
      await commands[cmd]();
    } else {
      document.getElementById('status').innerHTML = "❌ Comando inválido: " + cmd;
      isRunning = false;
      return;
    }
  }

  document.getElementById('status').innerHTML = "✅ Código executado";
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
        document.getElementById('status').innerHTML="❌ Item errado!";
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

// ========= START =========
carregarNivel(1);
draw();