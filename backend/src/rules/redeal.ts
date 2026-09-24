import type { Declaration } from "../types.js";

// プレイヤー人数（本アプリは5人固定）
const PLAYER_COUNT = 5;

/**
 * FR-05: せりの最初の一周で全員がパスしたかを判定し、配り直すべきかを返す。
 * @param declarations せりの記録（発言した順）
 * @returns 配り直すべきなら true
 */
export function shouldRedeal(declarations: Declaration[]): boolean {
  // まだ5人全員が発言していない → 一周していないので配り直しではない
  if (declarations.length < PLAYER_COUNT) {
    return false;
  }

  // 最初の一周（先頭から5件）を取り出す
  const firstRound = declarations.slice(0, PLAYER_COUNT);

  // その5件が全部パス（count が null）なら配り直し
 return firstRound.every((declaration) => declaration.declaredCardCount === null);
}