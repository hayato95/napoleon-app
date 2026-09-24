import { useEffect, useState } from 'react'
import { io } from 'socket.io-client'
import './App.css'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:3001'

function App() {
  const [status, setStatus] = useState('backendに接続中...')
  const [hand, setHand] = useState<unknown[]>([])

  useEffect(() => {
    const socket = io(BACKEND_URL)

    socket.on('connect', () => {
      setStatus('接続済み。イベント待機中...')
    })

    socket.on('hello', (data: { message: string }) => {
      setStatus(data.message)
    })

    socket.on('yourHand', (data: { playerId: number; hand: unknown[] }) => {
  setHand(data.hand)
})

    socket.on('connect_error', () => {
      setStatus('backendへの接続に失敗しました')
    })

    return () => {
      socket.disconnect()
    }
  }, [])

  return (
    <main>
      <h1>napoleon-app 疎通確認</h1>
      <p>{status}</p>

      <div>
  <h2>あなたの手札</h2>

  {hand.map((card, index) => (
    <div key={index}>
      {JSON.stringify(card)}
    </div>
  ))}
</div>
    </main>
  )
}

export default App
