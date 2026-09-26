import type { Card, PlayerId, TrickPlay } from "../types.js";

// FR-24のスコープ: よろめき（オールマイティ♠Aとハートのクイーンが同じトリックに出たら、
// ハートのQがそのトリックに勝つ）の判定のみ。
// カード単体の強さ(FR-18, card-strength.ts)ではトリック全体が見えないため、ここで別に判定する。
// トリック勝者決定(#25)側では、まずこの関数を呼び、nullでなければその結果を勝者にする想定。

// オールマイティ（♠A）かどうか
export function isMighty(card: Card): boolean {
  return card.type === "normal" && card.suit === "spade" && card.rank === "A";
}

// よろめき（ハートのQ）かどうか
export function isYoromekiQueen(card: Card): boolean {
  return card.type === "normal" && card.suit === "heart" && card.rank === "Q";
}

/**
 * FR-24: トリック内でよろめきが成立しているかを判定する。
 * @param plays そのトリックで出されたカード（出された順）
 * @returns ♠Aと♡Qが両方出ていれば true
 */
export function isYoromeki(plays: TrickPlay[]): boolean {
  const hasMighty = plays.some((play) => isMighty(play.card));
  const hasQueen = plays.some((play) => isYoromekiQueen(play.card));
  return hasMighty && hasQueen;
}

/**
 * FR-24: よろめきが成立していれば、ハートのQを出したプレイヤーを返す。
 * @param plays そのトリックで出されたカード（出された順）
 * @returns よろめき成立なら♡Qを出したプレイヤーのID、不成立なら null
 */
export function getYoromekiWinner(plays: TrickPlay[]): PlayerId | null {
  if (!isYoromeki(plays)) {
    return null;
  }
  const queenPlay = plays.find((play) => isYoromekiQueen(play.card));
  return queenPlay ? queenPlay.playerId : null;
}
