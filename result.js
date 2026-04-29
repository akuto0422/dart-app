const players = JSON.parse(sessionStorage.getItem("resultData"));
const winner = sessionStorage.getItem("winner");
const startScore = Number(sessionStorage.getItem("startScore"));

document.getElementById("winnerName").textContent = `${winner} WIN!`;

function calcFinalStats(player) {
  const total = player.history.map((h)=>h['throws'].reduce((a,b)=>a+b.value,0)).reduce((a,b)=>a+b,0);
  const rounds = player.history.length;
  if (rounds === 0) return "0.00";
  return (total / rounds).toFixed(2);
}

function calcEightyStats(player) {
  if (!player.eightyFixed || !player.eightyRound) return "-";

  const removed = player.startScore - player.eightyScore;
  const rounds = player.history.slice(0,player.eightyRound).filter((h)=>h['bust'] === false).length;


  return (removed / rounds).toFixed(2);
}

function summarizeAwards(awards) {
  if (!awards || awards.length === 0) return "-";
  const map = {};
  awards.forEach(a => { map[a] = (map[a] || 0) + 1; });
  return Object.entries(map)
    .map(([name, count]) => `${name} × ${count}`)
    .join("<br>");
}

const container = document.getElementById("playerResults");

players.forEach(p => {
  const card = document.createElement("div");
  card.className = "playerCard";

  const finalStats = calcFinalStats(p);
  const eightyStats = calcEightyStats(p);
  const awards = summarizeAwards(p.awards);

  card.innerHTML = `
    <h3>${p.name}</h3>
    <div>Score: ${p.score}</div>
    <div>Final Stats: ${finalStats}</div>
    <div>80% Stats: ${eightyStats}</div>
    <div class="award">Awards:<br>${awards}</div>
  `;

  container.appendChild(card);
});
