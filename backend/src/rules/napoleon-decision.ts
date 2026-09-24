import type { Declaration, PlayerId, Suit } from "../types.js";
import { findLatestDeclaration } from "./declaration.js";

// 宣言した本人以外の4人全員がパスしたら、せりは終わったとみなす
const REMAINING_PLAYERS_TO_PASS = 4;

// FR-06のスコープ: せりが終わっているか（直近の本気の宣言のあと、残り4人全員が
// 連続パスしたか）を判定する。全員パスで一度も宣言が出ていない場合は false を返す
// （それはFR-05/shouldRedealの管轄であり、このissueの対象外）。
function isAuctionFinished(declarations: Declaration[]): boolean {
  let consecutivePasses = 0;

  for (let i = declarations.length - 1; i >= 0; i--) {
    if (declarations[i].declaredCardCount === null) {
      consecutivePasses++;
      continue;
    }
    return consecutivePasses >= REMAINING_PLAYERS_TO_PASS;
  }

  return false;
}

// せりが終わっていれば、ナポレオン・切り札・宣言枚数を確定する。終わっていなければnull。
// FR-06B（宣言が一度通ったら辞退できない）は、辞退するための操作自体をこのプロジェクトに
// 実装しないため、追加のコードなしで自動的に満たされる。
export function determineNapoleon(
  declarations: Declaration[],
): { napoleonId: PlayerId; trumpSuit: Suit; declaredCardCount: number } | null {
  if (!isAuctionFinished(declarations)) {
    return null;
  }

  const napoleonDeclaration = findLatestDeclaration(declarations);
  if (napoleonDeclaration === null || napoleonDeclaration.suit === null || napoleonDeclaration.declaredCardCount === null) {
    return null;
  }

  return {
    napoleonId: napoleonDeclaration.playerId,
    trumpSuit: napoleonDeclaration.suit,
    declaredCardCount: napoleonDeclaration.declaredCardCount,
  };
}
