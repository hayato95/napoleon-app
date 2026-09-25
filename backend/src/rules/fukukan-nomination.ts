import type { Card, GameState, PlayerId } from "../types.js";

// FR-09のスコープ: ナポレオンが53枚(52枚+ジョーカー)の中から副官指定カードを1枚選ぶ。
// 選んだカードは本人の手札にある必要はない（誰が持っているかは本人にも分からない）。
// 誰が指定カードを持っているか探す処理(FR-10)・公開処理(FR-12)は後続issueの責務として分離している。
export function nominateFukukan(state: GameState, playerId: PlayerId, card: Card): GameState {
  if (state.phase !== "fukukanNomination") {
    throw new Error("副官指名フェーズ以外では副官指定カードを選べません");
  }

  if (playerId !== state.napoleonId) {
    throw new Error("副官指定カードを選べるのはナポレオンだけです");
  }

  if (state.fukukanCard !== null) {
    throw new Error("副官指定カードは既に選択済みです");
  }

  return {
    ...state,
    fukukanCard: card,
  };
}
