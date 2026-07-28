import { useEffect, useRef } from 'react'
import { Socket } from 'socket.io-client'
import { getSocket } from '../lib/socket/socket.client'

export function useSocket(): Socket {
  const socketRef = useRef<Socket>(getSocket())

  useEffect(() => {
    return () => {
      // Do not disconnect on unmount — shared singleton
    }
  }, [])

  return socketRef.current
}
