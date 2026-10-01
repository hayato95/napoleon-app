import type { GameState, PlayerId } from "../types.js";

// FR-26: ナポレオン軍（ナポレオン＋副官）が獲得した絵札の枚数を数える。FR-27の勝敗判定で宣言枚数と比べる。
// - 独り立ちのときは assignFukukan が fukukanId を null にするので、ナポレオン1人分だけになる
// - FR-14でナポレオンが捨てた札に含まれていた絵札(discardedCards)は、1トリック目の勝者のものになる。
//   勝者がナポレオン軍のメンバーなら、ここで足す（types.tsのコメントの通り、加算はFR-26の責務）
export function countNapoleonArmyFaceCards(state: GameState): number {
  if (state.napoleonId === null) {
    throw new Error("ナポレオンが決まっていないので集計できません");
  }

  // ナポレオン軍のメンバー。副官がいなければ（独り立ち）ナポレオンだけ
  const armyIds: PlayerId[] =
    state.fukukanId === null ? [state.napoleonId] : [state.napoleonId, state.fukukanId];

  // メンバーそれぞれの獲得札の枚数を足していく
  let total = 0;
  for (const id of armyIds) {
    total += state.capturedCards[id].length;
  }

  // 1トリック目の勝者がナポレオン軍なら、捨て札の絵札も足す（まだトリックが無ければ undefined）
  const firstTrickWinnerId = state.trickHistory[0]?.winnerId;
  if (firstTrickWinnerId !== undefined && armyIds.includes(firstTrickWinnerId)) {
    total += state.discardedCards.length;
  }

  return total;
}