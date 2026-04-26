let playerCount = 1;
// 初期表示
window.onload = () => {
    updatePlayerInputs();
};

// プレイヤー名入力欄を人数に応じて生成
function changePlayerCount(delta) {
  playerCount += delta;

  if (playerCount < 1) playerCount = 1;
  if (playerCount > 12) playerCount = 12;

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

	updateGameTypeAvailability();
}

// ゲーム開始
function startGame() {
	const settings = {
		gameType: document.getElementById("gameType").value,  // ← ★追加
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

	// クリケット設定を保存
	sessionStorage.setItem("settingsCricket", JSON.stringify(settings));

	// クリケット画面へ
	window.location.href = "modeCricket.html";
}

function updateGameTypeAvailability() {
  const count = playerCount;
  const gameType = document.getElementById("gameType");

  if (count === 1) {
    // 1人 → カットスロート禁止
    gameType.value = "standard"; // 強制的にスタンダードへ
    gameType.disabled = true;
  } else {
    // 2人以上 → 両方選べる
    gameType.disabled = false;
  }
}