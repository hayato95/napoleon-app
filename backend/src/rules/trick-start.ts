import type { Card, GameState, PlayerId, Suit, Trick } from "../types.js";

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
// FR-23①: ジョーカーでリードするときは、台札のスートを leadJokerSuit で指定する（必須）。
// 指定したスートは Trick.leadJokerSuit に保存され、2番目以降のプレイヤーはこれを台札のスートとして扱う。
// 普通のカードでリードするときは leadJokerSuit を渡さない（渡したらエラー）。
// 親以外はこの関数を通れないので、スートを指定できるのは親だけになる。
export function playLeadCard(state: GameState, playerId: PlayerId, card: Card, leadJokerSuit?: Suit): GameState {
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

  // FR-23①: ジョーカーでリードするならスート指定は必須。指定がないと2番目以降の台札のスートが決まらないため
  if (card.type === "joker" && leadJokerSuit === undefined) {
    throw new Error("ジョーカーでリードするときは台札のスートを指定してください");
  }

  // 普通のカードは自分のスートがそのまま台札のスートになるので、指定は受け付けない
  if (card.type === "normal" && leadJokerSuit !== undefined) {
    throw new Error("通常のカードはスート指定できません");
  }

  const newTrick: Trick = {
    leaderId: playerId,
    plays: [{ playerId, card }],
  };

  // ジョーカーでリードしたときだけ、指定されたスートをトリックに書き込む
  // （普通のカードのトリックには leadJokerSuit の欄自体を作らない）
  if (leadJokerSuit !== undefined) {
    newTrick.leadJokerSuit = leadJokerSuit;
  }

  return {
    ...state,
    players: state.players.map((p) =>
      p.id === playerId ? { ...p, hand: p.hand.filter((handCard) => !cardsEqual(handCard, card)) } : p,
    ),
    currentTrick: newTrick,
  };
}