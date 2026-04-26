// -----------------------------
// 変数
// -----------------------------
let players = [];          
let currentPlayer = 0;     
let round = 1;             

let throws = [];           
let throwIndex = 0;        
let multiplier = "s";      

let outType = "single";    
let separable = "yes";     

let roundStartScore = 0;   
let isBust = false;        

// ★ 勝利確定後の入力禁止
let gameFinished = false;

// ★ 80%スタッツ（プレイヤーごと）
/*
players[i].eightyFixed
players[i].eightyScore
players[i].eightyDarts
*/

// -----------------------------
// 初期化
// -----------------------------
window.onload = () => {
  const settings = JSON.parse(localStorage.getItem("settings01"));
  initGame(settings);
};

// -----------------------------
// ゲーム開始
// -----------------------------
function initGame(settings) {
  isBust = false;
  gameFinished = false;

  players = settings.players.map(name => ({
    name: name,
    score: Number(settings.startScore),
    startScore: Number(settings.startScore),
    roundScores: [],
    awards: [],
    eightyFixed: false,
    eightyScore: 0,
    eightyDarts: 0
  }));

  outType = settings.outType;
  separable = settings.separable;

  currentPlayer = 0;
  round = 1;

  createNumberButtons();
  updatePlayerArea();
  updateRoundDisplay();
  updateThrowDisplay();
  updateNumberButtons();
  startTurn();
}

// -----------------------------
// UI 更新
// -----------------------------
function updatePlayerArea() {
  const area = document.getElementById("playerArea");
  area.innerHTML = "";

  players.forEach((p, i) => {
    const div = document.createElement("div");
    div.className = "playerBox";

    if (i === currentPlayer) div.classList.add("active");

    let scoreText = p.score;
    if (i === currentPlayer && isBust) {
      scoreText = `<span class="bust">Bust!</span>`;
    }

    div.innerHTML = `
      <div>${p.name}</div>
      <div>${scoreText}</div>
    `;

    area.appendChild(div);
  });
}

function updateRoundDisplay() {
  document.getElementById("roundDisplay").textContent = "Round: " + round;
}

function updateThrowDisplay() {
  document.getElementById("t1").textContent =
    "1投目: " + (throws[0]?.label || "-");
  document.getElementById("t2").textContent =
    "2投目: " + (throws[1]?.label || "-");
  document.getElementById("t3").textContent =
    "3投目: " + (throws[2]?.label || "-");
}

// -----------------------------
// S / D / T
// -----------------------------
function setMultiplier(m) {
  multiplier = m;
  updateNumberButtons();
}

function updateNumberButtons() {
  const grid = document.getElementById("numberGrid");
  const prefix = multiplier.toUpperCase() + "-";

  [...grid.children].forEach((btn, index) => {
    const num = index + 1;
    btn.textContent = prefix + num;
  });
}

// -----------------------------
// 80%スタッツ判定
// -----------------------------
function checkEightyStats() {
  const p = players[currentPlayer];
  if (p.eightyFixed) return;

  const start = p.startScore;
  const removed = start - p.score;

  if (removed >= start * 0.8) {
    p.eightyFixed = true;
    p.eightyScore = p.score;
    p.eightyDarts = (round - 1) * 3 + throwIndex;
  }
}

// -----------------------------
// スロー入力
// -----------------------------
function addThrow(base) {
  if (gameFinished) return;   // ← 勝利確定後は入力禁止
  if (throwIndex >= 3) return;

  let value = base;
  let label = "";

  if (base <= 20) {
    if (multiplier === "d") value = base * 2;
    if (multiplier === "t") value = base * 3;
    label = multiplier.toUpperCase() + "-" + base;
  }
  else if (base === 25) {
    value = separable === "yes" ? 25 : 50;
    label = separable === "yes" ? "S-BULL" : "BULL";
  }
  else if (base === 50) {
    value = 50;
    label = "D-BULL";
  }
  else if (base === 0) {
    value = 0;
    label = "MISS";
  }

  const currentRoundTotal = throws.reduce((a, b) => a + b.value, 0);
  const tempScore = roundStartScore - (currentRoundTotal + value);

  // -----------------------------
  // Bust 判定
  // -----------------------------
  if (tempScore < 0 || (outType !== "single" && tempScore === 1)) {
    isBust = true;
    gameFinished = true;   // ← Bust はラウンド終了なので OK

    throws.push({ value, label });
    throwIndex++;

    players[currentPlayer].score = roundStartScore;

    updateThrowDisplay();
    updatePlayerArea();
    return;
  }

  // -----------------------------
  // 正常入力
  // -----------------------------
  throws.push({ value, label });
  throwIndex++;

  const total = throws.reduce((a, b) => a + b.value, 0);
  players[currentPlayer].score = roundStartScore - total;

  updateThrowDisplay();
  updatePlayerArea();

  // ★ 80%スタッツ判定
  checkEightyStats();

  // ★ ここでは gameFinished を立てない（重要）
}


// -----------------------------
// Back（取り消し）
// -----------------------------
function undo() {
  if (throwIndex === 0) return;

  throws.pop();
  throwIndex--;

  isBust = false;
  gameFinished = false;   // ★戻したら再び入力可能にする

  const total = throws.reduce((a, b) => a + b.value, 0);
  players[currentPlayer].score = roundStartScore - total;

  updateThrowDisplay();
  updatePlayerArea();
}

// -----------------------------
// Next（ターン終了）
// -----------------------------
function forceNext() {

  if (!isBust) {
    while (throwIndex < 3) {
      addThrow(0);
      if (isBust) break;
    }
  }

  submitRound();

  currentPlayer++;

  if (currentPlayer >= players.length) {
    currentPlayer = 0;

    // ★ 20ラウンド制限
    if (round >= 20) {
      localStorage.setItem("resultData", JSON.stringify(players));
      localStorage.setItem("winner", players[currentPlayer].name);
      localStorage.setItem("startScore", players[currentPlayer].startScore);
      window.location.href = "result.html";
      return;
    }

    round++;
    updateRoundDisplay();
  }

  updatePlayerArea();
  startTurn();
}

// -----------------------------
// ラウンド処理
// -----------------------------
function submitRound() {

  if (isBust) {
    resetRound();
    return;
  }

  const total = throws.reduce((a, b) => a + b.value, 0);
  const newScore = roundStartScore - total;

  // -----------------------------
  // フィニッシュ（0点）
  // -----------------------------
  if (newScore === 0) {
    const last = throws[throws.length - 1];

    if (!checkFinish(last)) {
      players[currentPlayer].score = roundStartScore;
      resetRound();
      return;
    }

    gameFinished = true;   // ← 勝利確定はここだけで立てる
    players[currentPlayer].score = 0;

    players[currentPlayer].roundScores.push(total);
    checkAwards(players[currentPlayer], throws, total);

    updatePlayerArea();
    resetRound();

    localStorage.setItem("resultData", JSON.stringify(players));
    localStorage.setItem("winner", players[currentPlayer].name);
    localStorage.setItem("startScore", players[currentPlayer].startScore);

    window.location.href = "result.html";
    return;
  }

  // -----------------------------
  // 通常スコア更新
  // -----------------------------
  players[currentPlayer].score = newScore;

  players[currentPlayer].roundScores.push(total);
  checkAwards(players[currentPlayer], throws, total);

  updatePlayerArea();
  resetRound();
}

// -----------------------------
// ラウンドリセット
// -----------------------------
function resetRound() {
  throws = [];
  throwIndex = 0;
  multiplier = "s";
  isBust = false;

  updateNumberButtons();
  updateThrowDisplay();
}

// -----------------------------
// ターン開始
// -----------------------------
function startTurn() {
  isBust = false;
  roundStartScore = players[currentPlayer].score;
  updatePlayerArea();
  updateThrowDisplay();
}

// -----------------------------
// 数字ボタン生成
// -----------------------------
function createNumberButtons() {
  const grid = document.getElementById("numberGrid");
  grid.innerHTML = "";

  for (let i = 1; i <= 20; i++) {
    const btn = document.createElement("button");
    btn.textContent = "S-" + i;
    btn.onclick = () => addThrow(i);
    grid.appendChild(btn);
  }
}

// -----------------------------
// フィニッシュ判定
// -----------------------------
function checkFinish(lastThrow) {
  if (outType === "single") return true;

  if (outType === "double") {
    return (
      lastThrow.label.startsWith("D-") ||
      lastThrow.label === "D-BULL"
    );
  }

  if (outType === "master") {
    return (
      lastThrow.label.startsWith("D-") ||
      lastThrow.label.startsWith("T-") ||
      lastThrow.label === "S-BULL" ||
      lastThrow.label === "D-BULL"
    );
  }

  return true;
}

// -----------------------------
// アワード判定（3 IN A BED 修正版）
// -----------------------------
function checkAwards(player, throws, roundScore) {
  if (roundScore === 180) {
    player.awards.push("TON80");
  } else if (roundScore >= 151) {
    player.awards.push("HIGH TON");
  } else if (roundScore >= 100) {
    player.awards.push("LOW TON");
  }

  const labels = throws.map(t => t.label);

  if (labels.every(l => l === "S-BULL" || l === "D-BULL")) {
    player.awards.push("HAT TRICK");
  }

  if (labels.every(l => l === "D-BULL")) {
    player.awards.push("THREE IN THE BLACK");
  }

  // ★ 3 IN A BED（MISS や BULL を除外）
  const parts = labels.map(l => l.split("-"));

  const valid = parts.every(p =>
    p.length === 2 &&
    p[1] !== "BULL" &&
    p[1] !== "MISS" &&
    p[1] !== "0"
  );

  if (valid) {
    const sameBed =
      parts[0][0] === parts[1][0] &&
      parts[1][0] === parts[2][0];

    const sameNum =
      parts[0][1] === parts[1][1] &&
      parts[1][1] === parts[2][1];

    if (sameBed && sameNum) {
      player.awards.push("3 IN A BED");
    }
  }
}
