// -----------------------------
// 変数
// -----------------------------
let players = [];          // { name, score }
let currentPlayer = 0;     // 今投げるプレイヤー
let round = 1;             // ラウンド数

let throws = [];           // 今のプレイヤーの3投
let throwIndex = 0;        // 何投目か（0〜2）
let multiplier = "s";      // s, d, t

let outType = "single";    // フィニッシュ方式 single / master / double
let separable = "yes";     // セパ or ファット

let roundStartScore = 0;   // このラウンド開始時のスコア
let isBust = false;        // このラウンドが Bust 状態かどうか

// -----------------------------
// 初期化（設定ページから読み込む）
// -----------------------------
window.onload = () => {
  const settings = JSON.parse(localStorage.getItem("settings01"));
  initGame(settings);
};

// -----------------------------
// ゲーム開始（設定反映）
// -----------------------------
function initGame(settings) {
  isBust = false;   // ★ これが必要
  players = settings.players.map(name => ({
    name: name,
    score: Number(settings.startScore),
    startScore: Number(settings.startScore), // ★追加
    roundScores: [], // ★追加：ラウンドごとの得点
    awards: []
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
// UI 更新：プレイヤー一覧
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


// -----------------------------
// UI 更新：ラウンド表示
// -----------------------------
function updateRoundDisplay() {
  document.getElementById("roundDisplay").textContent = "Round: " + round;
}

// -----------------------------
// UI 更新：1投目〜3投目
// -----------------------------
function updateThrowDisplay() {
  document.getElementById("t1").textContent =
    "1投目: " + (throws[0]?.label || "-");
  document.getElementById("t2").textContent =
    "2投目: " + (throws[1]?.label || "-");
  document.getElementById("t3").textContent =
    "3投目: " + (throws[2]?.label || "-");
}

// -----------------------------
// S / D / T 切り替え
// -----------------------------
function setMultiplier(m) {
  multiplier = m;
  updateNumberButtons();
}

// -----------------------------
// 数字ボタンの表示更新（S-1, D-1, T-1）
// -----------------------------
function updateNumberButtons() {
  const grid = document.getElementById("numberGrid");
  const prefix = multiplier.toUpperCase() + "-";

  [...grid.children].forEach((btn, index) => {
    const num = index + 1;
    btn.textContent = prefix + num;
  });
}

// -----------------------------
// スロー入力
// -----------------------------
function addThrow(base) {
  if (throwIndex >= 3) return;

  let value = base;
  let label = "";

  // --- 倍率処理 ---
  if (base <= 20) {
    if (multiplier === "d") value = base * 2;
    if (multiplier === "t") value = base * 3;
    label = multiplier.toUpperCase() + "-" + base;
  }
  // ブル
  else if (base === 25) {
    value = separable === "yes" ? 25 : 50;
    label = separable === "yes" ? "S-BULL" : "BULL";
  } else if (base === 50) {
    value = 50;
    label = "D-BULL";
  }
  // ミス
  else if (base === 0) {
    value = 0;
    label = "MISS";
  }

  // --- 仮スコア計算 ---
  const currentRoundTotal = throws.reduce((a, b) => a + b.value, 0);
  const tempScore = roundStartScore - (currentRoundTotal + value);

  // --- 即 Bust 判定（マイナス or 1点残り） ---
  if (tempScore < 0 || (outType !== "single" && tempScore === 1)) {
    isBust = true;

    // 投げた内容は記録（Back で戻せる）
    throws.push({ value, label });
    throwIndex++;

    // スコアはラウンド開始時に戻す
    players[currentPlayer].score = roundStartScore;

    updateThrowDisplay();
    updatePlayerArea();
    return;
  }

  // --- 正常入力 ---
  throws.push({ value, label });
  throwIndex++;

  // ★ 1投ごとにスコア更新
  const total = throws.reduce((a, b) => a + b.value, 0);
  players[currentPlayer].score = roundStartScore - total;

  updateThrowDisplay();
  updatePlayerArea();
}

// -----------------------------
// Back（取り消し）
// -----------------------------
function undo() {
  if (throwIndex === 0) return;

  throws.pop();
  throwIndex--;

  // Bust 状態解除
  isBust = false;

  // スコア再計算
  const total = throws.reduce((a, b) => a + b.value, 0);
  players[currentPlayer].score = roundStartScore - total;

  updateThrowDisplay();
  updatePlayerArea();
}

// -----------------------------
// Next ボタン（ターン終了）
// -----------------------------
function forceNext() {

  // Bust のときは MISS 補完しない
  if (!isBust) {
    while (throwIndex < 3) {
      addThrow(0);
      if (isBust) break;
    }
  }

  submitRound();

  // 次のプレイヤーへ
  currentPlayer++;

  // 全員投げたらラウンド進行
  if (currentPlayer >= players.length) {
    currentPlayer = 0;
    round++;
    updateRoundDisplay();
  }

  updatePlayerArea();
  startTurn();
}

// -----------------------------
// ラウンド処理（スコア更新）
// -----------------------------
function submitRound() {

  // Bust ラウンドならスコアは変えずに終了
  if (isBust) {
    resetRound();
    return;
  }

  const total = throws.reduce((a, b) => a + b.value, 0);
  const newScore = roundStartScore - total;

  // フィニッシュ判定
  if (newScore === 0) {
    const last = throws[throws.length - 1];

    if (!checkFinish(last)) {
      // フィニッシュエラー → スコア戻す
      players[currentPlayer].score = roundStartScore;
      resetRound();
      return;
    }

    // 正常フィニッシュ
    players[currentPlayer].score = 0;

    // ★ ラウンド得点を記録
    players[currentPlayer].roundScores.push(total);

    // ★ アワード判定
    checkAwards(players[currentPlayer], throws, total);

    updatePlayerArea();
    resetRound();

    // リザルトページへ遷移
    localStorage.setItem("resultData", JSON.stringify(players));
    localStorage.setItem("winner", players[currentPlayer].name);
    window.location.href = "result.html";
    return;

  }

  // 通常スコア更新
  players[currentPlayer].score = newScore;

  // ★ ラウンド得点を記録
  players[currentPlayer].roundScores.push(total);

  // ★ アワード判定
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
// ターン開始（UI更新）
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

function checkAwards(player, throws, roundScore) {
  // TON80
  if (roundScore === 180) {
    player.awards.push("TON80");
  } else if (roundScore >= 151) {
    player.awards.push("HIGH TON");
  } else if (roundScore >= 100) {
    player.awards.push("LOW TON");
  }

  const labels = throws.map(t => t.label);

  // HAT TRICK（BULL×3）
  if (labels.every(l => l === "S-BULL" || l === "D-BULL")) {
    player.awards.push("HAT TRICK");
  }

  // THREE IN THE BLACK（D-BULL×3）
  if (labels.every(l => l === "D-BULL")) {
    player.awards.push("THREE IN THE BLACK");
  }

  // 3 IN A BED（同じナンバー & 同じ倍率 ×3、BULL除外）
  const parts = labels.map(l => l.split("-")); // ["S","20"] みたいな形
  const allNormalNumber =
    parts.every(p => p[1] !== "BULL" && p[1] !== "MISS" && p[0] !== "S" && p[1] !== undefined);

  if (allNormalNumber) {
    const sameBed =
      parts[0][0] === parts[1][0] &&
      parts[1][0] === parts[2][0]; // S/D/T が同じ
    const sameNum =
      parts[0][1] === parts[1][1] &&
      parts[1][1] === parts[2][1]; // 番号が同じ

    if (sameBed && sameNum) {
      player.awards.push("3 IN A BED");
    }
  }
}


