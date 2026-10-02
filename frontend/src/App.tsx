import { useCallback, useEffect, useState } from 'react'
import { io } from 'socket.io-client'
import './App.css'
import { FukukanNominationScreen } from './components/FukukanNominationScreen'
import { TrickDisplay, type TrickPlay } from './components/TrickDisplay'
import type { Suit } from './types'

const BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:3001'

type DemoPhase =
  | 'dealing'
  | 'declaration'
  | 'fukukanNomination'
  | 'cardExchange'
  | 'trick'
  | 'result'

const DEMO_PHASES: DemoPhase[] = [
  'dealing',
  'declaration',
  'fukukanNomination',
  'cardExchange',
  'trick',
  'result',
]

const DEMO_TRICKS: {
  plays: TrickPlay[]
  trumpSuit: Suit
  winnerPlayerId: 0 | 1 | 2 | 3 | 4
  winnerReason: string
}[] = [
  {
    trumpSuit: 'heart',
    plays: [
      {
        playerId: 0,
        card: { type: 'normal', suit: 'heart', rank: 5 },
      },
      {
        playerId: 1,
        card: { type: 'normal', suit: 'heart', rank: 'Q' },
      },
      {
        playerId: 2,
        card: { type: 'normal', suit: 'heart', rank: 10 },
      },
      {
        playerId: 3,
        card: { type: 'normal', suit: 'heart', rank: 'K' },
      },
      {
        playerId: 4,
        card: { type: 'normal', suit: 'heart', rank: 7 },
      },
    ],
    winnerPlayerId: 1,
    winnerReason: '切り札',
  },
]

function App() {
  const [status, setStatus] = useState('backendに接続中...')

  const [phaseIndex, setPhaseIndex] = useState(0)
  const [visibleCount, setVisibleCount] = useState(0)
  const [trickIndex, setTrickIndex] = useState(0)

  const phase = DEMO_PHASES[phaseIndex]
  const currentTrick = DEMO_TRICKS[trickIndex]

  useEffect(() => {
    const newSocket = io(BACKEND_URL)

    newSocket.on('connect', () => {
      setStatus('接続済み。イベント待機中...')
    })

    newSocket.on('hello', (data: { message: string }) => {
      setStatus(data.message)
    })

    newSocket.on('connect_error', () => {
      setStatus('backendへの接続に失敗しました')
    })

    return () => {
      newSocket.disconnect()
    }
  }, [])

  /*
   * デモでは各フェーズを順番に表示する。
   *
   * 実際のゲームでは、ここをGameState.phaseに置き換える。
   */
  useEffect(() => {
    if (phase === 'trick') {
      return
    }

    const timer = window.setTimeout(() => {
      setPhaseIndex((currentIndex) => {
        return (currentIndex + 1) % DEMO_PHASES.length
      })
    }, 3000)

    return () => {
      window.clearTimeout(timer)
    }
  }, [phase])

  /*
   * トリックフェーズでは、デモとして1秒ごとに
   * 1枚ずつカードを表示する。
   */
  useEffect(() => {
    if (phase !== 'trick') {
      setVisibleCount(0)
      return
    }

    if (visibleCount >= currentTrick.plays.length) {
      return
    }

    const timer = window.setTimeout(() => {
      setVisibleCount((count) => count + 1)
    }, 1000)

    return () => {
      window.clearTimeout(timer)
    }
  }, [phase, visibleCount, currentTrick.plays.length])

  /*
   * トリック終了後にTrickDisplayから呼ばれる。
   *
   * 実際のゲームではGameStateを次の状態へ進める処理に置き換える。
   */
  const startNextTrick = useCallback(() => {
    setVisibleCount(0)

    setTrickIndex((currentIndex) => {
      return (currentIndex + 1) % DEMO_TRICKS.length
    })

    setPhaseIndex((currentIndex) => {
      const trickPhaseIndex = DEMO_PHASES.indexOf('trick')

      /*
       * 今回のデモでは、トリック終了後に結果フェーズへ進む。
       */
      if (currentIndex === trickPhaseIndex) {
        return DEMO_PHASES.indexOf('result')
      }

      return currentIndex
    })
  }, [])

  const visiblePlays = currentTrick.plays.slice(0, visibleCount)

  return (
    <main>
      <h1>napoleon-app 疎通確認</h1>
      <p>{status}</p>

      <p>
        現在のフェーズ：{phase}
      </p>

      {phase === 'fukukanNomination' && (
        <FukukanNominationScreen
          onSelect={(card) => {
            console.log('副官指定カード:', card)
          }}
        />
      )}

      {phase === 'cardExchange' && (
        <section className="phase-placeholder">
          <h2>カード交換</h2>
          <p>カード交換フェーズです。</p>
        </section>
      )}

      {phase === 'trick' && (
        <TrickDisplay
          plays={visiblePlays}
          trumpSuit={currentTrick.trumpSuit}
          winnerPlayerId={
            visibleCount === currentTrick.plays.length
              ? currentTrick.winnerPlayerId
              : null
          }
          winnerReason={
            visibleCount === currentTrick.plays.length
              ? currentTrick.winnerReason
              : null
          }
          onNextTrick={startNextTrick}
        />
      )}

      {phase === 'dealing' && (
        <section className="phase-placeholder">
          <h2>カード配布</h2>
          <p>カード配布フェーズです。</p>
        </section>
      )}

      {phase === 'declaration' && (
        <section className="phase-placeholder">
          <h2>宣言・競り</h2>
          <p>宣言・競りのフェーズです。</p>
        </section>
      )}

      {phase === 'result' && (
        <section className="phase-placeholder">
          <h2>結果</h2>
          <p>トリック終了後の結果フェーズです。</p>
        </section>
      )}
    </main>
  )
}

export default App