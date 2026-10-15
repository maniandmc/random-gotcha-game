// 가챠의 핵심 로직만 모아둔 파일입니다. (화면 관련 코드는 main.js)
// 화면과 분리해 두었기 때문에 tools/simulate.js에서 그대로 불러와 검증할 수 있습니다.

function rarityRank(rarity) {
  return RARITY_ORDER.indexOf(rarity);
}

function totalWeight() {
  return RARITY_ORDER.reduce((sum, r) => sum + RARITIES[r].weight, 0);
}

// 등급별 표시 확률 (0~1)
function rarityRate(rarity) {
  return RARITIES[rarity].weight / totalWeight();
}

// 가중치 랜덤: weight 비율대로 하나를 고릅니다.
// 예) weight 82, 15, 3 → 0~100 사이 난수를 뽑아 0~82는 첫째, 82~97은 둘째, 97~100은 셋째
function weightedPick(items, rng) {
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  let r = rng() * total;
  for (const item of items) {
    if (r < item.weight) return item;
    r -= item.weight;
  }
  return items[items.length - 1]; // 부동소수점 오차 대비
}

// minRarity 이상의 등급 중에서 확률표 비율대로 하나 고르기
function rollRarity(minRarity, rng) {
  const candidates = RARITY_ORDER
    .filter((r) => rarityRank(r) >= rarityRank(minRarity))
    .map((r) => ({ rarity: r, weight: RARITIES[r].weight }));
  return weightedPick(candidates, rng).rarity;
}

// 1회 소환. state.pity(마지막 SSR 이후 SSR 없이 뽑은 횟수)를 갱신합니다.
function pullOnce(state, minRarity, rng) {
  const hitPity = state.pity + 1 >= CONFIG.pity;
  const rarity = hitPity ? 'SSR' : rollRarity(minRarity, rng);

  state.pity = rarity === 'SSR' ? 0 : state.pity + 1;

  const pool = CHARACTERS.filter((c) => c.rarity === rarity);
  const character = pool[Math.floor(rng() * pool.length)];
  return { ...character, byPity: hitPity };
}

// count회 소환. 10회 소환은 앞의 9장에 SR 이상이 없으면 마지막 장을 SR 이상으로 보장합니다.
function pull(state, count, rng = Math.random) {
  const results = [];
  for (let i = 0; i < count; i++) {
    const isLastOfTen = count === 10 && i === 9;
    const hasSRorAbove = results.some((r) => rarityRank(r.rarity) >= rarityRank('SR'));
    const minRarity = isLastOfTen && !hasSRorAbove ? 'SR' : 'R';
    results.push(pullOnce(state, minRarity, rng));
  }
  return results;
}

// 천장까지 고려한 "SSR 1개당 평균 소환 횟수" = 1 + (1-p) + (1-p)^2 + ... + (1-p)^(천장-1)
function expectedPullsPerSSR() {
  const p = rarityRate('SSR');
  return (1 - Math.pow(1 - p, CONFIG.pity)) / p;
}

// data.js를 고치다 실수했을 때 원인을 바로 알 수 있게 검사합니다.
function checkData() {
  for (const r of ['R', 'SR', 'SSR']) {
    if (!RARITIES[r]) throw new Error(`data.js의 RARITIES에 ${r} 등급이 없어요.`);
  }
  for (const r of RARITY_ORDER) {
    if (!CHARACTERS.some((c) => c.rarity === r)) {
      throw new Error(`${r} 등급 캐릭터가 하나도 없어요. data.js를 확인하세요.`);
    }
  }
  const ids = new Set();
  for (const c of CHARACTERS) {
    if (ids.has(c.id)) throw new Error(`캐릭터 id "${c.id}"가 중복됐어요.`);
    ids.add(c.id);
  }
}
