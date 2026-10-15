// 게임 데이터 파일입니다. 확률·캐릭터·가격은 여기만 고치면 됩니다.

// 등급표: weight는 확률(%)입니다. 합이 100이 아니어도 비율대로 계산됩니다.
// ⚠️ 반드시 "낮은 등급 → 높은 등급" 순서로 적어주세요.
const RARITIES = {
  R:   { stars: 3, weight: 82, color: '#5aa9ff' },
  SR:  { stars: 4, weight: 15, color: '#b57bff' },
  SSR: { stars: 5, weight: 3,  color: '#ffc93c' },
};
const RARITY_ORDER = Object.keys(RARITIES); // ['R', 'SR', 'SSR']

// 캐릭터 목록: 같은 등급 안에서는 모두 같은 확률로 나옵니다.
const CHARACTERS = [
  { id: 'dragon',  name: '드래곤 킹',   emoji: '🐉', rarity: 'SSR' },
  { id: 'unicorn', name: '유니콘 공주', emoji: '🦄', rarity: 'SSR' },
  { id: 'lion',    name: '사자왕',      emoji: '🦁', rarity: 'SSR' },

  { id: 'fox',     name: '구미호',      emoji: '🦊', rarity: 'SR' },
  { id: 'wolf',    name: '늑대 기사',   emoji: '🐺', rarity: 'SR' },
  { id: 'owl',     name: '부엉이 현자', emoji: '🦉', rarity: 'SR' },
  { id: 'tiger',   name: '백호',        emoji: '🐯', rarity: 'SR' },
  { id: 'shark',   name: '상어 해적',   emoji: '🦈', rarity: 'SR' },

  { id: 'cat',     name: '고양이',      emoji: '🐱', rarity: 'R' },
  { id: 'dog',     name: '강아지',      emoji: '🐶', rarity: 'R' },
  { id: 'rabbit',  name: '토끼',        emoji: '🐰', rarity: 'R' },
  { id: 'frog',    name: '개구리',      emoji: '🐸', rarity: 'R' },
  { id: 'chick',   name: '병아리',      emoji: '🐥', rarity: 'R' },
  { id: 'hamster', name: '햄스터',      emoji: '🐹', rarity: 'R' },
  { id: 'turtle',  name: '거북이',      emoji: '🐢', rarity: 'R' },
  { id: 'pig',     name: '아기 돼지',   emoji: '🐷', rarity: 'R' },
];

const CONFIG = {
  startGems: 3000,     // 처음 지급하는 젬
  costSingle: 100,     // 1회 소환 가격
  costTen: 1000,       // 10회 소환 가격
  pity: 60,            // 천장: 이 횟수째 소환은 SSR 확정
  refillAmount: 1000,  // "충전" 버튼 1번에 받는 젬
};
