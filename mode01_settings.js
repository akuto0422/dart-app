let playerCount = 1;

window.onload = () => {
  updatePlayerInputs();
};

function changePlayerCount(delta) {
  playerCount += delta;

  if (playerCount < 1) playerCount = 1;
  if (playerCount > 10) playerCount = 10;

  document.getElementById("playerCount").textContent = playerCount;

  updatePlayerInputs();
}

function updatePlayerInputs() {
  const container = document.getElementById("playerNames");
  container.innerHTML = "";

  for (let i = 1; i <= playerCount; i++) {
    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = `プレイヤー${i}の名前`;
    input.id = `player${i}`;
    container.appendChild(input);
  }
}

function goToGame() {
  const settings = {
    startScore: document.getElementById("startScore").value,
    outType: document.getElementById("outType").value,
    separable: document.getElementById("separable").value,
    randomOrder: document.getElementById("randomOrder").checked,
    players: []
  };

  for (let i = 1; i <= playerCount; i++) {
    const name = document.getElementById(`player${i}`).value || `Player${i}`;
    settings.players.push(name);
  }

  // ランダム順
  if (settings.randomOrder) {
    settings.players = settings.players.sort(() => Math.random() - 0.5);
  }

  localStorage.setItem("settings01", JSON.stringify(settings));

  window.location.href = "mode01.html";
}
