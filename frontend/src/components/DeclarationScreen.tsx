import { useState } from 'react'
import type { Suit } from '../types'
import { MIN_DECLARED_CARD_COUNT, MAX_DECLARED_CARD_COUNT } from '../declaration-limit'

const SUITS: Suit[] = ['spade', 'diamond', 'heart', 'club']

const SUIT_ICON_SRC: Record<Suit, string> = {
  spade: '/cards/card_spades_suit.png',
  diamond: '/cards/card_diamonds_suit.png',
  heart: '/cards/card_hearts_suit.png',
  club: '/cards/card_clubs_suit.png',
}

const DECLARABLE_COUNTS: number[] = Array.from(
  { length: MAX_DECLARED_CARD_COUNT - MIN_DECLARED_CARD_COUNT + 1 },
  (_, i) => MIN_DECLARED_CARD_COUNT + i,
)

interface DeclarationScreenProps {
  onDeclare: (suit: Suit, count: number) => void
  onPass: () => void
}

export function DeclarationScreen({ onDeclare, onPass }: DeclarationScreenProps) {
  const [selectedSuit, setSelectedSuit] = useState<Suit | null>(null)
  const [selectedCount, setSelectedCount] = useState<number>(MIN_DECLARED_CARD_COUNT)

  const handleDeclare = () => {
    if (selectedSuit === null) {
      return
    }
    onDeclare(selectedSuit, selectedCount)
  }

  return (
    <div className="declaration-screen">
      <div className="declaration-suits">
        {SUITS.map((suit) => (
          <button
            key={suit}
            type="button"
            className="suit-button"
            data-selected={selectedSuit === suit}
            onClick={() => setSelectedSuit(suit)}
          >
            <img src={SUIT_ICON_SRC[suit]} alt={suit} draggable={false} />
          </button>
        ))}
      </div>

      <select
        value={selectedCount}
        onChange={(e) => setSelectedCount(Number(e.target.value))}
        aria-label="宣言する枚数"
      >
        {DECLARABLE_COUNTS.map((count) => (
          <option key={count} value={count}>
            {count}枚
          </option>
        ))}
      </select>

      <div className="declaration-actions">
        <button type="button" onClick={handleDeclare} disabled={selectedSuit === null}>
          宣言する
        </button>
        <button type="button" onClick={onPass}>
          パス
        </button>
      </div>
    </div>
  )
}
