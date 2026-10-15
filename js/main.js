// 화면(UI)과 저장을 담당하는 파일입니다.

const SAVE_KEY = 'random-gacha-save-v1';
const CHAR_BY_ID = Object.fromEntries(CHARACTERS.map((c) => [c.id, c]));
const $ = (id) => document.getElementById(id);

checkData();

// ---------- 저장 / 불러오기 (브라우저 localStorage) ----------

function newState() {
  return {
    gems: CONFIG.startGems,
    pity: 0,
    totalPulls: 0,
    rarityCounts: Object.fromEntries(RARITY_ORDER.map((r) => [r, 0])),
    collection: {}, // { 캐릭터id: 보유 수 }
    history: [],    // [{ id, at }] 최근 것이 앞
  };
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (saved) return { ...newState(), ...saved };
  } catch (e) {
    // 저장소를 못 쓰는 환경(사생활 보호 모드 등)이면 새로 시작
  }
  return newState();
}

function saveState() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch (e) {
    // 저장 실패해도 게임은 계속 진행
  }
}

let state = loadState();

// ---------- 소환 ----------

function doPull(count) {
  const cost = count === 10 ? CONFIG.costTen : CONFIG.costSingle;
  if (state.gems < cost) {
    toast('젬이 부족해요! 충전 버튼을 눌러보세요.');
    return;
  }
  state.gems -= cost;

  const results = pull(state, count);
  for (const r of results) {
    r.isNew = !state.collection[r.id];
    state.collection[r.id] = (state.collection[r.id] || 0) + 1;
    state.rarityCounts[r.rarity] = (state.rarityCounts[r.rarity] || 0) + 1;
    state.history.unshift({ id: r.id, at: Date.now() });
  }
  state.history = state.history.slice(0, 100);
  state.totalPulls += count;

  saveState();
  render();
  showResults(results);
}

// ---------- 소환 연출 ----------

let revealTimers = [];
let currentResults = [];

function showResults(results) {
  currentResults = results;
  clearRevealTimers();

  const box = $('results');
  box.innerHTML = '';
  box.className = 'results hidden ' + (results.length === 1 ? 'single' : 'multi');
  const cards = results.map((r) => box.appendChild(createCard(r)));

  // 빛 구슬 색으로 이번 소환의 최고 등급을 미리 암시하는 연출
  const best = results.reduce((a, b) => (rarityRank(b.rarity) > rarityRank(a.rarity) ? b : a));
  const orb = $('summon-orb');
  orb.style.setProperty('--orb-color', RARITIES[best.rarity].color);
  orb.classList.remove('hidden');
  orb.style.animation = 'none';
  void orb.offsetWidth; // 애니메이션 재시작용
  orb.style.animation = '';

  $('btn-skip').classList.remove('hidden');
  $('btn-close').classList.add('hidden');
  $('overlay').classList.remove('hidden');

  revealTimers.push(setTimeout(() => {
    orb.classList.add('hidden');
    box.classList.remove('hidden');
    cards.forEach((card, i) => {
      revealTimers.push(setTimeout(() => card.classList.add('flipped'), 150 + i * 220));
    });
    revealTimers.push(setTimeout(finishReveal, 150 + cards.length * 220 + 350));
  }, 1100));
}

function createCard(r) {
  const card = document.createElement('div');
  card.className = `card rarity-${r.rarity}`;
  card.style.setProperty('--rc', RARITIES[r.rarity].color);
  card.innerHTML = `
    <div class="card-inner">
      <div class="card-face card-back">?</div>
      <div class="card-face card-front">
        ${r.isNew ? '<span class="badge-new">NEW</span>' : ''}
        <div class="card-emoji">${r.emoji}</div>
        <div class="card-name">${r.name}</div>
        <div class="card-stars">${stars(r.rarity)}</div>
      </div>
    </div>`;
  return card;
}

function revealAll() {
  clearRevealTimers();
  $('summon-orb').classList.add('hidden');
  $('results').classList.remove('hidden');
  document.querySelectorAll('#results .card').forEach((c) => c.classList.add('flipped'));
  finishReveal();
}

function finishReveal() {
  $('btn-skip').classList.add('hidden');
  $('btn-close').classList.remove('hidden');
  if (currentResults.some((r) => r.byPity)) toast('천장 도달! SSR 확정 🎉');
}

function closeOverlay() {
  clearRevealTimers();
  $('overlay').classList.add('hidden');
}

function clearRevealTimers() {
  revealTimers.forEach(clearTimeout);
  revealTimers = [];
}

// ---------- 화면 그리기 ----------

function stars(rarity) {
  return '★'.repeat(RARITIES[rarity].stars);
}

// 0.0325 → "3.25%", 0.03 → "3%"
function pct(x) {
  return (x * 100).toFixed(2).replace(/\.?0+$/, '') + '%';
}

function render() {
  $('gems').textContent = state.gems.toLocaleString();
  $('total-pulls').textContent = state.totalPulls.toLocaleString();

  const left = CONFIG.pity - state.pity;
  $('pity-text').textContent = left === 1 ? '다음 소환 SSR 확정!' : `SSR 확정까지 ${left}회`;
  $('pity-fill').style.width = (state.pity / CONFIG.pity) * 100 + '%';

  $('btn-pull-1').disabled = state.gems < CONFIG.costSingle;
  $('btn-pull-10').disabled = state.gems < CONFIG.costTen;

  renderCollection();
  renderHistory();
  renderRates();
}

function renderCollection() {
  const owned = CHARACTERS.filter((c) => state.collection[c.id]).length;
  $('collection-count').textContent = `${owned}/${CHARACTERS.length}`;

  $('collection').innerHTML = [...RARITY_ORDER].reverse().map((rarity) => {
    const cells = CHARACTERS.filter((c) => c.rarity === rarity).map((c) => {
      const n = state.collection[c.id] || 0;
      if (!n) {
        return `<div class="dex-cell locked"><span class="dex-emoji">❔</span><span class="dex-name">???</span></div>`;
      }
      return `<div class="dex-cell" style="--rc:${RARITIES[rarity].color}">
          <span class="dex-emoji">${c.emoji}</span>
          <span class="dex-name">${c.name}</span>
          <span class="dex-count">×${n}</span>
        </div>`;
    }).join('');
    return `<h3 class="dex-title" style="color:${RARITIES[rarity].color}">${stars(rarity)} ${rarity}</h3>
      <div class="dex-grid">${cells}</div>`;
  }).join('');
}

function renderHistory() {
  const items = state.history.slice(0, 50).map((h) => {
    const c = CHAR_BY_ID[h.id];
    if (!c) return ''; // data.js에서 삭제된 캐릭터
    const time = new Date(h.at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
    return `<li class="history-item" style="--rc:${RARITIES[c.rarity].color}">
        <span class="tag">${c.rarity}</span>
        <span>${c.emoji} ${c.name}</span>
        <time>${time}</time>
      </li>`;
  }).join('');
  $('history').innerHTML = items || '<li class="empty">아직 소환 기록이 없어요.</li>';
}

function renderRates() {
  const rows = [...RARITY_ORDER].reverse().map((r) => {
    const poolSize = CHARACTERS.filter((c) => c.rarity === r).length;
    const mine = state.rarityCounts[r] || 0;
    const mineRate = state.totalPulls ? pct(mine / state.totalPulls) : '-';
    return `<tr style="--rc:${RARITIES[r].color}">
        <td class="rate-name">${stars(r)} ${r}</td>
        <td>${pct(rarityRate(r))}</td>
        <td>${pct(rarityRate(r) / poolSize)}</td>
        <td>${mine}회 (${mineRate})</td>
      </tr>`;
  }).join('');

  const avg = expectedPullsPerSSR();
  $('rates').innerHTML = `
    <table class="rates">
      <thead><tr><th>등급</th><th>확률</th><th>캐릭터당</th><th>내 결과</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <ul class="notes">
      <li><b>천장</b>: ${CONFIG.pity - 1}회 연속 SSR이 안 나오면 ${CONFIG.pity}번째 소환은 SSR 확정</li>
      <li><b>10회 소환</b>: SR 이상 최소 1개 확정</li>
      <li>천장을 포함하면 평균 <b>약 ${avg.toFixed(1)}회</b>마다 SSR 1개 (1회 소환 기준 실질 확률 약 ${pct(1 / avg)})</li>
    </ul>`;
}

// ---------- 기타 ----------

let toastTimer;
function toast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2000);
}

$('btn-pull-1').addEventListener('click', () => doPull(1));
$('btn-pull-10').addEventListener('click', () => doPull(10));
$('btn-skip').addEventListener('click', revealAll);
$('btn-close').addEventListener('click', closeOverlay);

$('btn-refill').addEventListener('click', () => {
  state.gems += CONFIG.refillAmount;
  saveState();
  render();
  toast(`💎 ${CONFIG.refillAmount.toLocaleString()} 충전!`);
});

// confirm() 창이 막힌 환경(웹 임베드 등)에서도 동작하도록 "두 번 눌러 확인" 방식을 씁니다.
let resetTimer = null;
function disarmReset() {
  clearTimeout(resetTimer);
  resetTimer = null;
  $('btn-reset').textContent = '데이터 초기화';
  $('btn-reset').classList.remove('danger');
}

$('btn-reset').addEventListener('click', () => {
  if (!resetTimer) {
    $('btn-reset').textContent = '한 번 더 누르면 초기화';
    $('btn-reset').classList.add('danger');
    resetTimer = setTimeout(disarmReset, 3000);
    return;
  }
  disarmReset();
  state = newState();
  saveState();
  render();
  toast('초기화했어요.');
});

document.querySelectorAll('.tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t === tab));
    document.querySelectorAll('.tab-panel').forEach((p) => {
      p.classList.toggle('active', p.id === 'tab-' + tab.dataset.tab);
    });
  });
});

// 처음 한 번만 채우는 고정 문구
$('banner-art').textContent = CHARACTERS.filter((c) => c.rarity === 'SSR').map((c) => c.emoji).join('');
$('banner-rate').textContent = `SSR 확률 ${pct(rarityRate('SSR'))} · ${CONFIG.pity}회 안에 SSR 확정`;
$('cost-1').textContent = `💎 ${CONFIG.costSingle.toLocaleString()}`;
$('cost-10').textContent = `💎 ${CONFIG.costTen.toLocaleString()}`;

render();
