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
let eightyResult = null; // グローバル追加
let gameEightyFixed = false;
let gameEightyTriggerPlayer = null;
let gameEightyRound = null;
let playerRoundsAtEighty = [];

let throwHistory = [];
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

    eightyRound: null // ★追加（その人の到達ラウンド）
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
  throwHistory = [];
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

  // snapshot before the throw so undo can restore exact state
  throwHistory.push({
    throws: [...throws],
    throwIndex,
    score: players[currentPlayer].score,
    roundStartScore,
    isBust,
    gameFinished
  });

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
  players[currentPlayer].lastRound = round;
}

// -----------------------------
// Undo
// -----------------------------
function undo() {

  let tmplast;
  // ラウンド内
  if (throwIndex > 0) {
    if (throwHistory.length > 0) {
      const snap = throwHistory.pop();
      throws = [...snap.throws];
      throwIndex = snap.throwIndex;
      players[currentPlayer].score = snap.score;
      roundStartScore = snap.roundStartScore;
      isBust = snap.isBust;
      gameFinished = snap.gameFinished;
    } else {
      const player = players[currentPlayer];
      const th = throws.pop();
      throwIndex--;
      player.score += th.value;
      isBust = false;
      gameFinished = false;
      roundStartScore = player.score + throws.reduce((sum, t) => sum + t.value, 0);
    }
  } else {

    if (gameHistory.length === 0) return;

    const last = gameHistory.pop();
    tmplast = last;
    const player = players[last.playerIndex];

    // ★ここ追加
    if (last.awards && last.awards.length > 0) {
      player.awards.splice(-last.awards.length);
    }

    // ★プレイヤーも戻す
    currentPlayer = last.playerIndex;

    player.history.pop();

    // throws復元
    throws = [...last.throws];
    throwIndex = throws.length;

    // score復元: 前のラウンド状態を復元するので終了時のスコアに戻す
    player.score = last.endScore;
    roundStartScore = last.startScore;
    isBust = false;
    gameFinished = false;
    multiplier = "s";

    // restore throw snapshots for the restored round so further undo works correctly
    if (last.throwHistory && last.throwHistory.length > 0) {
      throwHistory = last.throwHistory.map(snapshot => ({
        throws: [...snapshot.throws],
        throwIndex: snapshot.throwIndex,
        score: snapshot.score,
        roundStartScore: snapshot.roundStartScore,
        isBust: snapshot.isBust,
        gameFinished: snapshot.gameFinished
      }));
    } else {
      throwHistory = [];
      let scoreAt = last.startScore;
      for (let i = 0; i < last.throws.length; i++) {
        throwHistory.push({
          throws: last.throws.slice(0, i),
          throwIndex: i,
          score: scoreAt,
          roundStartScore: last.startScore,
          isBust: false,
          gameFinished: false
        });
        scoreAt -= last.throws[i].value;
      }
    }

    // ラウンド調整
    round = last.round;

    // undo内（ラウンド戻し時）
    if (last.eighty) {

      gameEightyFixed = false;
      gameEightyRound = null;
      gameEightyTriggerPlayer = null;

      players.forEach(p => {
        p.eightyFixed = false;
        p.eightyScore = 0;
        p.eightyRound = null; // ★追加
      });
    }

    gameFinished = false;
  }

  if (tmplast) {
    roundStartScore = tmplast.startScore;
  }

  if (throws.length > 0 && !isBust) {
    const computedStart = players[currentPlayer].score + throws.reduce((sum, t) => sum + t.value, 0);
    if (roundStartScore !== computedStart) {
      roundStartScore = computedStart;
    }
  }

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

      const earnedAwards = checkAwards(players[currentPlayer], throws, total);

      // ★ここ追加
      const eighty = handleEightyAtRoundEnd(
        players[currentPlayer],
        roundStartScore,
        newScore
      );

      eightyResult = eighty;

      saveHistory(roundStartScore - total, earnedAwards);
      
      finishGame(players[currentPlayer]);
      return;
    }
  }

  players[currentPlayer].score = newScore;
  const earnedAwards = checkAwards(players[currentPlayer], throws, total);

  // ★ここ追加
  const eighty = handleEightyAtRoundEnd(
    players[currentPlayer],
    roundStartScore,
    newScore
  );

  eightyResult = eighty;

  saveHistory(roundStartScore - total, earnedAwards);

  resetRound();
}

// -----------------------------
// 履歴保存
// -----------------------------
function saveHistory(newScore, awards) {
  const entry = {
    round,
    playerIndex: currentPlayer,
    startScore: roundStartScore,
    throws: [...throws],
    throwIndex,
    throwHistory: throwHistory.map(snapshot => ({
      throws: [...snapshot.throws],
      throwIndex: snapshot.throwIndex,
      score: snapshot.score,
      roundStartScore: snapshot.roundStartScore,
      isBust: snapshot.isBust,
      gameFinished: snapshot.gameFinished
    })),
    endScore: newScore,
    bust: isBust,
    awards: awards || [],
    eighty: eightyResult // ★追加
  };

  players[currentPlayer].history.push(entry);
  gameHistory.push(entry);

  eightyResult = null; // ★リセット重要
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
  throwHistory = [];

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
function handleEightyAtRoundEnd(player, roundStartScore, newScore) {

  if (gameEightyFixed) return null;
  if (isBust) return null;

  const threshold = player.startScore * 0.8;

  const startRemoved = player.startScore - roundStartScore;
  const endRemoved = player.startScore - newScore;

  if (startRemoved < threshold && endRemoved >= threshold) {

    gameEightyFixed = true;
    gameEightyRound = round;
    gameEightyTriggerPlayer = currentPlayer;

    // ★ここが重要（プレイヤーごとに保存）
    players.forEach(p => {

      p.eightyFixed = true;
      p.eightyScore = p.score;

      // ★各プレイヤーの「到達ラウンド」を固定
      if (p === player) {
        p.eightyRound = round;
      } else {
        p.eightyRound = round - (currentPlayer - players.indexOf(p));
      }
    });

    return {
      fixed: true,
      round: round,
      triggerPlayer: currentPlayer
    };
  }

  return null;
}

// -----------------------------
// アワード
// -----------------------------
function checkAwards(player, throws, roundScore) {
  const earned = [];

  if (roundScore === 180) {
    earned.push("TON80");
  } else if (roundScore >= 151) {
    earned.push("HIGH TON");
  } else if (roundScore >= 100) {
    earned.push("LOW TON");
  }

  const labels = throws.map(t => t.label);

  if (labels.every(l => l === "S-BULL" || l === "D-BULL")) {
    earned.push("HAT TRICK");
  }

  if (labels.every(l => l === "D-BULL")) {
    earned.push("THREE IN THE BLACK");
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
      earned.push("3 IN A BED");
    }
  }

  // ここでまとめて追加
  player.awards.push(...earned);

  return earned; // ★追加
}