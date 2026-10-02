import { cardImageSrc, cardLabel } from '../card-utils'
import type { Card, PlayerId } from '../types'

interface CapturedCardsProps {
  playerId: PlayerId
  cards: Card[] // 取った順のまま並べる
}

// そのプレイヤーが獲得した絵札を、小さなカードの絵で並べる。操作できないので、ボタンではなく画像だけにしている。
// data-captured-by は、絵札が勝者の手元に動く演出（#145）の着地点を見つけるための目印
export function CapturedCards({ playerId, cards }: CapturedCardsProps) {
  return (
    <ul className="captured-cards" data-captured-by={playerId} aria-label="獲得した絵札">
      {cards.map((card, index) => (
        <li key={index}>
          <img src={cardImageSrc(card)} alt={cardLabel(card)} draggable={false} />
        </li>
      ))}
    </ul>
  )
}
