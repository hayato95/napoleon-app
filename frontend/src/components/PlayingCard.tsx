import type { Card, Suit } from '../types'

// Kenney Playing Cards Pack (public/cards/) のファイル名規則: card_{suit}s_{rank}.png
// 例: スペードの3 → card_spades_03.png / 10以上・絵札は card_spades_10.png, card_spades_J.png
const SUIT_FILE_NAME: Record<Suit, string> = {
  spade: 'spades',
  diamond: 'diamonds',
  heart: 'hearts',
  club: 'clubs',
}

function cardImageSrc(card: Card): string {
  if (card.type === 'joker') {
    return '/cards/card_joker_red.png'
  }

  const rank = typeof card.rank === 'number' ? String(card.rank).padStart(2, '0') : card.rank
  return `/cards/card_${SUIT_FILE_NAME[card.suit]}_${rank}.png`
}

function cardAltText(card: Card): string {
  if (card.type === 'joker') {
    return 'ジョーカー'
  }

  return `${card.suit} ${card.rank}`
}

interface PlayingCardProps {
  card: Card
  playable: boolean
  selected?: boolean
  onClick?: () => void
}

export function PlayingCard({ card, playable, selected = false, onClick }: PlayingCardProps) {
  return (
    <button
      type="button"
      className="playing-card"
      data-playable={playable}
      data-selected={selected}
      disabled={!playable}
      onClick={onClick}
      aria-label={cardAltText(card)}
    >
      <img src={cardImageSrc(card)} alt={cardAltText(card)} draggable={false} />
    </button>
  )
}
