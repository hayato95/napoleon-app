import type { Card, Rank, Suit } from "../types.js";

// FR-18のスコープ: 静的な強さの判定順（オールマイティ〜その他の7段階）のみ。
// tier=6はセイム2用に意図的に空けている（#29が担当、成立時はtier5とtier7の間として扱う）。
// よろめき（オールマイティとハートのQが同じトリックにいる場合の例外）はトリック全体を
// 見る必要があるため、この関数には含めず、トリック勝者決定(#25)側で別途チェックする想定。
export const CARD_STRENGTH_TIER = {
  mighty: 1, // オールマイティ（♠A）
  leadingJoker: 2, // 台札のジョーカー（トリックの先頭でジョーカーが出された）
  correctJack: 3, // 正ジャック（切り札のJ）
  backJack: 4, // 裏ジャック（切り札と同じ色のもう一方のJ）
  trump: 5, // 切り札（A〜2、正ジャック・裏ジャックを除く）
  // 6 はセイム2用に予約（#29）
  leadSuit: 7, // リードと同じスート（A〜2）
  other: 8, // その他
} as const;

// 数字の強さ。正ジャック・裏ジャックはtier3/4で別扱いだが、それ以外のJは
// 普通のカードとして自分のスートの中で10とQの間の強さを持つ（実際のナポレオンのルール通り）。
const NUMBER_STRENGTH: Record<Rank, number> = {
  2: 2,
  3: 3,
  4: 4,
  5: 5,
  6: 6,
  7: 7,
  8: 8,
  9: 9,
  10: 10,
  J: 11,
  Q: 12,
  K: 13,
  A: 14,
};

// 切り札と同じ色のもう一方のスート（裏ジャックの判定に使う）
const SAME_COLOR_SUIT: Record<Suit, Suit> = {
  spade: "club",
  club: "spade",
  diamond: "heart",
  heart: "diamond",
};

export interface CardStrengthContext {
  trumpSuit: Suit;
  leadSuit: Suit;
  isLeadCard: boolean; // このカードがそのトリックの先頭で出されたか
}

export interface CardStrength {
  tier: number;
  numberStrength: number; // 同じtier内でのみ比較に使う。tierが違うカード同士では意味を持たない
}

export function getCardStrength(card: Card, context: CardStrengthContext): CardStrength {
  const { trumpSuit, leadSuit, isLeadCard } = context;

  if (card.type === "normal" && card.suit === "spade" && card.rank === "A") {
    return { tier: CARD_STRENGTH_TIER.mighty, numberStrength: 0 };
  }

  if (card.type === "joker") {
    return isLeadCard
      ? { tier: CARD_STRENGTH_TIER.leadingJoker, numberStrength: 0 }
      : { tier: CARD_STRENGTH_TIER.other, numberStrength: 0 };
  }

  if (card.rank === "J" && card.suit === trumpSuit) {
    return { tier: CARD_STRENGTH_TIER.correctJack, numberStrength: 0 };
  }

  if (card.rank === "J" && card.suit === SAME_COLOR_SUIT[trumpSuit]) {
    return { tier: CARD_STRENGTH_TIER.backJack, numberStrength: 0 };
  }

  // 正ジャック・裏ジャック以外のJは、ここから先の通常のスート判定に合流する
  // （自分のスートの中では普通のカードとして10とQの間の強さを持つ）
  if (card.suit === trumpSuit) {
    return { tier: CARD_STRENGTH_TIER.trump, numberStrength: NUMBER_STRENGTH[card.rank] };
  }

  if (card.suit === leadSuit) {
    return { tier: CARD_STRENGTH_TIER.leadSuit, numberStrength: NUMBER_STRENGTH[card.rank] };
  }

  return { tier: CARD_STRENGTH_TIER.other, numberStrength: 0 };
}
