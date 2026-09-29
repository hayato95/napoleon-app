import type { Card, GameState } from "../types.js";

// 絵札（A・K・Q・J・10）かどうか。ジョーカーは絵札ではない。
function isScoringCard(card: Card): boolean {
  if (card.type !== "normal") {
    return false;
  }
  return card.rank === "A" || card.rank === "K" || card.rank === "Q" || card.rank === "J" || card.rank === 10;
}

// FR-14のスコープ: ナポレオンが捨てた3枚の中から絵札だけを抽出し、公開する。
// カード交換（配札直後、トリックが始まる前）は1ゲーム中に1回しか起きないため、
// 公開された絵札は必ず1回目のトリックの勝者の得点として加算される。ただし、その
// 加算処理自体（誰が1回目のトリックに勝ったか）はトリック集計(#26/#33)側の責務として分離している。
export function revealDiscardedFaceCards(state: GameState, discarded: Card[]): GameState {
  if (state.phase !== "cardExchange") {
    throw new Error("カード交換フェーズ以外では捨て札を確定できません");
  }

  if (discarded.length !== 3) {
    throw new Error("捨てるカードは3枚である必要があります");
  }

  return {
    ...state,
    discardedCards: discarded.filter(isScoringCard),
  };
}
