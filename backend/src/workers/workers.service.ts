import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Worker } from './entities/worker.entity';
import {
  RegisterWorkerDto,
  HeartbeatDto,
  UpdateWorkerDto,
} from './dto/worker.dto';
import { PaginationDto, PaginatedResponseDto } from '../common/dto/pagination.dto';
import { WorkerStatus } from '../common/enums';
import { v4 as uuidv4 } from 'uuid';

const HEARTBEAT_TIMEOUT = 60;

@Injectable()
export class WorkersService {
  constructor(
    @InjectRepository(Worker)
    private workerRepository: Repository<Worker>,
    @Inject('REDIS_CLIENT')
    private redis: any,
  ) {}

  async register(registerWorkerDto: RegisterWorkerDto): Promise<Worker> {
    const worker = this.workerRepository.create({
      ...registerWorkerDto,
      status: WorkerStatus.IDLE,
      lastHeartbeat: new Date(),
    });

    const savedWorker = await this.workerRepository.save(worker);
    await this.redis.set(
      `worker:${savedWorker.id}`,
      JSON.stringify(savedWorker),
      'EX',
      HEARTBEAT_TIMEOUT * 2,
    );

    return savedWorker;
  }

  async findAll(
    paginationDto: PaginationDto,
    status?: WorkerStatus,
  ): Promise<PaginatedResponseDto<Worker>> {
    const { page, limit } = paginationDto;
    const where: any = {};
    if (status) where.status = status;

    const [data, total] = await this.workerRepository.findAndCount({
      where,
      order: { lastHeartbeat: 'DESC' },
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

  async findOne(id: string): Promise<Worker> {
    const worker = await this.workerRepository.findOne({ where: { id } });
    if (!worker) {
      throw new NotFoundException(`Worker with ID "${id}" not found`);
    }
    return worker;
  }

  async heartbeat(
    id: string,
    heartbeatDto: HeartbeatDto,
  ): Promise<Worker> {
    const worker = await this.findOne(id);

    worker.lastHeartbeat = new Date();
    if (heartbeatDto.cpuUsage !== undefined) {
      worker.cpuUsage = heartbeatDto.cpuUsage;
    }
    if (heartbeatDto.memoryUsage !== undefined) {
      worker.memoryUsage = heartbeatDto.memoryUsage;
    }

    if (worker.status === WorkerStatus.DISCONNECTED) {
      worker.status = WorkerStatus.IDLE;
    }

    const savedWorker = await this.workerRepository.save(worker);
    await this.redis.set(
      `worker:${id}`,
      JSON.stringify(savedWorker),
      'EX',
      HEARTBEAT_TIMEOUT * 2,
    );

    return savedWorker;
  }

  async update(
    id: string,
    updateWorkerDto: UpdateWorkerDto,
  ): Promise<Worker> {
    const worker = await this.findOne(id);
    Object.assign(worker, updateWorkerDto);
    return this.workerRepository.save(worker);
  }

  async gracefulShutdown(id: string): Promise<Worker> {
    const worker = await this.findOne(id);
    worker.status = WorkerStatus.SHUTDOWN;
    worker.lastHeartbeat = new Date();

    const savedWorker = await this.workerRepository.save(worker);
    await this.redis.del(`worker:${id}`);

    return savedWorker;
  }

  async remove(id: string): Promise<void> {
    const worker = await this.findOne(id);

    if (worker.status === WorkerStatus.RUNNING) {
      throw new BadRequestException(
        'Cannot remove a worker that is currently running tasks',
      );
    }

    await this.workerRepository.delete(id);
    await this.redis.del(`worker:${id}`);
  }

  async checkAndMarkDisconnected(): Promise<void> {
    const timeoutThreshold = new Date(
      Date.now() - HEARTBEAT_TIMEOUT * 1000,
    );

    await this.workerRepository.update(
      {
        lastHeartbeat: LessThan(timeoutThreshold),
        status: WorkerStatus.IDLE,
      },
      { status: WorkerStatus.DISCONNECTED },
    );
  }

  async getAvailableWorkers(queueName: string): Promise<Worker[]> {
    return this.workerRepository
      .createQueryBuilder('worker')
      .where('worker.status = :status', { status: WorkerStatus.IDLE })
      .andWhere('worker.queues @> :queueName::jsonb', {
        queueName: JSON.stringify([queueName]),
      })
      .andWhere('worker.lastHeartbeat > :timeout', {
        timeout: new Date(Date.now() - HEARTBEAT_TIMEOUT * 1000),
      })
      .orderBy('worker.processedTasks', 'ASC')
      .getMany();
  }

  async incrementProcessedTasks(id: string): Promise<void> {
    await this.workerRepository.increment({ id }, 'processedTasks', 1);
  }
}
