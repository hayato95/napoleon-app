import type { Card, Suit } from './types'

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
