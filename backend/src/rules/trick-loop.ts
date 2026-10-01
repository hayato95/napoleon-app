import type { GameState } from "../types.js";

// FR-21: トリックを10回繰り返したら1局を終え、勝敗判定(result)フェーズに進む。
// 53枚(ジョーカー含む)を5人に10枚ずつ配り、残り3枚が場札になるので、1人10枚 = 10トリックで手札がなくなる。
// 「次のトリックを始める」部分は、勝者がplayLeadCardでリードすることですでに実現されている(FR-19)。
// ここでは「終わり」だけを担当する。phaseが"result"になると、playLeadCard/playCardは
// トリックフェーズ以外を拒否するので、11トリック目は出せなくなる。
export const TOTAL_TRICKS = 10;

export function finishRoundIfAllTricksDone(state: GameState): GameState {
  if (state.trickHistory.length < TOTAL_TRICKS) {
    return state;
  }

  return {
    ...state,
    phase: "result",
  };
}