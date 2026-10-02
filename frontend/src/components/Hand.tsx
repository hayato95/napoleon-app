import { handDisplayOrder } from '../card-utils'
import type { Card } from '../types'
import { PlayingCard } from './PlayingCard'

interface HandProps {
  hand: Card[]
  isPlayable: (card: Card) => boolean
  selectedIndexes?: number[]
  onCardClick?: (index: number) => void
  unsortedTailCount?: number // hand の末尾のこの枚数は並べ替えず、右端にそのまま置く（カード交換画面の場札用）
}

export function Hand({ hand, isPlayable, selectedIndexes = [], onCardClick, unsortedTailCount = 0 }: HandProps) {
  // 表示だけをスート順に並べ替える。index は元の hand の番号のままなので、親の画面はこれまでどおり扱える
  const displayOrder = handDisplayOrder(hand, unsortedTailCount)

  return (
    <div className="hand">
      {displayOrder.map((index) => (
        <PlayingCard
          key={index}
          card={hand[index]}
          playable={isPlayable(hand[index])}
          selected={selectedIndexes.includes(index)}
          onClick={() => onCardClick?.(index)}
        />
      ))}
    </div>
  )
}
