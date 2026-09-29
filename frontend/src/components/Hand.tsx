import type { Card } from '../types'
import { PlayingCard } from './PlayingCard'

interface HandProps {
  hand: Card[]
  isPlayable: (card: Card) => boolean
  selectedIndexes?: number[]
  onCardClick?: (index: number) => void
}

export function Hand({ hand, isPlayable, selectedIndexes = [], onCardClick }: HandProps) {
  return (
    <div className="hand">
      {hand.map((card, index) => (
        <PlayingCard
          key={index}
          card={card}
          playable={isPlayable(card)}
          selected={selectedIndexes.includes(index)}
          onClick={() => onCardClick?.(index)}
        />
      ))}
    </div>
  )
}
