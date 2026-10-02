import { useEffect, useState } from 'react'
import { io } from 'socket.io-client'
import './App.css'
import { FukukanNominationScreen } from './components/FukukanNominationScreen'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:3001'

function App() {
  const [status, setStatus] = useState('backendに接続中...')

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

  return (
    <main>
      <h1>napoleon-app 疎通確認</h1>
      <p>{status}</p>

      <div>
    

        <FukukanNominationScreen
          onSelect={(card) => {
            console.log('副官指定カード:', card)
          }}
        />
      </div>
    </main>
  )
}

export default App