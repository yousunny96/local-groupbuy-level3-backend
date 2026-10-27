// 가상 데이터. 이름·연락처는 모두 지어낸 값이다.
export interface SeedGroupBuy {
  title: string;
  category: '과일' | '채소' | '곡물' | '기타';
  origin: string;
  price: number;
  total: number;
  max: number;
  /** 지금부터 마감까지 남은 시간(시간 단위). 음수면 이미 마감 */
  hoursLeft: number;
  /** 얼마나 찼는지 (0~1) */
  fill: number;
}

export const SEED_GROUP_BUYS: SeedGroupBuy[] = [
  { title: '충주 햇사과 5kg', category: '과일', origin: '충주', price: 28000, total: 50, max: 3, hoursLeft: 72, fill: 0.6 },
  { title: '제주 한라봉 3kg', category: '과일', origin: '제주', price: 24000, total: 40, max: 2, hoursLeft: 30, fill: 0.9 },
  { title: '나주 배 7.5kg', category: '과일', origin: '나주', price: 35000, total: 30, max: 2, hoursLeft: 120, fill: 0.2 },
  { title: '강원 고랭지 배추 10kg', category: '채소', origin: '평창', price: 18000, total: 60, max: 4, hoursLeft: 48, fill: 0.5 },
  { title: '해남 꿀고구마 5kg', category: '채소', origin: '해남', price: 22000, total: 45, max: 3, hoursLeft: 5, fill: 0.8 },
  { title: '이천 햅쌀 10kg', category: '곡물', origin: '이천', price: 39000, total: 35, max: 3, hoursLeft: 96, fill: 0.35 },
  { title: '의성 마늘 3kg', category: '채소', origin: '의성', price: 26000, total: 25, max: 2, hoursLeft: -20, fill: 1 },
  { title: '청송 사과즙 30포', category: '기타', origin: '청송', price: 21000, total: 50, max: 3, hoursLeft: -70, fill: 0.7 },
];

export const SEED_NAMES = [
  '김하늘', '이도윤', '박서윤', '최민준', '정지우', '강예은', '조현우', '윤서아', '장지호', '임나은',
  '한유진', '오세훈', '서지민', '신예린', '권태양', '황보라', '안도현', '송가은', '류지안', '문재이',
];

/** 같은 결과가 나오도록 고정된 규칙으로 만드는 난수 */
export function makeRandom(seed = 7) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

export function fakePhone(index: number) {
  return `0100000${String(1000 + index).padStart(4, '0')}`;
}

// ---- Level 3: 확인용 계정 (모두 가상이다) ----
export const DEMO_ADMIN = { username: 'admin', password: 'admin1234', name: '관리자 박마켓', phone: '01000000000' };
export const DEMO_USER_PASSWORD = 'user1234';

/** 일반 사용자 아이디: user01, user02 ... (SEED_NAMES 순서와 같다) */
export function demoUsername(index: number) {
  return `user${String(index + 1).padStart(2, '0')}`;
}
