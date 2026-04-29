// -----------------------------
// データ取得
// -----------------------------
const players = JSON.parse(sessionStorage.getItem("resultData"));
const winner = sessionStorage.getItem("winner");
const totalRounds = Number(sessionStorage.getItem("totalRounds"));

// -----------------------------
// 勝者表示
// -----------------------------
document.getElementById("winner").textContent = `${winner} WIN!`;

// -----------------------------
// MPR（Marks Per Round）
// -----------------------------
function calcMPR(player) {
  if (!player.eightyMarks || !player.eightyRounds || player.eightyRounds === 0) return "0.00";

  const total = player.eightyMarks;
  const rounds = player.eightyRounds;

  return (total / rounds).toFixed(2);
}

// -----------------------------
// アワード集計
// -----------------------------
function summarizeAwards(awards) {
  if (!awards || awards.length === 0) return "-";

  const map = {};
  awards.forEach(a => {
    map[a] = (map[a] || 0) + 1;
  });

  return Object.entries(map)
    .map(([name, count]) => `${name} × ${count}`)
    .join("<br>");
}

// -----------------------------
// リザルト描画
// -----------------------------
const container = document.getElementById("resultArea");

players.forEach(p => {
  const card = document.createElement("div");
  card.className = "playerCard";

  const mpr = calcMPR(p);
  const awards = summarizeAwards(p.awards);

  card.innerHTML = `
    <h3>${p.name}</h3>
    <div>MPR: ${mpr}</div>
    <div class="award">Awards:<br>${awards}</div>
  `;

  container.appendChild(card);
});
