import { useState } from 'react'
import { cardLabel, cardsEqual, SUIT_SYMBOL, trickCardRoleLabel } from '../card-utils'
import type { PlayerView, StateUpdate } from '../protocol'
import type { Card, Suit, Trick } from '../types'
import { CapturedCards } from './CapturedCards'
import { Hand } from './Hand'
import { PlayingCard } from './PlayingCard'
import { playerName } from '../player-utils'
import { TableInfo } from './TableInfo'

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

  return (
    <div className="trick-screen">
      <TableInfo view={view} />

      <ul className="seat-list" aria-label="プレイヤー">
        {view.players.map((player) => (
          <li key={player.id} data-active={player.id === actorId}>
            <strong>{player.name}</strong>
            {player.id === view.napoleonId && <span className="role">ナポレオン</span>}
            {view.fukukanRevealed && player.id === view.fukukanId && <span className="role">副官</span>}
            <span>手札 {player.handCount}枚</span>
            <span>絵札 {view.capturedCards[player.id].length}枚</span>
            <CapturedCards playerId={player.id} cards={view.capturedCards[player.id]} />
          </li>
        ))}
      </ul>

      <section className="trick-table" aria-label="場">
        <h2>
          {isResultShown && lastTrick !== undefined
            ? `トリック ${trickNumber} の結果（勝者: ${lastTrick.winnerId === undefined ? '-' : playerName(view, lastTrick.winnerId)}）`
            : `トリック ${trickNumber}/${TOTAL_TRICKS}`}
        </h2>

        {shownTrick !== null && <TrickCards trick={shownTrick} view={view} highlightLatest={!isResultShown} />}

        {currentTrick === null && <p>{myTurn ? 'あなたがリードします。出すカードを選んでください。' : 'CPUの手番です。'}</p>}
      </section>

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

      {myTurn && currentTrick !== null && <p className="turn-hint">あなたの番です。出せるカードを選んでください。</p>}

      <Hand hand={view.myHand} isPlayable={isPlayable} onCardClick={handleCardClick} />
    </div>
  )
}

interface TrickCardsProps {
  trick: Trick
  view: PlayerView
  highlightLatest?: boolean // 進行中のトリックで、直前に出たカードを目立たせる
}

function TrickCards({ trick, view, highlightLatest = false }: TrickCardsProps) {
  const latestPlayerId = highlightLatest ? trick.plays[trick.plays.length - 1]?.playerId : undefined
  // 台札のスート。ジョーカーでリードしたときは、リードした人が決めたスート
  const firstCard = trick.plays[0]?.card
  const leadSuit = trick.leadJokerSuit ?? (firstCard?.type === 'normal' ? firstCard.suit : null)
  const hasWinner = trick.winnerId !== undefined

  return (
    <ul className="trick-cards">
      {trick.plays.map((play) => {
        const roleLabel = view.trumpSuit === null ? null : trickCardRoleLabel(play.card, view.trumpSuit, leadSuit)

        return (
          <li
            key={play.playerId}
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
