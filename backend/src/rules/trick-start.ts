import type { Card, GameState, PlayerId, Trick } from "../types.js";
import { revealFukukanIfPlayed } from "./fukukan-reveal.js";

// カードは一意なIDを持たない値オブジェクトなので、手札の中から「そのカード」を
// 探すには値そのもの(type/suit/rank)で比較する必要がある。デッキ内に同じカードは
// 1枚しかないため、この比較で十分に一意なカードを特定できる。
export function cardsEqual(a: Card, b: Card): boolean {
  if (a.type === "normal" && b.type === "normal") {
    return a.suit === b.suit && a.rank === b.rank;
  }
  return a.type === b.type; // 片方がjokerの場合、両方jokerなら同じカード
}

// 次のトリックのリードプレイヤーを決める。最初のトリック(trickHistoryが空)は
// 必ずナポレオンがリードする。2回目以降は直前のトリックの勝者がリードする(FR-19でwinnerIdが確定する)。
function determineLeaderId(state: GameState): PlayerId | null {
  if (state.trickHistory.length === 0) {
    return state.napoleonId;
  }
  return state.trickHistory[state.trickHistory.length - 1].winnerId ?? null;
}

// FR-16のスコープ: リードプレイヤーが手札から自由に1枚選んで、そのトリックの最初の1枚として出す。
// マストフォロー(FR-17)・トリック勝者決定(FR-19)は後続issueの責務として分離している。
export function playLeadCard(state: GameState, playerId: PlayerId, card: Card): GameState {
  if (state.phase !== "trick") {
    throw new Error("トリックフェーズ以外ではカードを出せません");
  }

  if (state.currentTrick !== null) {
    throw new Error("前のトリックが終わっていません");
  }

  const leaderId = determineLeaderId(state);
  if (playerId !== leaderId) {
    throw new Error("このトリックのリードプレイヤーではありません");
  }

  const player = state.players[playerId];
  if (!player.hand.some((handCard) => cardsEqual(handCard, card))) {
    throw new Error("手札に無いカードは出せません");
  }

  const newTrick: Trick = {
    leaderId: playerId,
    plays: [{ playerId, card }],
  };

  const nextState: GameState = {
    ...state,
    players: state.players.map((p) =>
      p.id === playerId ? { ...p, hand: p.hand.filter((handCard) => !cardsEqual(handCard, card)) } : p,
    ),
    currentTrick: newTrick,
  };

  return revealFukukanIfPlayed(nextState, card);
}
