import { Global, Module, Logger, OnModuleInit, Inject } from '@nestjs/common';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';

@Global()
@Module({
  providers: [
    {
      provide: 'REDIS_CLIENT',
      useFactory: (configService: ConfigService) => {
        const logger = new Logger('RedisModule');
        const redis = new Redis({
          host: configService.get('REDIS_HOST', 'localhost'),
          port: configService.get('REDIS_PORT', 6379),
          password: configService.get('REDIS_PASSWORD') || undefined,
          db: configService.get('REDIS_DB', 0),
          retryDelayOnFailover: 100,
          retryDelayOnClusterDown: 100,
          enableOfflineQueue: true,
          maxRetriesPerRequest: 3,
          retryStrategy: (times) => {
            const delay = Math.min(times * 100, 3000);
            logger.warn(`Redis connection retry ${times}, next retry in ${delay}ms`);
            return delay;
          },
        });

        redis.on('connect', () => {
          logger.log('Redis client connected');
        });

        redis.on('ready', () => {
          logger.log('Redis client ready');
        });

        redis.on('error', (error) => {
          logger.error(`Redis client error: ${error.message}`);
        });

        redis.on('close', () => {
          logger.warn('Redis connection closed');
        });

        redis.on('reconnecting', () => {
          logger.log('Redis client reconnecting...');
        });

        return redis;
      },
      inject: [ConfigService],
    },
  ],
  exports: ['REDIS_CLIENT'],
})
export class RedisModule implements OnModuleInit {
  private readonly logger = new Logger(RedisModule.name);

  constructor(@Inject('REDIS_CLIENT') private readonly redis: Redis) {}

  async onModuleInit() {
    try {
      await this.redis.ping();
      this.logger.log('Redis connection verified successfully');
    } catch (error) {
      this.logger.error('Redis connection verification failed:', error.message);
    }
  }
}
