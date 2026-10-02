import { useState } from 'react'
import { Hand } from './Hand'
import type { Card } from '../types'

const DISCARD_COUNT = 3
// 受け取った場札の枚数。サーバーが手札の末尾に足すので、末尾のこの枚数が場札
const WIDOW_COUNT = 3

interface CardExchangeScreenProps {
  hand: Card[]
  onDiscard: (indexes: number[]) => void
}

export function CardExchangeScreen({ hand, onDiscard }: CardExchangeScreenProps) {
  const [selectedIndexes, setSelectedIndexes] = useState<number[]>([])

  const toggleCardSelection = (index: number) => {
    setSelectedIndexes((current) => {
      if (current.includes(index)) {
        return current.filter((i) => i !== index)
      }

      if (current.length >= DISCARD_COUNT) {
        return current
      }

      return [...current, index]
    })
  }

  const handleDiscard = () => {
    if (selectedIndexes.length !== DISCARD_COUNT) {
      return
    }
    onDiscard(selectedIndexes)
    setSelectedIndexes([])
  }

  return (
    <div className="card-exchange-screen">
      <Hand
        hand={hand}
        isPlayable={() => true}
        selectedIndexes={selectedIndexes}
        onCardClick={toggleCardSelection}
        unsortedTailCount={WIDOW_COUNT}
      />

      <button onClick={handleDiscard} disabled={selectedIndexes.length !== DISCARD_COUNT}>
        選択した3枚を捨てる
      </button>
    </div>
  )
}
