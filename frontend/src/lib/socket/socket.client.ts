import { io, Socket } from 'socket.io-client'

let socket: Socket | null = null

export function getSocket(): Socket {
  if (!socket || !socket.connected) {
    const token = localStorage.getItem('accessToken')
    socket = io(import.meta.env.VITE_API_URL?.replace('/api', '') ?? 'http://localhost:4000', {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      autoConnect: true,
    })

    socket.on('connect_error', (err) => {
      if (err.message === 'AUTH_REQUIRED' || err.message === 'INVALID_TOKEN') {
        socket?.disconnect()
      }
    })
  }
  return socket
}

export function disconnectSocket() {
  socket?.disconnect()
  socket = null
}
