import type { Card, GameState, Rank, Trick } from "../types.js";

// FR-20: トリックの勝者が、そのトリックに含まれる絵札を獲得する。
// 絵札 = 各スートのA・K・Q・J・10（4スート×5種類=20枚）。ジョーカーは含まない。
// 勝者を決めるのはFR-19の責務なので、ここでは winnerId が決まったトリックを受け取るだけにしている。
// トリックを trickHistory に移す前後どちらでも呼べるよう、state.currentTrick は読まず引数で受け取る。

const FACE_CARD_RANKS: Rank[] = ["A", "K", "Q", "J", 10];

// 絵札かどうかをランクだけで判定する。
// オールマイティ(♠A)や正ジャックのような特別な役割を持つカードも、ランクがA・Jなので絵札になる。
export function isFaceCard(card: Card): boolean {
  if (card.type === "joker") {
    return false;
  }
  return FACE_CARD_RANKS.includes(card.rank);
}

export function captureFaceCards(state: GameState, trick: Trick): GameState {
  const winnerId = trick.winnerId;
  if (winnerId === undefined) {
    throw new Error("勝者が決まっていないトリックの絵札は獲得できません");
  }

  // 全員が1枚ずつ出し終わったトリックだけを受け付ける（途中のトリックで呼ばれるのを防ぐ）
  if (trick.plays.length !== state.players.length) {
    throw new Error("全員がカードを出し終わっていないトリックの絵札は獲得できません");
  }

  // 出された順のまま、絵札だけを取り出す
  const faceCards = trick.plays.map((play) => play.card).filter(isFaceCard);

  // 元の配列に push すると元のstateまで変わってしまうので、新しい配列・新しいオブジェクトを作って返す
  return {
    ...state,
    capturedCards: {
      ...state.capturedCards,
      [winnerId]: [...state.capturedCards[winnerId], ...faceCards],
    },
  };
}