import IORedis from 'ioredis'
import { env } from './env'

export const redis = new IORedis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  lazyConnect: true,
  retryStrategy: () => null, // don't retry — Redis is optional in dev
})

redis.on('error', (err) => {
  console.error('Redis connection error:', err.message)
})

// Plain options object for BullMQ — avoids dual-ioredis type clash.
// BullMQ creates its own internal connection from this config.
export function getBullMQConnection(): { host: string; port: number; password?: string; username?: string } {
  const u = new URL(env.REDIS_URL)
  return {
    host: u.hostname,
    port: parseInt(u.port || '6379', 10),
    ...(u.password ? { password: decodeURIComponent(u.password) } : {}),
    ...(u.username ? { username: decodeURIComponent(u.username) } : {}),
  }
}
