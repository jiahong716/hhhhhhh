const diceCount = document.querySelector('#dice-count');
const diceCountOutput = document.querySelector('#dice-count-output');
const diceSides = document.querySelector('#dice-sides');
const diceResults = document.querySelector('#dice-results');
const totalValue = document.querySelector('#total-value');
const rollButton = document.querySelector('#roll-button');
const decreaseDice = document.querySelector('#decrease-dice');
const increaseDice = document.querySelector('#increase-dice');
const historyList = document.querySelector('#history-list');
const clearHistory = document.querySelector('#clear-history');
const rollCount = document.querySelector('#roll-count');
const heroDieDot = document.querySelector('#hero-die-dot');

let history = [];
let totalRolls = 0;

function updateDiceCount(value) {
  const count = Math.min(6, Math.max(1, Number(value)));
  diceCount.value = count;
  diceCountOutput.textContent = count;
}

function rollDie(sides) {
  return Math.floor(Math.random() * sides) + 1;
}

function renderResults(results, sides) {
  diceResults.innerHTML = '';
  results.forEach((result, index) => {
    const die = document.createElement('div');
    die.className = 'die-result';
    die.style.animationDelay = `${index * 70}ms`;
    die.innerHTML = `<span>${result}</span><small>D${sides}</small>`;
    diceResults.appendChild(die);
  });
}

function renderHistory() {
  if (history.length === 0) {
    historyList.innerHTML = '<p class="history-empty">每次擲骰的足跡都會出現在這裡。</p>';
    return;
  }

  historyList.innerHTML = history.map((entry) => `
    <div class="history-item">
      <span class="history-time">${entry.time} · D${entry.sides}</span>
      <div class="history-values">${entry.results.map((result) => `<span>${result}</span>`).join('')}</div>
      <strong class="history-total">${entry.total}</strong>
    </div>
  `).join('');
}

function performRoll() {
  const count = Number(diceCount.value);
  const sides = Number(diceSides.value);
  const results = Array.from({ length: count }, () => rollDie(sides));
  const total = results.reduce((sum, result) => sum + result, 0);
  const time = new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' });

  renderResults(results, sides);
  totalValue.textContent = total;
  heroDieDot.textContent = results[0];
  history.unshift({ results, sides, total, time });
  history = history.slice(0, 5);
  totalRolls += 1;
  rollCount.textContent = totalRolls;
  renderHistory();
}

diceCount.addEventListener('input', (event) => updateDiceCount(event.target.value));
decreaseDice.addEventListener('click', () => updateDiceCount(Number(diceCount.value) - 1));
increaseDice.addEventListener('click', () => updateDiceCount(Number(diceCount.value) + 1));
rollButton.addEventListener('click', performRoll);
clearHistory.addEventListener('click', () => {
  history = [];
  renderHistory();
});
document.addEventListener('keydown', (event) => {
  if (event.code === 'Space' && event.target.tagName !== 'SELECT' && event.target.tagName !== 'INPUT') {
    event.preventDefault();
    performRoll();
  }
});
