let score = 0;

function startGame() {
  score = Number(document.getElementById("startScore").value);
  document.getElementById("currentScore").textContent = "Score: " + score;
  document.getElementById("result").textContent = "";
}

function submitRound() {
  const t1 = Number(document.getElementById("throw1").value) || 0;
  const t2 = Number(document.getElementById("throw2").value) || 0;
  const t3 = Number(document.getElementById("throw3").value) || 0;

  const total = t1 + t2 + t3;
  const newScore = score - total;

  if (newScore < 0) {
    document.getElementById("result").textContent = "Bust!";
    return;
  }

  score = newScore;
  document.getElementById("currentScore").textContent = "Score: " + score;

  if (score === 0) {
    document.getElementById("result").textContent = "Finish!";
  }
}
