import { cardImageSrc } from '../card-utils'
import type { Card } from '../types'

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
