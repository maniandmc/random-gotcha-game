// 확률이 의도대로 동작하는지 대량으로 뽑아서 확인하는 검증 스크립트
// 사용법: node tools/simulate.js [10회 소환 반복 횟수]   (기본 10,000번 = 10만 회 소환)

const fs = require('fs');
const path = require('path');
const vm = require('vm');

// 브라우저와 똑같이 data.js → gacha.js 순서로 불러오기
for (const file of ['data.js', 'gacha.js']) {
  const code = fs.readFileSync(path.join(__dirname, '..', 'js', file), 'utf8');
  vm.runInThisContext(code, { filename: file });
}
checkData();

const rounds = Number(process.argv[2]) || 10000;
const state = { pity: 0 };
const counts = Object.fromEntries(RARITY_ORDER.map((r) => [r, 0]));
let sinceSSR = 0;
let longestDrought = 0;   // SSR이 나오기까지 가장 오래 걸린 횟수
let tenPullsWithoutSR = 0; // SR 이상이 하나도 없던 10회 소환 수

for (let i = 0; i < rounds; i++) {
  const results = pull(state, 10);
  if (!results.some((r) => rarityRank(r.rarity) >= rarityRank('SR'))) tenPullsWithoutSR++;
  for (const r of results) {
    counts[r.rarity]++;
    sinceSSR++;
    if (r.rarity === 'SSR') {
      longestDrought = Math.max(longestDrought, sinceSSR);
      sinceSSR = 0;
    }
  }
}

const total = rounds * 10;
console.log(`총 ${total.toLocaleString()}회 소환 (10회 소환 × ${rounds.toLocaleString()})\n`);
console.log('등급   표시 확률   실제 비율');
for (const r of [...RARITY_ORDER].reverse()) {
  const shown = (rarityRate(r) * 100).toFixed(2) + '%';
  const actual = ((counts[r] / total) * 100).toFixed(2) + '%';
  console.log(`${r.padEnd(5)}  ${shown.padStart(8)}   ${actual.padStart(8)}`);
}
console.log(`\nSSR 천장 포함 이론값(1회 소환 기준): 약 ${((1 / expectedPullsPerSSR()) * 100).toFixed(2)}%`);
console.log('(SR·SSR 실제 비율이 표시 확률보다 조금 높은 건 천장과 10회 소환 보장 때문입니다)');
console.log(`SSR까지 가장 오래 걸린 횟수: ${longestDrought}회 (천장 ${CONFIG.pity}회)`);

const problems = [];
if (longestDrought > CONFIG.pity) problems.push(`천장(${CONFIG.pity}회)을 넘겨도 SSR이 안 나온 경우가 있어요.`);
if (tenPullsWithoutSR > 0) problems.push(`SR 이상이 없는 10회 소환이 ${tenPullsWithoutSR}번 있었어요.`);

if (problems.length) {
  console.error('\n❌ ' + problems.join('\n❌ '));
  process.exit(1);
}
console.log('\n✅ 천장과 10회 소환 보장이 모두 정상 동작합니다.');
