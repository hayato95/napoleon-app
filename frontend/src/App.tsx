import { useEffect, useState } from 'react'
import { io } from 'socket.io-client'
import './App.css'
import { CardExchangeScreen } from './components/CardExchangeScreen'
import type { Card } from './types'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:3001'

function App() {
  const [status, setStatus] = useState('backendに接続中...')
  const [hand, setHand] = useState<Card[]>([])
  const [socket, setSocket] = useState<ReturnType<typeof io> | null>(null)

  const discardCards = (cardIndexes: number[]) => {
    socket?.emit('discardCards', { cardIndexes })
  }

  useEffect(() => {
    const newSocket = io(BACKEND_URL)
    setSocket(newSocket)

    newSocket.on('connect', () => {
      setStatus('接続済み。イベント待機中...')
    })

    newSocket.on('hello', (data: { message: string }) => {
      setStatus(data.message)
    })

    newSocket.on(
      'yourHand',
      (data: { playerId: number; hand: Card[] }) => {
        setHand(data.hand)
      },
    )

    newSocket.on(
      'handAfterDiscard',
      (data: { playerId: number; hand: Card[] }) => {
        setHand(data.hand)
      },
    )

    newSocket.on('connect_error', () => {
      setStatus('backendへの接続に失敗しました')
    })

    return () => {
      newSocket.disconnect()
    }
  }, [])

  return (
    <main>
      <h1>napoleon-app 疎通確認</h1>
      <p>{status}</p>

      <div>
        <h2>あなたの手札</h2>

        <CardExchangeScreen hand={hand} onDiscard={discardCards} />
      </div>
    </main>
  )
}

export default App