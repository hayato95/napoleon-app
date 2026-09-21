import { useEffect, useState } from 'react'
import { io } from 'socket.io-client'
import './App.css'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:3001'

function App() {
  const [status, setStatus] = useState('backendに接続中...')

  useEffect(() => {
    const socket = io(BACKEND_URL)

    socket.on('connect', () => {
      setStatus('接続済み。イベント待機中...')
    })

    socket.on('hello', (data: { message: string }) => {
      setStatus(data.message)
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
    </main>
  )
}

export default App
