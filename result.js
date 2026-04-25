window.onload = () => {
  const players = JSON.parse(localStorage.getItem("resultData"));
  const winner = localStorage.getItem("winner");

  document.getElementById("winnerName").textContent = `${winner} WIN!`;

  const container = document.getElementById("playerResults");

  players.forEach(p => {
    const card = document.createElement("div");
    card.className = "playerCard";

    const darts = p.darts || 0;
    const ppd = darts > 0 ? (301 / darts).toFixed(2) : "-";
    const awards = p.awards?.length ? p.awards.join(", ") : "-";
    const rating = p.rating || "-";

    // card.innerHTML = `
    //   <h3>${p.name}</h3>
    //   <div>Score: ${p.score}</div>
    //   <div>Darts: ${darts}</div>
    //   <div>PPD: ${ppd}</div>
    //   <div class="award">Awards: ${awards}</div>
    //   <div>Rating: ${rating}</div>
    // `;

    card.innerHTML = `
      <h3>${p.name}</h3>
      <div>Score: ${p.score}</div>
      <div>Darts: 未実装</div>
      <div>PPD: 未実装</div>
      <div class="award">Awards: 未実装</div>
      <div>Rating: 未実装</div>
    `;

    container.appendChild(card);
  });
};
