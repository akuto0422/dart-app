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
let gameFinished = false;

let gameHistory = [];

// -----------------------------
// 初期化
// -----------------------------
window.onload = () => {
  const settings = JSON.parse(sessionStorage.getItem("settings01"));
  initGame(settings);
};

// -----------------------------
// ゲーム開始
// -----------------------------
function initGame(settings) {

  players = settings.players.map(name => ({
    name: name,
    score: Number(settings.startScore),
    startScore: Number(settings.startScore),

    history: [],

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
// UI
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

    div.innerHTML = `<div>${p.name}</div><div>${scoreText}</div>`;
    area.appendChild(div);
  });
}

function updateRoundDisplay() {
  document.getElementById("roundDisplay").textContent = "Round: " + round;
}

function updateThrowDisplay() {
  document.getElementById("t1").textContent = "1投目: " + (throws[0]?.label || "-");
  document.getElementById("t2").textContent = "2投目: " + (throws[1]?.label || "-");
  document.getElementById("t3").textContent = "3投目: " + (throws[2]?.label || "-");
}

// -----------------------------
// ボタン
// -----------------------------
function setMultiplier(m) {
  multiplier = m;
  updateNumberButtons();
}

function updateNumberButtons() {
  const grid = document.getElementById("numberGrid");
  const prefix = multiplier.toUpperCase() + "-";

  [...grid.children].forEach((btn, index) => {
    btn.textContent = prefix + (index + 1);
  });
}

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
// スロー
// -----------------------------
function addThrow(base) {
  if (gameFinished) return;
  if (throwIndex >= 3) return;

  let value = base;
  let label = "";

  if (base <= 20) {
    if (multiplier === "d") value = base * 2;
    if (multiplier === "t") value = base * 3;
    label = multiplier.toUpperCase() + "-" + base;
  } else if (base === 25) {
    value = separable === "yes" ? 25 : 50;
    label = separable === "yes" ? "S-BULL" : "BULL";
  } else if (base === 50) {
    value = 50;
    label = "D-BULL";
  } else {
    value = 0;
    label = "MISS";
  }

  players[currentPlayer].score -= value;

  throws.push({ value, label });
  throwIndex++;

  // Bust判定
  if (
    players[currentPlayer].score < 0 ||
    (outType !== "single" && players[currentPlayer].score === 1)
  ) {
    isBust = true;
    gameFinished = true;
  }

  updateThrowDisplay();
  updatePlayerArea();

  checkEightyStats();
}

// -----------------------------
// Undo
// -----------------------------
function undo() {

  // ラウンド内
  if (throwIndex > 0) {
    const player = players[currentPlayer];

    const th = throws.pop();
    throwIndex--;

    player.score += th.value;

    isBust = false;
    gameFinished = false;

  } else {

    if (gameHistory.length === 0) return;

    const last = gameHistory.pop();
    const player = players[last.playerIndex];

    // ★プレイヤーも戻す
    currentPlayer = last.playerIndex;

    // throws復元
    throws = [...last.throws];
    throwIndex = throws.length;

    // score復元
    if (last.bust) {
      const total = throws.reduce((a, b) => a + b.value, 0);
      player.score = last.startScore - total;
    } else {
      player.score = last.endScore;
    }

    // ラウンド調整
    if (currentPlayer === players.length - 1) {
      round--;
    }

    isBust = false;
    gameFinished = false;
  }

  roundStartScore = players[currentPlayer].score;

  updateThrowDisplay();
  updatePlayerArea();
  updateRoundDisplay();
}

// -----------------------------
// Next
// -----------------------------
function forceNext() {

  while (!isBust && !gameFinished && throwIndex < 3) {
    addThrow(0);
  }

  submitRound();

  currentPlayer++;

  if (currentPlayer >= players.length) {
    currentPlayer = 0;

    if (round >= 20) {
      finishGame(players[currentPlayer]);
      return;
    }

    round++;
    updateRoundDisplay();
  }

  gameFinished = false;
  startTurn();
}

// -----------------------------
// ラウンド処理
// -----------------------------
function submitRound() {

  const total = throws.reduce((a, b) => a + b.value, 0);
  let newScore = roundStartScore - total;

  if (isBust) {
    newScore = roundStartScore;
  }

  // フィニッシュ判定
  if (newScore === 0 && !isBust) {
    const last = throws[throws.length - 1];

    if (!checkFinish(last)) {
      newScore = roundStartScore;
    } else {
      gameFinished = true;
      players[currentPlayer].score = 0;

      saveHistory(newScore);
      checkAwards(players[currentPlayer], throws, total);

      finishGame(players[currentPlayer]);
      return;
    }
  }

  players[currentPlayer].score = newScore;

  saveHistory(newScore);
  checkAwards(players[currentPlayer], throws, total);

  resetRound();
}

// -----------------------------
// 履歴保存
// -----------------------------
function saveHistory(newScore) {
  const entry = {
    playerIndex: currentPlayer,
    startScore: roundStartScore,
    throws: [...throws],
    endScore: newScore,
    bust: isBust
  };

  players[currentPlayer].history.push(entry);
  gameHistory.push(entry); // ★これが重要
}

// -----------------------------
// 終了処理
// -----------------------------
function finishGame(player) {
  sessionStorage.setItem("resultData", JSON.stringify(players));
  sessionStorage.setItem("winner", player.name);
  sessionStorage.setItem("startScore", player.startScore);
  window.location.href = "result.html";
}

// -----------------------------
// リセット
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
// フィニッシュ判定
// -----------------------------
function checkFinish(lastThrow) {
  if (outType === "single") return true;

  if (outType === "double") {
    return lastThrow.label.startsWith("D-") || lastThrow.label === "D-BULL";
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
// 80%スタッツ
// -----------------------------
function checkEightyStats() {
  const p = players[currentPlayer];
  if (p.eightyFixed) return;

  const removed = p.startScore - p.score;

  if (removed >= p.startScore * 0.8) {
    p.eightyFixed = true;
    p.eightyScore = p.score;
    p.eightyDarts = (round - 1) * 3 + throwIndex;
  }
}

// -----------------------------
// アワード
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

  const parts = labels.map(l => l.split("-"));

  const valid = parts.every(p =>
    p.length === 2 &&
    p[1] !== "BULL" &&
    p[1] !== "MISS" &&
    p[0] !== "S"
  );

  if (valid) {
    const sameBed = parts.every(p => p[0] === parts[0][0]);
    const sameNum = parts.every(p => p[1] === parts[0][1]);

    if (sameBed && sameNum) {
      player.awards.push("3 IN A BED");
    }
  }
}