window.onload = () => {
  const players = JSON.parse(localStorage.getItem("resultData"));
  const winner = localStorage.getItem("winner");

  document.getElementById("winnerName").textContent = `${winner} WIN!`;

  const container = document.getElementById("playerResults");

  players.forEach(p => {
    const card = document.createElement("div");
    card.className = "playerCard";

    const stats = calcEightyPercentStats(p);                   // ★ PPR（1ラウンド平均）
    const rating = calcRatingFromStats(stats);
    const awards = summarizeAwards(p.awards);

    card.innerHTML = `
      <h3>${p.name}</h3>
      <div>Score: ${p.score}</div>
      <div>Stats: ${stats}</div>
      <div>Rating: ${rating}</div>
      <div class="award">Awards:<br>${awards}</div>
    `;

    container.appendChild(card);
  });
};
function getEightyPercentRound(player) {
  const target = player.startScore * 0.8;
  let total = 0;

  for (let i = 0; i < player.roundScores.length; i++) {
    total += player.roundScores[i];
    if (total >= target) {
      return i + 1; // ラウンド番号
    }
  }
  return player.roundScores.length; // 未到達なら最終ラウンド
}
function calcEightyPercentStats(player) {
  const r = getEightyPercentRound(player);
  const total = player.roundScores.slice(0, r).reduce((a,b)=>a+b,0);
  return (total / r).toFixed(2);
}

function calcRatingFromStats(stats) {
  const s = Number(stats);
  if (isNaN(s)) return "-";

  if (s < 40) {
    return 1;
  } else if (s < 95) {
    return ((s - 30) / 5).toFixed(1);
  } else {
    return ((s - 4) / 7).toFixed(1);
  }
}

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

