// -----------------------------
// 変数
// -----------------------------
let players = [];          
let currentPlayer = 0;     
let round = 1;             
let throws = [];           
let throwIndex = 0;        
let gameType = "standard";  // ★ Standard / Cutthroat
let turnStartMarks = [];
let turnStartScores = [];
let turnStartTotalMarks = [];
let throwHistory = [];
let turnHistory = [];

// ★ 追加：ゲーム終了フラグ & 80%スタッツ用フラグ
let gameFinished = false;
let eightyFixed = false; // 誰かが6ナンバーオープンしたかどうか

const CRICKET_NUMBERS = [15, 16, 17, 18, 19, 20, "BULL"];

// -----------------------------
// 初期化
// -----------------------------
window.onload = () => {
  const settings = JSON.parse(sessionStorage.getItem("settingsCricket"));
  gameType = settings.gameType || "standard";
  initGame(settings);
};

// -----------------------------
// ゲーム開始
// -----------------------------
function initGame(settings) {
  players = settings.players.map(name => ({
    name: name,
    score: 0,
    marks: {
      15: 0,
      16: 0,
      17: 0,
      18: 0,
      19: 0,
      20: 0,
      BULL: 0
    },
    // ★ 80%スタッツ用スナップショット
    eightyMarks: 0,   // 6ナンバーオープン時点までの総マーク数
    eightyRounds: 0,   // その時点のラウンド
    awards: [],        // ★追加
    history: [],
    marksByRound: [],
    lastRoundCompleted: 0
  }));

  currentPlayer = 0;
  round = 1;
  throws = [];
  throwIndex = 0;
  throwHistory = [];
  turnHistory = [];
  gameFinished = false;
  eightyFixed = false;

  updateRoundDisplay();
  updateThrowDisplay();
  updateCricketBoard();
  startTurn();
}

function cloneHistoryEntry(entry) {
  return {
    round: entry.round,
    playerIndex: entry.playerIndex,
    throws: entry.throws.map(t => ({ ...t })),
    scoreBefore: entry.scoreBefore,
    scoreAfter: entry.scoreAfter,
    marksBefore: { ...entry.marksBefore },
    marksAfter: { ...entry.marksAfter },
    marksThisRound: entry.marksThisRound ?? entry.marksThisTurn,
    awards: [...entry.awards]
  };
}

function clonePlayerState(player) {
  return {
    name: player.name,
    score: player.score,
    marks: { ...player.marks },
    eightyMarks: player.eightyMarks,
    eightyRounds: player.eightyRounds,
    awards: [...player.awards],
    history: player.history.map(cloneHistoryEntry),
    marksByRound: [...player.marksByRound],
    lastRoundCompleted: player.lastRoundCompleted
  };
}

function cloneSnapshotState(state) {
  return {
    currentPlayer: state.currentPlayer,
    round: state.round,
    throws: state.throws.map(t => ({ ...t })),
    throwIndex: state.throwIndex,
    players: state.players.map(clonePlayerState),
    gameFinished: state.gameFinished,
    eightyFixed: state.eightyFixed,
    throwHistory: state.throwHistory ? state.throwHistory.map(cloneSnapshotState) : []
  };
}

function snapshotThrowState() {
  throwHistory.push(cloneSnapshotState({
    currentPlayer,
    round,
    throws,
    throwIndex,
    players,
    gameFinished,
    eightyFixed,
    throwHistory: throwHistory.map(cloneSnapshotState)
  }));
}

function restoreGameState(state) {
  currentPlayer = state.currentPlayer;
  round = state.round;
  throws = state.throws.map(t => ({ ...t }));
  throwIndex = state.throwIndex;
  players = state.players.map(player => ({
    name: player.name,
    score: player.score,
    marks: { ...player.marks },
    eightyMarks: player.eightyMarks,
    eightyRounds: player.eightyRounds,
    awards: [...player.awards],
    history: player.history.map(cloneHistoryEntry),
    marksByRound: [...player.marksByRound],
    lastRoundCompleted: player.lastRoundCompleted
  }));
  gameFinished = state.gameFinished;
  eightyFixed = state.eightyFixed;
  throwHistory = state.throwHistory ? state.throwHistory.map(cloneSnapshotState) : [];
}

function snapshotCompletedTurnState() {
  turnHistory.push({
    currentPlayer,
    round,
    throws: throws.map(t => ({ ...t })),
    throwIndex,
    players: players.map(clonePlayerState),
    gameFinished,
    eightyFixed,
    throwHistory: throwHistory.map(cloneSnapshotState)
  });
}

// -----------------------------
// UI：ラウンド表示
// -----------------------------
function updateRoundDisplay() {
  document.getElementById("roundDisplay").textContent = "Round: " + round;
}

// -----------------------------
// UI：1投目〜3投目
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
// プレイヤーの総マーク数
// -----------------------------
function getTotalMarks(p) {
  return CRICKET_NUMBERS.reduce((sum, num) => sum + p.marks[num], 0);
}

// -----------------------------
// 80%スタッツ確定チェック
// （誰かが6ナンバーオープンした瞬間に一度だけスナップショット）
// -----------------------------
function checkEightyStats() {
  if (eightyFixed) return;

  const someoneSixOpened = players.some(p => {
    let opened = 0;
    CRICKET_NUMBERS.forEach(num => {
      if (p.marks[num] >= 3) opened++;
    });
    return opened >= 6;
  });

  if (!someoneSixOpened) return;

  // ★ この時点の各プレイヤーのスタッツ対象マーク数とラウンド数を保存
  players.forEach((p, idx) => {
    const baseMarks = p.marksByRound.slice(1, round).reduce((sum, v) => sum + (v || 0), 0);
    const hasPlayedThisRound = p.lastRoundCompleted >= round || idx === currentPlayer;

    if (hasPlayedThisRound) {
      p.eightyMarks = getTotalMarks(p);
      p.eightyRounds = round;
    } else {
      p.eightyMarks = baseMarks;
      p.eightyRounds = round - 1;
    }
  });

  eightyFixed = true;
}

// -----------------------------
// スロー入力
// -----------------------------
function addThrow(label) {
  // ★ ゲーム終了後は入力させない
  if (gameFinished) return;

  if (throwIndex >= 3) return;

  snapshotThrowState();

  const p = players[currentPlayer];
  const [bed, num] = label.split("-");
  let mark = bed === "D" ? 2 : bed === "T" ? 3 : 1;

  let target = num;
  if (num === "BULL" && bed === "T") mark = 2;

  // -----------------------------
  // クローズされたナンバーは MISS 扱い
  // -----------------------------
  let allClosed = false;

  // 2人以上のときだけクローズ判定を行う
  if (players.length >= 2) {
    allClosed = players.every(pl => pl.marks[target] >= 3);
  }

  if (allClosed) {
    throws.push({ label: "MISS", mark: 0, target: null, scoreDelta: 0 });
    throwIndex++;
    updateThrowDisplay();
    return;
  }

  const before = p.marks[target];
  const after  = before + mark;
  const appliedMarks = Math.min(mark, Math.max(0, 3 - before));

  // ★ 前回までのオーバー分と今回のオーバー分の差分だけを使う
  const prevOver = Math.max(0, before - 3);
  const newOver  = Math.max(0, after  - 3);
  const overflow = newOver - prevOver;

  // マーク更新（3で止めない）
  p.marks[target] = after;

  let gainedScore = 0;
  let scoreChanges = [];

  if (overflow > 0) {
    const base = target === "BULL" ? 25 : Number(target);

    if (gameType === "standard") {

      if (players.length === 1) {
        // 1人プレイは常に得点OK
        gainedScore = overflow * base;
        p.score += gainedScore;
        scoreChanges.push({ playerIndex: currentPlayer, delta: gainedScore });

      } else {
        const othersClosed = players
          .filter((_, idx) => idx !== currentPlayer)
          .every(pl => pl.marks[target] >= 3);

        if (!othersClosed) {
          gainedScore = overflow * base;
          p.score += gainedScore;
          scoreChanges.push({ playerIndex: currentPlayer, delta: gainedScore });
        }
      }

    } else {
      // Cutthroat
      players.forEach((pl, idx) => {
        if (idx !== currentPlayer && pl.marks[target] < 3) {
          const s = overflow * base;
          pl.score += s;
          scoreChanges.push({ playerIndex: idx, delta: s });
        }
      });
    }
  }

  // スロー記録
  throws.push({
    label,
    mark,
    target,
    appliedMarks,
    scoreDelta: gainedScore,
    scoreChanges
  });

  throwIndex++;
  updateThrowDisplay();
  updateCricketBoard();

  // ★ 80%スタッツ確定チェック（誰かが6ナンバーオープンしたか）
  checkEightyStats();

  // ★ ゲーム終了条件チェック
  checkGameFinishedAfterThrow();
}

// -----------------------------
// ゲーム終了条件チェック
// -----------------------------
function checkGameFinishedAfterThrow() {
  // すでに終了していたら何もしない
  if (gameFinished) return;

  if (players.length === 1) {
    // 1人プレイ：全ナンバーオープンで終了
    const p = players[0];
    const allOpened = CRICKET_NUMBERS.every(num => p.marks[num] >= 3);
    if (allOpened) {
      gameFinished = true;
    }
  } else {
    // 複数人：勝利確定したら終了
    const winnerIndex = checkWinner();
    if (winnerIndex !== -1) {
      gameFinished = true;
    }
  }
}

// -----------------------------
// Undo
// -----------------------------
function undo() {
  if (throwIndex > 0) {
    if (throwHistory.length > 0) {
      const prevState = throwHistory.pop();
      restoreGameState(prevState);
      updateRoundDisplay();
      updateThrowDisplay();
      updateCricketBoard();
      return;
    }

    const lastThrow = throws[throws.length - 1];
    if (lastThrow && lastThrow.label === "MISS") {
      throws.pop();
      throwIndex--;
      updateThrowDisplay();
      updateCricketBoard();
      return;
    }
  }

  if (turnHistory.length === 0) return;

  const prevState = turnHistory.pop();
  restoreGameState(prevState);

  updateRoundDisplay();
  updateThrowDisplay();
  updateCricketBoard();
}

// -----------------------------
// Next（ターン終了）
// -----------------------------
function forceNext() {
  submitTurn();

  const winnerIndex = checkWinner();
  if (winnerIndex !== -1) {
    const winner = players[winnerIndex];
    sessionStorage.setItem("resultData", JSON.stringify(players));
    sessionStorage.setItem("winner", winner.name);
    sessionStorage.setItem("totalRounds", round);
    window.location.href = "cricket_result.html";
    return;
  }

  currentPlayer++;

  // ★ プレイヤー全員が投げ終わったらラウンド進行
  if (currentPlayer >= players.length) {
    currentPlayer = 0;

    // ★ 20ラウンド制限
    if (round >= 20) {
      // 20ラウンド終了 → 強制的にゲーム終了
      const winnerIndex = checkWinner();
      const winner = winnerIndex !== -1 ? players[winnerIndex] : players[0]; 
      // ※勝者がいない場合は Player1 を勝者扱い（必要なら変更可）

      sessionStorage.setItem("resultData", JSON.stringify(players));
      sessionStorage.setItem("winner", winner.name);
      sessionStorage.setItem("totalRounds", round);
      window.location.href = "cricket_result.html";
      return;
    }

    round++;
    updateRoundDisplay();
  }

  updateCricketBoard();
  startTurn();
}


// -----------------------------
// ターン終了
// -----------------------------
function submitTurn() {
  if (throwIndex < 3) {
    while (throwIndex < 3) {
      throws.push({
        label: "MISS",
        mark: 0,
        target: null,
        appliedMarks: 0,
        scoreDelta: 0,
        scoreChanges: []
      });
      throwIndex++;
    }
  }

  const player = players[currentPlayer];
  const awardsEarned = checkAwardsCricket(player, throws);
  if (awardsEarned.length > 0) {
    player.awards.push(...awardsEarned);
  }

  const currentTotalMarks = getTotalMarks(player);
  const marksThisTurn = currentTotalMarks - turnStartTotalMarks[currentPlayer];
  player.marksByRound[round] = marksThisTurn;
  player.lastRoundCompleted = round;

  player.history.push({
    round,
    playerIndex: currentPlayer,
    throws: throws.map(t => ({ ...t })),
    scoreBefore: turnStartScores[currentPlayer],
    scoreAfter: player.score,
    marksBefore: { ...turnStartMarks[currentPlayer] },
    marksAfter: { ...player.marks },
    marksThisTurn,
    awards: [...awardsEarned]
  });

  snapshotCompletedTurnState();
  resetTurn();
}

// -----------------------------
// ターンリセット
// -----------------------------
function resetTurn() {
  throws = [];
  throwIndex = 0;
  updateThrowDisplay();
}

// -----------------------------
// ターン開始
// -----------------------------
function startTurn() {
  turnStartMarks = players.map(p => ({ ...p.marks }));
  turnStartScores = players.map(p => p.score);
  turnStartTotalMarks = players.map(p => getTotalMarks(p));
  throwHistory = [];

  updateThrowDisplay();
}

// -----------------------------
// 勝利判定
// -----------------------------
function checkWinner() {
  const closedPlayers = players.filter(p => Object.values(p.marks).every(m => m >= 3));
  if (closedPlayers.length === 0) return -1;

  if (gameType === "standard") {
    const maxScore = Math.max(...closedPlayers.map(p => p.score));
    const winnerCandidates = closedPlayers.filter(p => p.score === maxScore);
    if (winnerCandidates.length !== 1) return -1;

    const winner = winnerCandidates[0];
    const scoreHigherThanOthers = players.every(other =>
      other === winner || winner.score > other.score
    );
    return scoreHigherThanOthers ? players.indexOf(winner) : -1;
  }

  // Cutthroat
  const minScore = Math.min(...closedPlayers.map(p => p.score));
  const winnerCandidates = closedPlayers.filter(p => p.score === minScore);
  if (winnerCandidates.length !== 1) return -1;

  const winner = winnerCandidates[0];
  const scoreLowerThanOthers = players.every(other =>
    other === winner || winner.score < other.score
  );
  return scoreLowerThanOthers ? players.indexOf(winner) : -1;
}

// -----------------------------
// クリケットボード
// -----------------------------
function updateCricketBoard() {
  const board = document.getElementById("cricketBoard");
  board.innerHTML = "";

  const numbers = [20,19,18,17,16,15,"BULL"];

  const closedNumbers = {};
  numbers.forEach(num => {
    if (players.length === 1) {
      closedNumbers[num] = false;
      return;
    }
    closedNumbers[num] = players.every(p => p.marks[num] >= 3);
  });

  const header = document.createElement("div");
  header.className = "cricketHeaderRow";

  header.appendChild(makeHeaderCell("Player"));
  header.appendChild(makeHeaderCell("Score"));

  numbers.forEach(num => {
    const cell = makeHeaderCell(num);
    if (closedNumbers[num]) cell.classList.add("closedCol");
    header.appendChild(cell);
  });

  board.appendChild(header);

  players.forEach((p, i) => {
    const row = document.createElement("div");
    row.className = "cricketRow";
    if (i === currentPlayer) row.classList.add("active");

    const nameCell = document.createElement("div");
    nameCell.className = "cricketName";
    nameCell.textContent = p.name;
    row.appendChild(nameCell);

    const scoreCell = document.createElement("div");
    scoreCell.className = "cricketScore";
    scoreCell.textContent = p.score;
    row.appendChild(scoreCell);

    numbers.forEach(num => {
      const cell = document.createElement("div");
      cell.className = "cricketCell";
      cell.textContent = markSymbol(p.marks[num]);

      if (closedNumbers[num]) cell.classList.add("closedCol");

      row.appendChild(cell);
    });

    board.appendChild(row);
  });
}

function makeHeaderCell(text) {
  const div = document.createElement("div");
  div.className = "cricketHeader";
  div.textContent = text;
  return div;
}

function markSymbol(n) {
  if (n >= 3) return "○";
  if (n === 2) return "X";
  if (n === 1) return "/";
  return "";
}

// これは今は使っていないが、残しておくなら marks を3で止めないように注意
function addThrowLite(label) {
  const p = players[currentPlayer];
  const [bed, num] = label.split("-");
  let mark = bed === "D" ? 2 : bed === "T" ? 3 : 1;

  let target = num;
  if (num === "BULL" && bed === "T") mark = 2;

  const before = p.marks[target];
  const after = before + mark;
  p.marks[target] = after;

  throws.push({ label, mark, target });
  throwIndex++;
}

function checkAwardsCricket(player, throws) {
  const earned = [];
  const labels = throws.map(t => t.label);
  const targets = throws.map(t => t.target);
  const marks = throws.map(t => t.mark);

  const totalMarks = marks.reduce((a, b) => a + b, 0);

  // -----------------------------
  // WHITE HORSE（T ×3、異なるナンバー、かつ各トリプルが有効に3マーク分入っている）
  // -----------------------------
  if (throws.length >= 3) {
    const validTriples = throws.filter(t =>
      t.label.startsWith("T-") &&
      t.appliedMarks === 3
    );

    const uniqueTripleTargets = [...new Set(validTriples.map(t => t.target))];

    if (
      validTriples.length >= 3 &&
      uniqueTripleTargets.length >= 3
    ) {
      earned.push("WHITE HORSE");
    }

    // -----------------------------
    // HAT TRICK（BULL ×3）
    // -----------------------------
    if (labels.length >= 3 && labels.every(l => l === "S-BULL" || l === "D-BULL")) {
      earned.push("HAT TRICK");
    }

    // -----------------------------
    // THREE IN THE BLACK（D-BULL ×3）
    // -----------------------------
    if (labels.length >= 3 && labels.every(l => l === "D-BULL")) {
      earned.push("THREE IN THE BLACK");
    }

    // -----------------------------
    // 3 IN A BED（同じナンバー × 同じ倍率 ×3）
    // -----------------------------
    const parts = labels.map(l => l.split("-"));

    const validBed = parts.length >= 3 && parts.every(p =>
      p.length === 2 &&
      p[1] !== "BULL" &&
      p[1] !== "MISS" &&
      p[1] !== "0" && 
      p[0] !== "S"
    );

    if (validBed) {
      const sameBed =
        parts[0][0] === parts[1][0] &&
        parts[1][0] === parts[2][0];

      const sameNum =
        parts[0][1] === parts[1][1] &&
        parts[1][1] === parts[2][1];

      if (sameBed && sameNum) {
        earned.push("3 IN A BED");
      }
    }
  }

  // -----------------------------
  // MARK 系（5〜9 MARK）
  // -----------------------------
  if (totalMarks >= 5) {
    earned.push(`${totalMarks} MARK`);
  }

  return earned;
}
