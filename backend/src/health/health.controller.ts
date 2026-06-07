import { Controller, Get, Inject } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import Redis from 'ioredis';

@Controller('health')
export class HealthController {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @Inject('REDIS_CLIENT')
    private readonly redis: Redis,
  ) {}

  @Get()
  async check() {
    const startTime = Date.now();
    const checks: Record<string, any> = {};
    let overallStatus = 'healthy';

    try {
      await this.dataSource.query('SELECT 1');
      checks.database = {
        status: 'healthy',
        responseTime: Date.now() - startTime,
      };
    } catch (error) {
      checks.database = {
        status: 'unhealthy',
        error: error.message,
      };
      overallStatus = 'unhealthy';
    }

    try {
      const redisStart = Date.now();
      await this.redis.ping();
      checks.redis = {
        status: 'healthy',
        responseTime: Date.now() - redisStart,
      };
    } catch (error) {
      checks.redis = {
        status: 'unhealthy',
        error: error.message,
      };
      overallStatus = 'unhealthy';
    }

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      checks,
    };
  }

  @Get('liveness')
  liveness() {
    return {
      status: 'alive',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }

  @Get('readiness')
  async readiness() {
    try {
      await this.dataSource.query('SELECT 1');
      await this.redis.ping();
      return {
        status: 'ready',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: 'not_ready',
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }
}
