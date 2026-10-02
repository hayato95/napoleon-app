import { useState } from 'react'
import type { Card, Rank, Suit } from '../types'
import { PlayingCard } from './PlayingCard'

const SUITS: Suit[] = ['spade', 'diamond', 'heart', 'club']

const RANKS: Rank[] = [
  2, 3, 4, 5, 6, 7, 8, 9, 10, 'J', 'Q', 'K', 'A',
]

function createDeck(): Card[] {
  const cards: Card[] = []

  for (const suit of SUITS) {
    for (const rank of RANKS) {
      cards.push({
        type: 'normal',
        suit,
        rank,
      })
    }
  }

  cards.push({ type: 'joker' })

  return cards
}

const DECK = createDeck()

interface FukukanNominationScreenProps {
  onSelect: (card: Card) => void
}

export function FukukanNominationScreen({
  onSelect,
}: FukukanNominationScreenProps) {
  const [selectedCard, setSelectedCard] = useState<Card | null>(null)

  if (selectedCard !== null) {
    return (
      <div className="fukukan-nomination-screen">
        <h2>副官指名</h2>
        <p>このカードを副官指定カードにしますか？</p>

        <div className="fukukan-selected-card">
          <PlayingCard
            card={selectedCard}
            playable={true}
            selected={false}
          />
        </div>

        <div className="fukukan-confirm-actions">
          <button
            type="button"
            onClick={() => onSelect(selectedCard)}
          >
            このカードに決定
          </button>

          <button
            type="button"
            onClick={() => setSelectedCard(null)}
          >
            戻る
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fukukan-nomination-screen">
      <h2>副官指名</h2>
      <p>副官指定カードを1枚選んでください</p>

      <div className="fukukan-card-list">
        {SUITS.map((suit) => (
          <div className="fukukan-card-row" key={suit}>
            {DECK.filter(
              (card): card is Extract<Card, { type: 'normal' }> =>
                card.type === 'normal' && card.suit === suit,
            ).map((card) => (
              <PlayingCard
                key={`${card.suit}-${card.rank}`}
                card={card}
                playable={true}
                selected={selectedCard === card}
                onClick={() => setSelectedCard(card)}
              />
            ))}
          </div>
        ))}

       <div className="fukukan-card-row fukukan-joker-row">
  <PlayingCard
    card={{ type: 'joker' }}
    playable={true}
    selected={false}
    onClick={() => setSelectedCard({ type: 'joker' })}
  />
</div>
      </div>
    </div>
  )
}