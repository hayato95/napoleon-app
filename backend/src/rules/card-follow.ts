import type { Card, TrickPlay, Suit } from "../types.js";
import { isJokerForced } from "./joker-request.js";

export function canPlayCard(
  hand: Card[],
  plays: TrickPlay[],
  card: Card,
  leadJokerSuit?: Suit,
): boolean {
  // ジョーカー請求中なら、ジョーカーしか出せない
  if (isJokerForced(hand, plays)) {
    return card.type === "joker";
  }

  // 親がまだカードを出していない場合は、どのカードでも出せる
  if (plays.length === 0) {
    return true;
  }

  const leadCard = plays[0].card;

// リードカードがジョーカーの場合は、leadJokerSuitを台札として扱う
if (leadCard.type === "joker") {
  if (leadJokerSuit === undefined) {
    return false;
  }

  const hasLeadJokerSuit = hand.some(
    (handCard) =>
      handCard.type === "normal" && handCard.suit === leadJokerSuit,
  );

  if (!hasLeadJokerSuit) {
    return true;
  }

  return card.type === "normal" && card.suit === leadJokerSuit;
}

  // 手札にリードスートがあるか確認
  const hasLeadSuit = hand.some(
    (handCard) =>
      handCard.type === "normal" && handCard.suit === leadCard.suit,
  )

  // リードスートを持っていなければ、どのカードでも出せる
  if (!hasLeadSuit) {
    return true;
  }

  // リードスートを持っているなら、リードスートのカードだけ出せる
  return card.type === "normal" && card.suit === leadCard.suit;
}