import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaskDefinition } from './entities/task-definition.entity';
import {
  CreateTaskDefinitionDto,
  UpdateTaskDefinitionDto,
} from './dto/task-definition.dto';
import { PaginationDto, PaginatedResponseDto } from '../common/dto/pagination.dto';
import Ajv from 'ajv';

@Injectable()
export class TaskDefinitionsService {
  private ajv: Ajv;

  constructor(
    @InjectRepository(TaskDefinition)
    private taskDefinitionRepository: Repository<TaskDefinition>,
  ) {
    this.ajv = new Ajv({ strict: false });
  }

  private validateJsonSchema(schema: any): void {
    if (!schema) return;
    try {
      this.ajv.compile(schema);
    } catch (e) {
      throw new BadRequestException(`Invalid JSON Schema: ${e.message}`);
    }
  }

  async create(
    createTaskDefinitionDto: CreateTaskDefinitionDto,
  ): Promise<TaskDefinition> {
    const { name, inputSchema } = createTaskDefinitionDto;

    this.validateJsonSchema(inputSchema);

    const existingLatest = await this.taskDefinitionRepository.findOne({
      where: { name },
      order: { version: 'DESC' },
    });

    const newVersion = existingLatest ? existingLatest.version + 1 : 1;

    const taskDefinition = this.taskDefinitionRepository.create({
      ...createTaskDefinitionDto,
      version: newVersion,
    });

    return this.taskDefinitionRepository.save(taskDefinition);
  }

  async findAll(
    paginationDto: PaginationDto,
  ): Promise<PaginatedResponseDto<TaskDefinition>> {
    const { page, limit } = paginationDto;
    const [data, total] = await this.taskDefinitionRepository.findAndCount({
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

  async findByName(name: string): Promise<TaskDefinition[]> {
    return this.taskDefinitionRepository.find({
      where: { name },
      order: { version: 'DESC' },
    });
  }

  async findOne(id: string): Promise<TaskDefinition> {
    const taskDefinition = await this.taskDefinitionRepository.findOne({
      where: { id },
    });
    if (!taskDefinition) {
      throw new NotFoundException(`TaskDefinition with ID "${id}" not found`);
    }
    return taskDefinition;
  }

  async findLatestByName(name: string): Promise<TaskDefinition> {
    const taskDefinition = await this.taskDefinitionRepository.findOne({
      where: { name, isDeprecated: false },
      order: { version: 'DESC' },
    });
    if (!taskDefinition) {
      throw new NotFoundException(
        `No active TaskDefinition with name "${name}" found`,
      );
    }
    return taskDefinition;
  }

  async update(
    id: string,
    updateTaskDefinitionDto: UpdateTaskDefinitionDto,
  ): Promise<TaskDefinition> {
    const existing = await this.findOne(id);

    if (updateTaskDefinitionDto.inputSchema) {
      this.validateJsonSchema(updateTaskDefinitionDto.inputSchema);
    }

    const hasChanges = Object.keys(updateTaskDefinitionDto).some(
      (key) => existing[key] !== updateTaskDefinitionDto[key],
    );

    if (!hasChanges) {
      return existing;
    }

    const newTaskDefinition = this.taskDefinitionRepository.create({
      ...existing,
      ...updateTaskDefinitionDto,
      id: undefined,
      version: existing.version + 1,
      createdAt: undefined,
    });

    return this.taskDefinitionRepository.save(newTaskDefinition);
  }

  async deprecate(id: string): Promise<TaskDefinition> {
    const taskDefinition = await this.findOne(id);
    taskDefinition.isDeprecated = true;
    return this.taskDefinitionRepository.save(taskDefinition);
  }

  async remove(id: string): Promise<void> {
    const taskDefinition = await this.findOne(id);

    if (!taskDefinition.isDeprecated) {
      throw new ConflictException(
        'Cannot delete non-deprecated task definition. Please deprecate it first.',
      );
    }

    const result = await this.taskDefinitionRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`TaskDefinition with ID "${id}" not found`);
    }
  }
}
