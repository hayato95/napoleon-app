import { useState } from 'react'
import type { StateUpdate } from '../protocol'
import { Hand } from './Hand'
import { TableLayout } from './TableLayout'

const DISCARD_COUNT = 3
// 受け取った場札の枚数。サーバーが手札の末尾に足すので、末尾のこの枚数が場札
const WIDOW_COUNT = 3

interface CardExchangeScreenProps {
  update: StateUpdate
  onDiscard: (indexes: number[]) => void
}

// カード交換（FR-38）。捨てる3枚は下の手札から選び、説明とボタンはテーブル中央に出す（FR-73）
export function CardExchangeScreen({ update, onDiscard }: CardExchangeScreenProps) {
  const { view, actorId } = update
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
    <TableLayout
      view={view}
      actorId={actorId}
      center={
        <div className="card-exchange-screen">
          <h2>カード交換</h2>
          <p>場の3枚を受け取りました。いらない3枚を手札から選んでください。</p>
          <button
            type="button"
            className="primary-button"
            onClick={handleDiscard}
            disabled={selectedIndexes.length !== DISCARD_COUNT}
          >
            選択した3枚を捨てる（{selectedIndexes.length}/{DISCARD_COUNT}）
          </button>
        </div>
      }
      handHint="捨てるカードをタップしてください"
      hand={
        <Hand
          hand={view.myHand}
          isPlayable={() => true}
          selectedIndexes={selectedIndexes}
          onCardClick={toggleCardSelection}
          unsortedTailCount={WIDOW_COUNT}
        />
      }
    />
  )
}
