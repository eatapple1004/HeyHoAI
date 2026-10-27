// 평면 데이터 — 실제 도면이 들어오면 이 파일만 바꾸면 된다.
// 단위: m. 평면 좌표 x = 오른쪽(동), z = 아래(남). 높이는 y.
// 벽은 중심선 기준(start → end, 축 정렬). 실은 두께 t의 절반씩 양쪽으로 나간다.
// 개구부 at = 벽 시작점에서 개구부 왼쪽 끝까지 거리, w = 폭.
//   type: door(문틀만, 통행 가능) · open(벽 뚫림, 통행 가능) · window(창, 막힘) · glass(통창, 막힘)
// 방은 벽 중심선 기준 직사각형. 각 면(바닥·벽·천장)의 기본 마감은 defaults 에 둔다.

export const PLAN = {
  name: '샘플 평면 · 단층 주택 A형',
  note: '참고용 샘플 평면입니다. 실제 도면으로 교체됩니다.',
  height: 3.0,          // 천장고
  extT: 0.25,           // 외벽 두께
  intT: 0.15,           // 내벽 두께
  start: { x: 11, z: 1.3, yaw: 0 },   // 처음 서 있는 곳(현관). yaw 0 = 남쪽(집 안쪽)을 봄

  rooms: [
    { id: 'study',   name: '서재',        x0: 0,    z0: 0,   x1: 4.5,  z1: 5.5 },
    { id: 'bed2',    name: '침실 2',      x0: 4.5,  z0: 0,   x1: 9,    z1: 5.5 },
    { id: 'foyer',   name: '현관',        x0: 9,    z0: 0,   x1: 13,   z1: 5.5 },
    { id: 'bath',    name: '공용 욕실',   x0: 13,   z0: 0,   x1: 16,   z1: 5.5, wet: true },
    { id: 'dress',   name: '드레스룸',    x0: 16,   z0: 0,   x1: 18.5, z1: 5.5 },
    { id: 'mbath',   name: '안방 욕실',   x0: 18.5, z0: 0,   x1: 22,   z1: 5.5, wet: true },
    { id: 'hall',    name: '복도',        x0: 0,    z0: 5.5, x1: 16,   z1: 7 },
    { id: 'living',  name: '거실',        x0: 0,    z0: 7,   x1: 8.5,  z1: 14 },
    { id: 'kitchen', name: '주방·다이닝', x0: 8.5,  z0: 7,   x1: 16,   z1: 14 },
    { id: 'master',  name: '안방',        x0: 16,   z0: 5.5, x1: 22,   z1: 14 },
  ],

  walls: [
    // 외벽
    { id: 'N', a: [0, 0], b: [22, 0], ext: true, openings: [
      { at: 1.2, w: 2.1, type: 'window', sill: 0.9, head: 2.4 },
      { at: 5.7, w: 2.1, type: 'window', sill: 0.9, head: 2.4 },
      { at: 10.2, w: 1.6, type: 'door', head: 2.6, exterior: true },
      { at: 14.0, w: 1.0, type: 'window', sill: 1.6, head: 2.3 },
      { at: 19.5, w: 1.6, type: 'window', sill: 1.2, head: 2.4 },
    ] },
    { id: 'E', a: [22, 0], b: [22, 14], ext: true, openings: [
      { at: 8.0, w: 4.0, type: 'window', sill: 0.5, head: 2.6 },
    ] },
    { id: 'S', a: [0, 14], b: [22, 14], ext: true, openings: [
      { at: 0.7, w: 4.6, type: 'glass', sill: 0, head: 2.75 },
      { at: 5.6, w: 2.0, type: 'door', head: 2.75, exterior: true },
      { at: 9.2, w: 6.1, type: 'glass', sill: 0, head: 2.75 },
      { at: 17.0, w: 4.0, type: 'window', sill: 0.4, head: 2.6 },
    ] },
    { id: 'W', a: [0, 0], b: [0, 14], ext: true, openings: [
      { at: 1.5, w: 2.4, type: 'window', sill: 0.9, head: 2.4 },
      { at: 8.5, w: 4.0, type: 'glass', sill: 0.4, head: 2.75 },
    ] },
    // 내벽
    { id: 'I1', a: [0, 5.5], b: [22, 5.5], openings: [
      { at: 3.0, w: 0.9, type: 'door', head: 2.4 },
      { at: 5.0, w: 0.9, type: 'door', head: 2.4 },
      { at: 9.8, w: 2.4, type: 'open', head: 2.6 },
      { at: 13.5, w: 0.9, type: 'door', head: 2.4 },
      { at: 16.6, w: 1.0, type: 'door', head: 2.4 },
      { at: 19.5, w: 0.9, type: 'door', head: 2.4 },
    ] },
    { id: 'I2', a: [0, 7], b: [16, 7], openings: [
      { at: 6.0, w: 2.0, type: 'open', head: 2.7 },
      { at: 10.0, w: 2.5, type: 'open', head: 2.7 },
    ] },
    { id: 'I3', a: [4.5, 0], b: [4.5, 5.5] },
    { id: 'I4', a: [9, 0], b: [9, 5.5] },
    { id: 'I5', a: [13, 0], b: [13, 5.5] },
    { id: 'I6', a: [16, 0], b: [16, 14], openings: [
      { at: 5.8, w: 0.9, type: 'door', head: 2.4 },
    ] },
    { id: 'I7', a: [18.5, 0], b: [18.5, 5.5], openings: [
      { at: 2.0, w: 0.9, type: 'door', head: 2.4 },
    ] },
    { id: 'I8', a: [8.5, 7], b: [8.5, 14], openings: [
      { at: 1.0, w: 4.0, type: 'open', head: 2.8 },
    ] },
  ],

  // 기본 마감 (materials.js 의 id). 방에 없으면 '*' 값을 쓴다.
  defaults: {
    '*':      { floor: 'oak-plank',     wall: 'paint-warmwhite', ceiling: 'ceil-white' },
    foyer:    { floor: 'marble-white',  wall: 'stone-travertine' },
    hall:     { floor: 'oak-plank' },
    living:   { floor: 'marble-white',  wall: 'paint-warmwhite' },
    kitchen:  { floor: 'marble-white',  wall: 'paint-warmwhite' },
    bath:     { floor: 'hex-white',     wall: 'subway-white' },
    mbath:    { floor: 'stone-grey',    wall: 'marble-slab' },
    master:   { floor: 'chevron-walnut', wall: 'linen-paper' },
    exterior: { wall: 'ext-stucco' },
  },
  // 특정 벽 한 면만 다른 마감 (아트월 등): '벽id:방id'
  accents: {
    'I2:living': 'marble-slab',
    'I6:master': 'wood-slat',
  },
};
