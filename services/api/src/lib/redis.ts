import { createClient, RedisClientType } from 'redis';
import { logger } from './logger';

let redisClient: RedisClientType | null = null;

export async function getRedis(): Promise<RedisClientType | null> {
  try {
    if (!redisClient || !redisClient.isOpen) {
      redisClient = createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        socket: {
          connectTimeout: 5000,
          reconnectStrategy: (retries) => Math.min(retries * 100, 3000),
        },
      });

      redisClient.on('error', (err) => {
        logger.warn({ message: 'Redis client warning', error: err.message, service: 'api' });
      });

      await redisClient.connect();
      logger.info({ message: 'API Redis publisher connected', service: 'api' });
    }
    return redisClient;
  } catch (err: any) {
    logger.warn({ message: 'Could not connect to Redis, continuing in degraded mode', error: err.message });
    return null;
  }
}

export async function safePublish(channel: string, message: string): Promise<void> {
  try {
    const redis = await getRedis();
    if (redis && redis.isOpen) {
      await redis.publish(channel, message);
    }
  } catch (err: any) {
    logger.warn({ message: 'Redis safePublish skipped', channel, error: err.message });
  }
}
