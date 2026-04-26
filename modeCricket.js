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
    awards: []        // ★追加
  }));

  currentPlayer = 0;
  round = 1;
  gameFinished = false;
  eightyFixed = false;

  updateRoundDisplay();
  updateThrowDisplay();
  updateCricketBoard();
  startTurn();
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

  // ★ この時点の各プレイヤーの総マーク数とラウンドを保存
  players.forEach(p => {
    p.eightyMarks = getTotalMarks(p);
    p.eightyRounds = round;
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

  // ★ 前回までのオーバー分と今回のオーバー分の差分だけを使う
  const prevOver = Math.max(0, before - 3);
  const newOver  = Math.max(0, after  - 3);
  const overflow = newOver - prevOver;

  // マーク更新（3で止めない）
  p.marks[target] = after;

  let gainedScore = 0;

  if (overflow > 0) {
    const base = target === "BULL" ? 25 : Number(target);

    if (gameType === "standard") {

      if (players.length === 1) {
        // 1人プレイは常に得点OK
        gainedScore = overflow * base;
        p.score += gainedScore;

      } else {
        const othersClosed = players
          .filter((_, idx) => idx !== currentPlayer)
          .every(pl => pl.marks[target] >= 3);

        if (!othersClosed) {
          gainedScore = overflow * base;
          p.score += gainedScore;
        }
      }

    } else {
      // Cutthroat
      players.forEach((pl, idx) => {
        if (idx !== currentPlayer && pl.marks[target] < 3) {
          const s = overflow * base;
          pl.score += s;
        }
      });
    }
  }

  // スロー記録
  throws.push({
    label,
    mark,
    target,
    scoreDelta: gainedScore
  });

  throwIndex++;
  updateThrowDisplay();
  updateCricketBoard();

  checkAwardsCricket(players[currentPlayer], throws);

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
  if (throwIndex === 0) return;

  const last = throws.pop();
  throwIndex--;

  const p = players[currentPlayer];

  // 得点を戻す
  if (last.scoreDelta) {
    p.score -= last.scoreDelta;
  }

  // マークを戻す
  if (last.target) {
    p.marks[last.target] -= last.mark;
    if (p.marks[last.target] < 0) p.marks[last.target] = 0;
  }

  updateThrowDisplay();
  updateCricketBoard();

  // Undo したので、終了フラグは再評価が必要
  gameFinished = false;
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

  updateThrowDisplay();
}

// -----------------------------
// 勝利判定
// -----------------------------
function checkWinner() {
  for (let i = 0; i < players.length; i++) {
    const p = players[i];
    const allClosed = Object.values(p.marks).every(m => m >= 3);
    if (!allClosed) continue;

    const scoreOK = players.every(other => p.score >= other.score);
    if (scoreOK) return i;
  }
  return -1;
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
  const labels = throws.map(t => t.label);
  const targets = throws.map(t => t.target);
  const marks = throws.map(t => t.mark);

  const totalMarks = marks.reduce((a, b) => a + b, 0);

  // -----------------------------
  // WHITE HORSE（T ×3、異なるナンバー、未クローズ）
  // -----------------------------
  const isAllTriple = labels.every(l => l.startsWith("T-"));
  const uniqueTargets = [...new Set(targets)];

  const allOpen = uniqueTargets.every(num => {
    if (!num) return false;
    return player.marks[num] < 3;
  });

  if (
    isAllTriple &&
    uniqueTargets.length === 3 &&
    allOpen
  ) {
    player.awards.push("WHITE HORSE");
  }

  // -----------------------------
  // HAT TRICK（BULL ×3）
  // -----------------------------
  if (labels.every(l => l === "S-BULL" || l === "D-BULL")) {
    player.awards.push("HAT TRICK");
  }

  // -----------------------------
  // THREE IN THE BLACK（D-BULL ×3）
  // -----------------------------
  if (labels.every(l => l === "D-BULL")) {
    player.awards.push("THREE IN THE BLACK");
  }

  // -----------------------------
  // 3 IN A BED（同じナンバー × 同じ倍率 ×3）
  // -----------------------------
  const parts = labels.map(l => l.split("-"));

  const validBed = parts.every(p =>
    p.length === 2 &&
    p[1] !== "BULL" &&
    p[1] !== "MISS"
  );

  if (validBed) {
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

  // -----------------------------
  // MARK 系（5〜9 MARK）
  // -----------------------------
  if (totalMarks >= 5) {
    player.awards.push(`${totalMarks} MARK`);
  }
}
