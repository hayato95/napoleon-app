import type { Card, Rank, Suit } from "./types.js";
import { isFaceCard } from "./rules/face-card-capture.js";
import { isMighty } from "./rules/yoromeki.js";

// 【暫定】ナポレオンになったCPUが、カード交換で捨てる3枚を選ぶ。
// 本来は FR-31（#38、hirotomo0610 担当）で rules/ に実装される処理。それが入るまで、
// カード交換のところでCPUが止まらないように、#38 の期待する挙動と同じ優先順位だけを最小限で置いている。
// #38 の実装が入ったら、game-flow.ts の cpuDiscard の既定値をそちらに差し替えて、このファイルは削除する。
//
// 捨てる優先順位:
//   1. 役札・絵札・切り札以外の数字カード（弱い順）
//   2. 切り札の数字カード（弱い順）
//   3. 絵札・役札（最終手段。ジョーカーとオールマイティは最後）

const RANK_VALUE: Record<Rank, number> = {
  2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8, 9: 9, 10: 10, J: 11, Q: 12, K: 13, A: 14,
};

const DISCARD_COUNT = 3;

// 小さいほど先に捨てる
function discardPriority(card: Card, trumpSuit: Suit): number {
  if (card.type === "joker") {
    return 299;
  }
  if (isMighty(card)) {
    return 298;
  }

  const rank = RANK_VALUE[card.rank];
  if (isFaceCard(card)) {
    return 200 + rank;
  }
  return card.suit === trumpSuit ? 100 + rank : rank;
}

export function fallbackCpuDiscard(hand: Card[], trumpSuit: Suit): Card[] {
  return [...hand]
    .sort((a, b) => discardPriority(a, trumpSuit) - discardPriority(b, trumpSuit))
    .slice(0, DISCARD_COUNT);
}
