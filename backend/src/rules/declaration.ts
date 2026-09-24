import type { Declaration, GameState, PlayerId, Suit } from "../types.js";

// FR-03のスコープ: 宣言(またはパス)を受け付けてdeclarationsに記録し、次の手番に進めるだけ。
// 強さ比較(FR-04)・最低枚数チェック(FR-07)・全員パス時の配り直し(FR-05)は
// あえてここに入れず、後続issueの責務として分離している。
export function submitDeclaration(
  state: GameState,
  playerId: PlayerId,
  suit: Suit | null,
  declaredCardCount: number | null,
): GameState {
  const declaration: Declaration = { playerId, suit, declaredCardCount };

  return {
    ...state,
    declarations: [...state.declarations, declaration],
    turnOrder: [...state.turnOrder.slice(1), state.turnOrder[0]],
  };
}
