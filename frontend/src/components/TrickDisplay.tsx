import { useEffect, useMemo, useState } from 'react'
import type { Card, Rank, Suit } from '../types'
import { PlayingCard } from './PlayingCard'

export type PlayerId = 0 | 1 | 2 | 3 | 4

export type TrickPlay = {
  playerId: PlayerId
  card: Card
}

interface TrickDisplayProps {
  plays: TrickPlay[]
  trumpSuit: Suit
  winnerPlayerId: PlayerId | null
  winnerReason: string | null
  onNextTrick?: () => void
}

const PICTURE_RANKS: Rank[] = [10, 'J', 'Q', 'K', 'A']

const SAME_COLOR_SUIT: Record<Suit, Suit> = {
  spade: 'club',
  club: 'spade',
  diamond: 'heart',
  heart: 'diamond',
}

function isPictureCard(card: Card): boolean {
  return card.type === 'normal' && PICTURE_RANKS.includes(card.rank)
}

/*
 * カードを出した瞬間に表示する名前。
 *
 * 優先順位：
 * 固有名
 * ↓
 * 切り札
 * ↓
 * 親と同じスート
 * ↓
 * 絵札
 * ↓
 * 表示なし
 */
function getCardLabel(
  card: Card,
  trumpSuit: Suit,
  leadSuit: Suit | null,
): string | null {
  /*
   * ジョーカーは実際に出された瞬間に
   * 「ジョーカー請求」と表示する。
   */
  if (card.type === 'joker') {
    return 'ジョーカー請求'
  }

  /*
   * 固有名
   */

  // ♠A
  if (card.suit === 'spade' && card.rank === 'A') {
    return 'オールマイティ'
  }

  // 切り札のJ
  if (card.rank === 'J' && card.suit === trumpSuit) {
    return '正ジャック'
  }

  // 切り札と同色のJ
  if (
    card.rank === 'J' &&
    card.suit === SAME_COLOR_SUIT[trumpSuit]
  ) {
    return '裏ジャック'
  }

  /*
   * 切り札
   */
  if (card.suit === trumpSuit) {
    return '切り札'
  }

  /*
   * 親と同じスート
   *
   * 絵札であっても、こちらを優先する。
   */
  if (leadSuit !== null && card.suit === leadSuit) {
    return '親と同じスート'
  }

  /*
   * 10 / J / Q / K / A
   */
  if (isPictureCard(card)) {
    return '絵札'
  }

  return null
}

export function TrickDisplay({
  plays,
  trumpSuit,
  winnerPlayerId,
  winnerReason,
  onNextTrick,
}: TrickDisplayProps) {
  const [winnerAnimation, setWinnerAnimation] = useState(false)

  /*
   * そのトリックで最初に出されたカードのスート。
   */
  const leadSuit = useMemo(() => {
    const firstPlay = plays[0]

    if (firstPlay?.card.type === 'normal') {
      return firstPlay.card.suit
    }

    return null
  }, [plays])

  /*
   * 5枚目が出てから1秒後に勝者演出。
   *
   * 勝者演出開始：
   *   5枚目が出る
   *       ↓ 1秒
   *   勝者カード拡大・他カードぼかし
   *       ↓ 2秒
   *   次のトリックへ
   */
  useEffect(() => {
    setWinnerAnimation(false)

    if (plays.length !== 5 || winnerPlayerId === null) {
      return
    }

    const winnerTimer = window.setTimeout(() => {
      setWinnerAnimation(true)
    }, 1000)

    const nextTrickTimer = window.setTimeout(() => {
      onNextTrick?.()
    }, 3000)

    return () => {
      window.clearTimeout(winnerTimer)
      window.clearTimeout(nextTrickTimer)
    }
  }, [plays, winnerPlayerId, onNextTrick])

  return (
    <section className="trick-display">
      <h2>トリック</h2>

      <div
        className="trick-cards"
        data-winner-animation={winnerAnimation}
      >
        {plays.map((play, index) => {
          const isWinner =
            winnerAnimation &&
            winnerPlayerId !== null &&
            play.playerId === winnerPlayerId

          const isLoser =
            winnerAnimation &&
            winnerPlayerId !== null &&
            play.playerId !== winnerPlayerId

          const cardLabel = getCardLabel(
            play.card,
            trumpSuit,
            leadSuit,
          )

          return (
            <div
              key={`${play.playerId}-${index}`}
              className="trick-card"
              data-winner={isWinner}
              data-loser={isLoser}
            >
              <div className="trick-player">
                Player {play.playerId}
              </div>

              <div className="trick-card-image">
                <PlayingCard
                  card={play.card}
                  playable={false}
                />
              </div>

              {cardLabel !== null && (
                <div className="trick-card-label">
                  {cardLabel}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {winnerAnimation && winnerPlayerId !== null && (
        <div className="trick-winner">
          <div className="trick-winner-player">
            勝者：Player {winnerPlayerId}
          </div>

          {winnerReason !== null && (
            <div className="trick-winner-reason">
              {winnerReason}
            </div>
          )}
        </div>
      )}
    </section>
  )
}