import { useCallback, useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import './App.css'
import { GameScreen } from './components/GameScreen'
import type { PlayerAction, StateUpdate } from './protocol'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:3001'

type Socket = ReturnType<typeof io>

function App() {
  const [status, setStatus] = useState('backendに接続中...')
  const [update, setUpdate] = useState<StateUpdate | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    const socket = io(BACKEND_URL)
    socketRef.current = socket

    socket.on('connect', () => {
      setStatus('接続済み')
    })

    socket.on('hello', (data: { message: string }) => {
      setStatus(data.message)
    })

    socket.on('stateUpdate', (data: StateUpdate) => {
      setActionError(null)
      setUpdate(data)
    })

    socket.on('actionError', (data: { message: string }) => {
      setActionError(data.message)
    })

    socket.on('connect_error', () => {
      setStatus('backendへの接続に失敗しました')
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [])

  const send = useCallback((action: PlayerAction) => {
    setActionError(null)
    socketRef.current?.emit('action', action)
  }, [])

  return (
    <main>
      <h1>ナポレオン</h1>
      <p>{status}</p>
      {actionError !== null && (
        <p role="alert" className="action-error">
          {actionError}
        </p>
      )}

      {update !== null && <GameScreen update={update} send={send} />}
    </main>
  )
}

export default App
