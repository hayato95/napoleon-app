import { cardImageSrc, cardLabel } from '../card-utils'
import type { Card, PlayerId } from '../types'

interface CapturedCardsProps {
  playerId: PlayerId
  cards: Card[] // 取った順のまま並べる
}

function isRed(card: Card): boolean {
  return card.type === 'normal' && (card.suit === 'heart' || card.suit === 'diamond')
}

// そのプレイヤーが獲得した絵札を、取った順に左から並べる（FR-40・FR-72）。
// 絵（PC・広い画面用）と文字（狭い画面用）の両方を出しておき、どちらを見せるかは CSS で切り替える。
// data-captured-by は、絵札が勝者の手元に動く演出（#145）の着地点を見つけるための目印
export function CapturedCards({ playerId, cards }: CapturedCardsProps) {
  return (
    <div className="captured" aria-label={`獲得した絵札 ${cards.length}枚`}>
      <ul className="captured-cards" data-captured-by={playerId}>
        {cards.map((card, index) => (
          <li key={index}>
            <img src={cardImageSrc(card)} alt={cardLabel(card)} draggable={false} />
          </li>
        ))}
      </ul>
      <span className="captured-text" aria-hidden="true">
        {cards.map((card, index) => (
          <span key={index} data-red={isRed(card)}>
            {cardLabel(card)}
          </span>
        ))}
      </span>
      <small className="captured-count">絵札 {cards.length}</small>
    </div>
  )
}
