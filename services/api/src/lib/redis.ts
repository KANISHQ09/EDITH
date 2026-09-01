import { createClient, RedisClientType } from 'redis';
import { logger } from './logger';

let redisClient: RedisClientType | null = null;

export async function getRedis(): Promise<RedisClientType> {
  if (!redisClient) {
    redisClient = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      socket: { connectTimeout: 15000 },
    });

    redisClient.on('error', (err) => {
      logger.error({ message: 'API Redis client error', error: err.message, service: 'api' });
    });

    await redisClient.connect();
    logger.info({ message: 'API Redis publisher connected', service: 'api' });
  }

  return redisClient;
}
