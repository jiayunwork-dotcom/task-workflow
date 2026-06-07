import {
  Injectable,
  NotFoundException,
  ConflictException,
  Inject,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Redis from 'ioredis';
import { Queue } from './entities/queue.entity';
import { CreateQueueDto, UpdateQueueDto } from './dto/queue.dto';
import { PaginationDto, PaginatedResponseDto } from '../common/dto/pagination.dto';

export const QUEUE_KEY_PREFIX = 'queue:';
export const DELAYED_QUEUE_KEY_PREFIX = 'queue:delayed:';
export const DEAD_LETTER_QUEUE_KEY_PREFIX = 'queue:dead_letter:';
export const RUNNING_TASKS_KEY_PREFIX = 'queue:running:';

@Injectable()
export class QueuesService {
  constructor(
    @InjectRepository(Queue)
    private queueRepository: Repository<Queue>,
    @Inject('REDIS_CLIENT')
    private redis: Redis,
  ) {}

  async create(createQueueDto: CreateQueueDto): Promise<Queue> {
    const existing = await this.queueRepository.findOne({
      where: { name: createQueueDto.name },
    });
    if (existing) {
      throw new ConflictException(`Queue "${createQueueDto.name}" already exists`);
    }

    const queue = this.queueRepository.create(createQueueDto);
    return this.queueRepository.save(queue);
  }

  async findAll(
    paginationDto: PaginationDto,
  ): Promise<PaginatedResponseDto<Queue>> {
    const { page, limit } = paginationDto;
    const [data, total] = await this.queueRepository.findAndCount({
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<Queue> {
    const queue = await this.queueRepository.findOne({ where: { id } });
    if (!queue) {
      throw new NotFoundException(`Queue with ID "${id}" not found`);
    }
    return queue;
  }

  async findByName(name: string): Promise<Queue> {
    const queue = await this.queueRepository.findOne({ where: { name } });
    if (!queue) {
      throw new NotFoundException(`Queue "${name}" not found`);
    }
    return queue;
  }

  async update(id: string, updateQueueDto: UpdateQueueDto): Promise<Queue> {
    const queue = await this.findOne(id);
    Object.assign(queue, updateQueueDto);
    return this.queueRepository.save(queue);
  }

  async remove(id: string): Promise<void> {
    const queue = await this.findOne(id);
    const depth = await this.getQueueDepth(queue.name);
    if (depth > 0) {
      throw new ConflictException(
        `Cannot delete queue with pending tasks. Queue depth: ${depth}`,
      );
    }
    await this.queueRepository.delete(id);
    await this.redis.del(QUEUE_KEY_PREFIX + queue.name);
    await this.redis.del(DELAYED_QUEUE_KEY_PREFIX + queue.name);
    await this.redis.del(DEAD_LETTER_QUEUE_KEY_PREFIX + queue.name);
  }

  async pause(id: string): Promise<Queue> {
    const queue = await this.findOne(id);
    queue.isPaused = true;
    return this.queueRepository.save(queue);
  }

  async resume(id: string): Promise<Queue> {
    const queue = await this.findOne(id);
    queue.isPaused = false;
    return this.queueRepository.save(queue);
  }

  async getQueueDepth(queueName: string): Promise<number> {
    const [normalCount, delayedCount] = await Promise.all([
      this.redis.zcard(QUEUE_KEY_PREFIX + queueName),
      this.redis.zcard(DELAYED_QUEUE_KEY_PREFIX + queueName),
    ]);
    return normalCount + delayedCount;
  }

  async getQueueStats(queueName: string): Promise<any> {
    const queue = await this.findByName(queueName);
    const [pendingCount, delayedCount, deadLetterCount, runningCount] =
      await Promise.all([
        this.redis.zcard(QUEUE_KEY_PREFIX + queueName),
        this.redis.zcard(DELAYED_QUEUE_KEY_PREFIX + queueName),
        this.redis.zcard(DEAD_LETTER_QUEUE_KEY_PREFIX + queueName),
        this.redis.scard(RUNNING_TASKS_KEY_PREFIX + queueName),
      ]);

    return {
      name: queue.name,
      isPaused: queue.isPaused,
      concurrencyLimit: queue.concurrencyLimit,
      pendingCount,
      delayedCount,
      deadLetterCount,
      runningCount,
      totalPending: pendingCount + delayedCount,
      depthThreshold: queue.depthThreshold,
    };
  }

  async enqueue(
    queueName: string,
    taskId: string,
    priority: number = 0,
    delayedUntil?: Date,
  ): Promise<void> {
    const queue = await this.findByName(queueName);
    if (queue.isPaused) {
      throw new BadRequestException(`Queue "${queueName}" is paused`);
    }

    const score = delayedUntil
      ? delayedUntil.getTime()
      : Date.now() - priority * 1000;

    if (delayedUntil) {
      await this.redis.zadd(
        DELAYED_QUEUE_KEY_PREFIX + queueName,
        score,
        taskId,
      );
    } else {
      await this.redis.zadd(QUEUE_KEY_PREFIX + queueName, score, taskId);
    }
  }

  async dequeue(queueName: string, count: number = 1): Promise<string[]> {
    const queue = await this.findByName(queueName);
    if (queue.isPaused) {
      return [];
    }

    await this.moveDelayedToReady(queueName);

    const tasks: string[] = [];
    const multi = this.redis.multi();

    for (let i = 0; i < count; i++) {
      multi.zpopmin(QUEUE_KEY_PREFIX + queueName);
    }

    const results = await multi.exec();
    for (const result of results) {
      if (result[0]) throw result[0];
      const task = result[1] as string[];
      if (task && task[0]) {
        tasks.push(task[0]);
      }
    }

    if (tasks.length > 0) {
      await this.redis.sadd(
        RUNNING_TASKS_KEY_PREFIX + queueName,
        ...tasks,
      );
    }

    return tasks;
  }

  async moveDelayedToReady(queueName: string): Promise<number> {
    const now = Date.now();
    const delayedKey = DELAYED_QUEUE_KEY_PREFIX + queueName;
    const readyKey = QUEUE_KEY_PREFIX + queueName;

    const tasksToMove = await this.redis.zrangebyscore(
      delayedKey,
      '-inf',
      now,
      'WITHSCORES',
    );

    if (tasksToMove.length === 0) return 0;

    const multi = this.redis.multi();

    for (let i = 0; i < tasksToMove.length; i += 2) {
      const taskId = tasksToMove[i];
      const score = parseFloat(tasksToMove[i + 1]);
      multi.zrem(delayedKey, taskId);
      multi.zadd(readyKey, score, taskId);
    }

    await multi.exec();
    return tasksToMove.length / 2;
  }

  async moveToDeadLetter(
    queueName: string,
    taskId: string,
    reason?: string,
  ): Promise<void> {
    await this.redis.zrem(QUEUE_KEY_PREFIX + queueName, taskId);
    await this.redis.zrem(DELAYED_QUEUE_KEY_PREFIX + queueName, taskId);
    await this.redis.srem(RUNNING_TASKS_KEY_PREFIX + queueName, taskId);

    const score = Date.now();
    const value = reason ? `${taskId}:${reason}` : taskId;
    await this.redis.zadd(DEAD_LETTER_QUEUE_KEY_PREFIX + queueName, score, value);
  }

  async removeTask(queueName: string, taskId: string): Promise<void> {
    await this.redis.zrem(QUEUE_KEY_PREFIX + queueName, taskId);
    await this.redis.zrem(DELAYED_QUEUE_KEY_PREFIX + queueName, taskId);
    await this.redis.srem(RUNNING_TASKS_KEY_PREFIX + queueName, taskId);
  }

  async completeTask(queueName: string, taskId: string): Promise<void> {
    await this.redis.srem(RUNNING_TASKS_KEY_PREFIX + queueName, taskId);
  }
}
