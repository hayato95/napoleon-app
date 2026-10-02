import type { Card, Rank, Suit } from './types'

export const SUIT_SYMBOL: Record<Suit, string> = {
  spade: '♠',
  diamond: '♦',
  heart: '♥',
  club: '♣',
}

export function cardsEqual(a: Card, b: Card): boolean {
  if (a.type === 'normal' && b.type === 'normal') {
    return a.suit === b.suit && a.rank === b.rank
  }
  return a.type === b.type
}

export function cardLabel(card: Card): string {
  return card.type === 'joker' ? 'ジョーカー' : `${SUIT_SYMBOL[card.suit]}${card.rank}`
}

// 手札の表示順。スートは左から ♥ → ♣ → ♦ → ♠、スートの中では 2 → A。ジョーカーは一番右。
const HAND_SUIT_ORDER: Suit[] = ['heart', 'club', 'diamond', 'spade']
const HAND_RANK_ORDER: Rank[] = [2, 3, 4, 5, 6, 7, 8, 9, 10, 'J', 'Q', 'K', 'A']

// 手札の中での並び位置を表す数。小さいほど左に並ぶ
function handSortKey(card: Card): number {
  if (card.type === 'joker') {
    return HAND_SUIT_ORDER.length * HAND_RANK_ORDER.length // どのカードよりも大きい = 一番右
  }
  return HAND_SUIT_ORDER.indexOf(card.suit) * HAND_RANK_ORDER.length + HAND_RANK_ORDER.indexOf(card.rank)
}

/**
 * 手札を表示する順番を返す。戻り値は「元の hand の何番目のカードか」を表示順に並べたもの。
 * カードそのものではなく番号を返すのは、クリックされたカードを元の hand の番号で扱っている画面
 * （トリック・カード交換）を変えずに済ませるため。
 *
 * unsortedTailCount を渡すと、hand の末尾のその枚数だけは並べ替えず、右端にそのままの順で置く。
 * カード交換画面で、受け取った場札3枚（サーバーが手札の末尾に足す）を右端に並べるために使う。
 */
export function handDisplayOrder(hand: Card[], unsortedTailCount = 0): number[] {
  const indexes = hand.map((_, index) => index)
  const sortedCount = Math.max(0, hand.length - unsortedTailCount)
  const sorted = indexes.slice(0, sortedCount).sort((a, b) => handSortKey(hand[a]) - handSortKey(hand[b]))
  return [...sorted, ...indexes.slice(sortedCount)]
}

const PICTURE_RANKS: Rank[] = [10, 'J', 'Q', 'K', 'A']

// 切り札と同じ色のスート（裏ジャックの判定に使う）
export const SAME_COLOR_SUIT: Record<Suit, Suit> = {
  spade: 'club',
  club: 'spade',
  diamond: 'heart',
  heart: 'diamond',
}

/**
 * トリックに出たカードに添える、役割の名前。ルールを知らなくても強いカードが分かるようにするためのもの。
 * 当てはまるものが複数あるときは、上にあるものを優先する（絵札でも、親と同じスートなら「親と同じスート」）。
 * leadSuit はそのトリックの台札のスート。決まっていなければ null。
 */
export function trickCardRoleLabel(card: Card, trumpSuit: Suit, leadSuit: Suit | null): string | null {
  if (card.type === 'joker') {
    return 'ジョーカー'
  }
  if (card.suit === 'spade' && card.rank === 'A') {
    return 'オールマイティ'
  }
  if (card.rank === 'J' && card.suit === trumpSuit) {
    return '正ジャック'
  }
  if (card.rank === 'J' && card.suit === SAME_COLOR_SUIT[trumpSuit]) {
    return '裏ジャック'
  }
  if (card.suit === trumpSuit) {
    return '切り札'
  }
  if (card.suit === leadSuit) {
    return '親と同じスート'
  }
  if (PICTURE_RANKS.includes(card.rank)) {
    return '絵札'
  }
  return null
}

// Kenney Playing Cards Pack (public/cards/) のファイル名規則: card_{suit}s_{rank}.png
// 例: スペードの3 → card_spades_03.png / 10以上・絵札は card_spades_10.png, card_spades_J.png
const SUIT_FILE_NAME: Record<Suit, string> = {
  spade: 'spades',
  diamond: 'diamonds',
  heart: 'hearts',
  club: 'clubs',
}

export function cardImageSrc(card: Card): string {
  if (card.type === 'joker') {
    return '/cards/card_joker_red.png'
  }

  const rank = typeof card.rank === 'number' ? String(card.rank).padStart(2, '0') : card.rank
  return `/cards/card_${SUIT_FILE_NAME[card.suit]}_${rank}.png`
}
