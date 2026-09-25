import { useEffect, useState } from 'react'
import { io } from 'socket.io-client'
import './App.css'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:3001'

function App() {
  const [status, setStatus] = useState('backendに接続中...')
  const [hand, setHand] = useState<unknown[]>([])
const [selectedCards, setSelectedCards] = useState<number[]>([])  

const [newSocket, setSocket] = useState<ReturnType<typeof io> | null>(null)

const toggleCardSelection = (index: number) => {
  setSelectedCards((current) => {
    if (current.includes(index)) {
      return current.filter((i) => i !== index)
    }

    if (current.length >= 3) {
      return current
    }

    return [...current, index]
  })
}

const discardSelectedCards = () => {
  if (selectedCards.length !== 3 || socket === null) {
    return
  }

  socket.emit('discardCards', {
    cardIndexes: selectedCards,
  })
}

useEffect(() => {
  const newSocket = io(BACKEND_URL)
  setSocket(newSocket)

  newSocket.on('connect', () => {

      setStatus('接続済み。イベント待機中...')
    })

    newSocket.on(...)('hello', (data: { message: string }) => {
      setStatus(data.message)
    })

    newSocket.on('yourHand', (data: { playerId: number; hand: unknown[] }) => {
  setHand(data.hand)
})

newSocket.on(
  'handAfterDiscard',
  (data: { playerId: number; hand: unknown[] }) => {
    setHand(data.hand)
    setSelectedCards([])
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

{hand.map((card, index) => (
  <div
    key={index}
    onClick={() => toggleCardSelection(index)}
    style={{
      cursor: 'pointer',
      border: selectedCards.includes(index)
        ? '2px solid red'
        : '1px solid black',
      padding: '8px',
      margin: '4px',
    }}
  >
    {JSON.stringify(card)}
  </div>
))}

<button
  onClick={discardSelectedCards}
  disabled={selectedCards.length !== 3}
>
  選択した3枚を捨てる
</button>

</div>
    </main>
  )
}

export default App
