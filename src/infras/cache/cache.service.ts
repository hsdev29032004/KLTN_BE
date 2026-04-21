import { Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private readonly client: Redis | null;

  constructor() {
    try {
      this.client = new Redis({
        host: process.env.REDIS_HOST || '127.0.0.1',
        port: Number(process.env.REDIS_PORT || 6379),
      });
      this.client.on('error', (err) =>
        this.logger.error('Redis error', err as any),
      );
    } catch (err) {
      this.logger.warn('Failed to initialize Redis client', err as any);
      this.client = null;
    }
  }

  async set(key: string, value: string, ttlSeconds?: number) {
    if (!this.client) return;
    if (typeof ttlSeconds === 'number') {
      await this.client.set(key, value, 'EX', ttlSeconds);
    } else {
      await this.client.set(key, value);
    }
  }

  async get(key: string): Promise<string | undefined> {
    if (!this.client) return undefined;
    const v = await this.client.get(key);
    return v ?? undefined;
  }

  async del(key: string) {
    if (!this.client) return;
    await this.client.del(key);
  }
}
