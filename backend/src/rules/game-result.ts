import type { GameState } from "../types.js";
import { countNapoleonArmyFaceCards } from "./napoleon-army-count.js";

// FR-27: ナポレオン軍の獲得枚数(FR-26)と宣言枚数を比べて勝敗を決める。
// 宣言枚数「以上」ならナポレオン軍の勝ち、「未満」なら連合軍の勝ち。
// リザルト画面(FR-42)で「なぜその結果になったか」を表示できるよう、勝者と一緒に枚数も返す。

export type Winner = "napoleonArmy" | "alliedArmy";

export interface GameResult {
  winner: Winner;
  napoleonArmyCount: number; // ナポレオン軍が獲得した絵札の枚数
  declaredCount: number; // 宣言した枚数
}

export function judgeGameResult(state: GameState): GameResult {
  if (state.declaredCount === null) {
    throw new Error("宣言枚数が決まっていないので勝敗を判定できません");
  }

  const napoleonArmyCount = countNapoleonArmyFaceCards(state);
  const winner: Winner = napoleonArmyCount >= state.declaredCount ? "napoleonArmy" : "alliedArmy";

  return {
    winner,
    napoleonArmyCount,
    declaredCount: state.declaredCount,
  };
}