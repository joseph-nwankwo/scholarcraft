/**
 * k6 WebSocket Load Test — LectureCraft
 * Run: k6 run tests/load/websocket.k6.js
 * Target: 1,000 concurrent WebSocket connections
 */
import ws from 'k6/ws'
import { check, sleep } from 'k6'
import { Rate, Gauge, Counter } from 'k6/metrics'

const wsConnectRate   = new Rate('ws_connect_success')
const wsErrorRate     = new Rate('ws_errors')
const wsMessagesTotal = new Counter('ws_messages_sent')
const wsActiveConns   = new Gauge('ws_active_connections')

export const options = {
  scenarios: {
    websocket_load: {
      executor:   'ramping-vus',
      startVUs:   0,
      stages: [
        { duration: '1m',  target: 100  },
        { duration: '3m',  target: 500  },
        { duration: '5m',  target: 1000 },
        { duration: '3m',  target: 1000 },
        { duration: '1m',  target: 0    },
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: {
    ws_connect_success: ['rate>0.95'],   // 95%+ must connect
    ws_errors:          ['rate<0.05'],   // less than 5% errors
  },
}

const BASE_URL = (__ENV.BASE_URL ?? 'http://localhost:4000').replace(/^http/, 'ws')
const TOKEN    = __ENV.TEST_TOKEN ?? 'test-jwt-token'

export default function () {
  wsActiveConns.add(1)

  const url = `${BASE_URL}/socket.io/?EIO=4&transport=websocket&token=${TOKEN}`

  const res = ws.connect(url, {}, (socket) => {
    const connected = true

    socket.on('open', () => {
      wsConnectRate.add(true)

      // Socket.IO handshake
      socket.send('40')

      // Send heartbeat every 5 seconds
      socket.setInterval(() => {
        socket.send('42["heartbeat",{"timestamp":' + Date.now() + '}]')
        wsMessagesTotal.add(1)
      }, 5000)

      // Simulate typing indicator
      socket.setInterval(() => {
        socket.send('42["typing:start",{"conversationId":"test-conv-123"}]')
        wsMessagesTotal.add(1)
      }, 15000)
    })

    socket.on('message', (data) => {
      if (typeof data === 'string' && data.startsWith('40')) {
        // Socket.IO connected
      } else if (data === '2') {
        // Ping — respond with pong
        socket.send('3')
      }
    })

    socket.on('error', (e) => {
      wsErrorRate.add(true)
      console.error(`WS error for VU ${__VU}:`, e.error())
    })

    socket.on('close', () => {
      wsActiveConns.add(-1)
    })

    // Hold connection for the duration of the test iteration
    socket.setTimeout(() => {
      socket.close()
    }, 30000)
  })

  const connectOk = check(res, {
    'WS connected': (r) => r && r.status === 101,
  })
  if (!connectOk) wsErrorRate.add(true)

  sleep(1)
}
