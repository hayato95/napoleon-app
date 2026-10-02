import { useState } from 'react'
import { cardLabel, cardsEqual, SUIT_SYMBOL, trickCardRoleLabel } from '../card-utils'
import { playerName } from '../player-utils'
import type { PlayerView, StateUpdate } from '../protocol'
import { seatOf, seatPositions } from '../seat-layout'
import type { Card, Suit, Trick } from '../types'
import { Hand } from './Hand'
import { PlayingCard } from './PlayingCard'
import { TableLayout } from './TableLayout'

const SUITS: Suit[] = ['spade', 'diamond', 'heart', 'club']
const TOTAL_TRICKS = 10

interface TrickScreenProps {
  update: StateUpdate
  onPlay: (card: Card, leadJokerSuit?: Suit) => void
}

export function TrickScreen({ update, onPlay }: TrickScreenProps) {
  const { view, actorId, playableCards } = update
  const [pendingJoker, setPendingJoker] = useState<Card | null>(null)

  const myTurn = actorId === view.viewerId
  const currentTrick = view.currentTrick
  const lastTrick = view.trickHistory[view.trickHistory.length - 1]
  // 場の中央に出すトリック。進行中のものがあればそれを、なければ（完了した直後なら）直前に完了したものを、次の1枚目が出るまで出し続ける
  const isResultShown = currentTrick === null && lastTrick !== undefined
  const shownTrick = currentTrick ?? lastTrick ?? null
  // 完了した結果を出しているときは、その番号（trickHistory の件数）にする
  const trickNumber = isResultShown ? view.trickHistory.length : Math.min(view.trickHistory.length + 1, TOTAL_TRICKS)
  const isPlayable = (card: Card) => myTurn && playableCards.some((playable) => cardsEqual(playable, card))

  const handleCardClick = (index: number) => {
    const card = view.myHand[index]
    if (!isPlayable(card)) {
      return
    }

    // ジョーカーでリードするときだけ、台札のスートを自分で決める
    if (card.type === 'joker' && currentTrick === null) {
      setPendingJoker(card)
      return
    }
    onPlay(card)
  }

  const playJoker = (suit: Suit) => {
    if (pendingJoker === null) {
      return
    }
    onPlay(pendingJoker, suit)
    setPendingJoker(null)
  }

  const leadSuit = shownTrick === null || isResultShown ? null : leadSuitOf(shownTrick)

  const center = (
    <div className="trick-table">
      {shownTrick !== null && <TrickCards trick={shownTrick} view={view} highlightLatest={!isResultShown} />}

      <div className="trick-info">
        <strong>
          {isResultShown && lastTrick !== undefined
            ? `トリック ${trickNumber} の結果（勝者: ${lastTrick.winnerId === undefined ? '-' : playerName(view, lastTrick.winnerId)}）`
            : `トリック ${trickNumber} / ${TOTAL_TRICKS}`}
        </strong>
        {leadSuit !== null && shownTrick !== null && (
          <span>
            台札 {SUIT_SYMBOL[leadSuit]}（{playerName(view, shownTrick.leaderId)} のリード）
          </span>
        )}
        {currentTrick === null && !myTurn && <span>次のリードを待っています</span>}

        {pendingJoker !== null && (
          <div className="joker-suit-picker" role="group" aria-label="ジョーカーの台札のスート">
            <p>ジョーカーでリードします。台札のスートを選んでください。</p>
            {SUITS.map((suit) => (
              <button key={suit} type="button" onClick={() => playJoker(suit)}>
                {SUIT_SYMBOL[suit]}
              </button>
            ))}
            <button type="button" onClick={() => setPendingJoker(null)}>
              やめる
            </button>
          </div>
        )}
      </div>
    </div>
  )

  const handHint = !myTurn
    ? undefined
    : currentTrick === null
      ? 'あなたがリードします。出すカードを選んでください'
      : '光っているカードを出せます'

  return (
    <TableLayout
      view={view}
      actorId={actorId}
      center={center}
      handHint={handHint}
      hand={<Hand hand={view.myHand} isPlayable={isPlayable} onCardClick={handleCardClick} />}
    />
  )
}

// 台札のスート。ジョーカーでリードしたときは、リードした人が決めたスート
function leadSuitOf(trick: Trick): Suit | null {
  const firstCard = trick.plays[0]?.card
  return trick.leadJokerSuit ?? (firstCard?.type === 'normal' ? firstCard.suit : null)
}

interface TrickCardsProps {
  trick: Trick
  view: PlayerView
  highlightLatest?: boolean // 進行中のトリックで、直前に出たカードを目立たせる
}

// 場に出たカード。出した人の座席の方向に置く（自分は手前、CPU は左・上・右）
function TrickCards({ trick, view, highlightLatest = false }: TrickCardsProps) {
  const seats = seatPositions(view.turnOrder, view.viewerId)
  const latestPlayerId = highlightLatest ? trick.plays[trick.plays.length - 1]?.playerId : undefined
  const leadSuit = leadSuitOf(trick)
  const hasWinner = trick.winnerId !== undefined

  return (
    <ul className="trick-cards">
      {trick.plays.map((play) => {
        const roleLabel = view.trumpSuit === null ? null : trickCardRoleLabel(play.card, view.trumpSuit, leadSuit)

        return (
          <li
            key={play.playerId}
            data-seat={seatOf(seats, play.playerId)}
            data-winner={play.playerId === trick.winnerId}
            data-loser={hasWinner && play.playerId !== trick.winnerId}
            data-latest={play.playerId === latestPlayerId}
          >
            <span className="trick-player-name">{playerName(view, play.playerId)}</span>
            <PlayingCard card={play.card} playable={true} />
            <span className="visually-hidden">{cardLabel(play.card)}</span>
            {roleLabel !== null && <span className="trick-card-role">{roleLabel}</span>}
            {play.playerId === latestPlayerId && <span className="latest-badge">いま出した</span>}
          </li>
        )
      })}
    </ul>
  )
}
