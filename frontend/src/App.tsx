import { useCallback, useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import './App.css'
import { GameScreen } from './components/GameScreen'
import { StartScreen } from './components/StartScreen'
import type { PlayerAction, StateUpdate } from './protocol'
import { useStepPlayback } from './use-step-playback'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:3001'

type Socket = ReturnType<typeof io>

function App() {
  const [status, setStatus] = useState('backendに接続中...')
  const [accepted, setAccepted] = useState(false) // 満員で断られたときは false のまま
  const [update, pushUpdates] = useStepPlayback() // 途中の状態を、間を置いて順に見せる（#143）
  const [actionError, setActionError] = useState<string | null>(null)
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    const socket = io(BACKEND_URL)
    socketRef.current = socket

    socket.on('connect', () => {
      setStatus('接続済み')
    })

    socket.on('hello', (data: { message: string; accepted: boolean }) => {
      setStatus(data.message)
      setAccepted(data.accepted)
    })

    socket.on('stateUpdates', (data: StateUpdate[]) => {
      setActionError(null)
      pushUpdates(data)
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
  }, [pushUpdates])

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

      {update === null && accepted && <StartScreen onStart={() => send({ type: 'startGame' })} />}
      {update !== null && <GameScreen update={update} send={send} />}
    </main>
  )
}

export default App
