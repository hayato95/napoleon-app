import type { Declaration, GameState, PlayerId, Suit } from "../types.js";
import { SUIT_STRENGTH_ORDER } from "../types.js";
import { isValidDeclaredCardCount } from "./declaration-limit.js";

// FR-03のスコープ: 宣言(またはパス)を受け付けてdeclarationsに記録し、次の手番に進める。
// FR-04のスコープ: 直前の宣言より弱い宣言を拒否する（パスは常に許可、比較対象外）。
// FR-07のスコープ: 宣言枚数が11〜20枚の範囲外なら拒否する（判定はdeclaration-limit.ts）。
// 全員パス時の配り直し(FR-05)は、判定をredeal.tsに分離している。
export function submitDeclaration(
  state: GameState,
  playerId: PlayerId,
  suit: Suit | null,
  declaredCardCount: number | null,
): GameState {
  const declaration: Declaration = { playerId, suit, declaredCardCount };

   if (!isValidDeclaredCardCount(declaredCardCount)) {
    throw new Error("宣言できる枚数は11〜20枚です");
  }

  if (declaredCardCount !== null) {
    const previousDeclaration = findLatestDeclaration(state.declarations);
    if (previousDeclaration !== null && !isStrongerDeclaration(declaration, previousDeclaration)) {
      throw new Error("直前の宣言より弱い宣言は選べません");
    }
  }

  return {
    ...state,
    declarations: [...state.declarations, declaration],
    turnOrder: [...state.turnOrder.slice(1), state.turnOrder[0]],
  };
}

// パスを除いた、直近の宣言を探す（見つからなければ null = まだ誰も宣言していない）
export function findLatestDeclaration(declarations: Declaration[]): Declaration | null {
  for (let i = declarations.length - 1; i >= 0; i--) {
    if (declarations[i].declaredCardCount !== null) {
      return declarations[i];
    }
  }
  return null;
}

// aがbより強い宣言かどうか。パス（declaredCardCountがnull）同士・片方がパスの場合は比較できない
export function isStrongerDeclaration(a: Declaration, b: Declaration): boolean {
  if (a.declaredCardCount === null || a.suit === null || b.declaredCardCount === null || b.suit === null) {
    throw new Error("isStrongerDeclaration はパスを比較できません");
  }

  if (a.declaredCardCount !== b.declaredCardCount) {
    return a.declaredCardCount > b.declaredCardCount;
  }

  // 枚数が同じ場合はスートの強さ（♠＞♦＞♡＞クローバー）で比較
  return SUIT_STRENGTH_ORDER.indexOf(a.suit) < SUIT_STRENGTH_ORDER.indexOf(b.suit);
}
