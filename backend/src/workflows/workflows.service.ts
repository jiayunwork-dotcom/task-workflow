import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkflowDefinition, Step } from './entities/workflow-definition.entity';
import {
  WorkflowInstance,
  StepsStatusMap,
  StepStatusInfo,
} from './entities/workflow-instance.entity';
import {
  CreateWorkflowDefinitionDto,
  UpdateWorkflowDefinitionDto,
  StartWorkflowDto,
  UpdateStepStatusDto,
} from './dto/workflow.dto';
import { PaginationDto, PaginatedResponseDto } from '../common/dto/pagination.dto';
import { WorkflowStatus, StepStatus, AuditLogType, AuditResourceType } from '../common/enums';
import { EventsGateway } from '../websockets/events.gateway';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

@Injectable()
export class WorkflowsService {
  constructor(
    @InjectRepository(WorkflowDefinition)
    private workflowDefinitionRepository: Repository<WorkflowDefinition>,
    @InjectRepository(WorkflowInstance)
    private workflowInstanceRepository: Repository<WorkflowInstance>,
    private eventsGateway: EventsGateway,
    private auditLogsService: AuditLogsService,
  ) {}

  private emitStepChanged(
    workflowInstanceId: string,
    stepId: string,
    oldStatus: string | null,
    newStatus: string,
  ): void {
    this.eventsGateway.emitWorkflowStepChanged({
      workflowInstanceId,
      stepId,
      oldStatus,
      newStatus,
      timestamp: Date.now(),
    });
  }

  private writeAuditLog(
    actionType: AuditLogType,
    resourceId: string,
    beforeSnapshot?: Record<string, any>,
    afterSnapshot?: Record<string, any>,
  ): void {
    try {
      this.auditLogsService.createAsync({
        actionType,
        operator: 'system',
        resourceId,
        resourceType: AuditResourceType.WORKFLOW,
        beforeSnapshot,
        afterSnapshot,
      });
    } catch (e) {
      // Silently fail - audit log should not affect business logic
    }
  }

  private buildDag(steps: Step[]): Record<string, string[]> {
    const dag: Record<string, string[]> = {};
    for (const step of steps) {
      dag[step.id] = step.dependsOn || [];
    }
    return dag;
  }

  private validateDag(steps: Step[]): void {
    const dag = this.buildDag(steps);
    const stepIds = new Set(steps.map((s) => s.id));

    for (const step of steps) {
      for (const dep of step.dependsOn || []) {
        if (!stepIds.has(dep)) {
          throw new BadRequestException(
            `Step "${step.id}" depends on non-existent step "${dep}"`,
          );
        }
      }
    }

    const visited = new Set<string>();
    const inPath = new Set<string>();

    const dfs = (node: string): boolean => {
      visited.add(node);
      inPath.add(node);

      for (const dep of dag[node] || []) {
        if (!visited.has(dep)) {
          if (dfs(dep)) return true;
        } else if (inPath.has(dep)) {
          return true;
        }
      }

      inPath.delete(node);
      return false;
    };

    for (const stepId of stepIds) {
      if (!visited.has(stepId)) {
        if (dfs(stepId)) {
          throw new BadRequestException(
            'Workflow DAG contains a cycle, which is not allowed',
          );
        }
      }
    }
  }

  private topologicalSort(steps: Step[]): string[] {
    const dag = this.buildDag(steps);
    const inDegree: Record<string, number> = {};
    const queue: string[] = [];
    const result: string[] = [];

    for (const step of steps) {
      inDegree[step.id] = (dag[step.id] || []).length;
      if (inDegree[step.id] === 0) {
        queue.push(step.id);
      }
    }

    const reverseDag: Record<string, string[]> = {};
    for (const step of steps) {
      for (const dep of step.dependsOn || []) {
        if (!reverseDag[dep]) reverseDag[dep] = [];
        reverseDag[dep].push(step.id);
      }
    }

    while (queue.length > 0) {
      const node = queue.shift();
      result.push(node);

      for (const next of reverseDag[node] || []) {
        inDegree[next]--;
        if (inDegree[next] === 0) {
          queue.push(next);
        }
      }
    }

    if (result.length !== steps.length) {
      throw new BadRequestException('DAG has unreachable nodes');
    }

    return result;
  }

  async createDefinition(
    createWorkflowDefinitionDto: CreateWorkflowDefinitionDto,
  ): Promise<WorkflowDefinition> {
    const { name, steps } = createWorkflowDefinitionDto;

    const existing = await this.workflowDefinitionRepository.findOne({
      where: { name },
    });
    if (existing) {
      throw new ConflictException(
        `Workflow definition "${name}" already exists`,
      );
    }

    this.validateDag(steps);
    const dag = this.buildDag(steps);

    const workflowDefinition = this.workflowDefinitionRepository.create({
      name,
      steps,
      dag,
    });

    return this.workflowDefinitionRepository.save(workflowDefinition);
  }

  async findAllDefinitions(
    paginationDto: PaginationDto,
  ): Promise<PaginatedResponseDto<WorkflowDefinition>> {
    const { page, limit } = paginationDto;
    const [data, total] = await this.workflowDefinitionRepository.findAndCount({
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

  async findOneDefinition(id: string): Promise<WorkflowDefinition> {
    const workflowDefinition = await this.workflowDefinitionRepository.findOne({
      where: { id },
    });
    if (!workflowDefinition) {
      throw new NotFoundException(
        `Workflow definition with ID "${id}" not found`,
      );
    }
    return workflowDefinition;
  }

  async updateDefinition(
    id: string,
    updateWorkflowDefinitionDto: UpdateWorkflowDefinitionDto,
  ): Promise<WorkflowDefinition> {
    const workflowDefinition = await this.findOneDefinition(id);

    if (updateWorkflowDefinitionDto.steps) {
      this.validateDag(updateWorkflowDefinitionDto.steps);
      workflowDefinition.steps = updateWorkflowDefinitionDto.steps;
      workflowDefinition.dag = this.buildDag(
        updateWorkflowDefinitionDto.steps,
      );
    }

    return this.workflowDefinitionRepository.save(workflowDefinition);
  }

  async removeDefinition(id: string): Promise<void> {
    const workflowDefinition = await this.findOneDefinition(id);

    const instanceCount = await this.workflowInstanceRepository.count({
      where: {
        workflowDefinitionId: id,
        status: WorkflowStatus.RUNNING,
      },
    });

    if (instanceCount > 0) {
      throw new ConflictException(
        `Cannot delete workflow definition with ${instanceCount} running instances`,
      );
    }

    await this.workflowDefinitionRepository.delete(id);
  }

  async startWorkflow(
    definitionId: string,
    startWorkflowDto: StartWorkflowDto,
  ): Promise<WorkflowInstance> {
    const definition = await this.findOneDefinition(definitionId);

    const stepsStatus: StepsStatusMap = {};
    for (const step of definition.steps) {
      stepsStatus[step.id] = {
        status: StepStatus.PENDING,
      };
    }

    const workflowInstance = this.workflowInstanceRepository.create({
      workflowDefinitionId: definitionId,
      status: WorkflowStatus.RUNNING,
      stepsStatus,
      inputData: startWorkflowDto.inputData,
      startedAt: new Date(),
    });

    const saved = await this.workflowInstanceRepository.save(workflowInstance);
    this.writeAuditLog(
      AuditLogType.WORKFLOW_STARTED,
      saved.id,
      null,
      { ...saved },
    );
    return saved;
  }

  async findAllInstances(
    paginationDto: PaginationDto,
    status?: WorkflowStatus,
  ): Promise<PaginatedResponseDto<WorkflowInstance>> {
    const { page, limit } = paginationDto;
    const where: any = {};
    if (status) where.status = status;

    const [data, total] = await this.workflowInstanceRepository.findAndCount({
      where,
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

  async findOneInstance(id: string): Promise<WorkflowInstance> {
    const workflowInstance = await this.workflowInstanceRepository.findOne({
      where: { id },
    });
    if (!workflowInstance) {
      throw new NotFoundException(
        `Workflow instance with ID "${id}" not found`,
      );
    }
    return workflowInstance;
  }

  async cancelInstance(id: string): Promise<WorkflowInstance> {
    const workflowInstance = await this.findOneInstance(id);

    if (
      workflowInstance.status === WorkflowStatus.SUCCESS ||
      workflowInstance.status === WorkflowStatus.FAILED ||
      workflowInstance.status === WorkflowStatus.CANCELLED
    ) {
      throw new BadRequestException(
        `Cannot cancel workflow instance with status "${workflowInstance.status}"`,
      );
    }

    const beforeSnapshot = { ...workflowInstance };
    workflowInstance.status = WorkflowStatus.CANCELLED;
    workflowInstance.completedAt = new Date();

    for (const stepId of Object.keys(workflowInstance.stepsStatus)) {
      if (workflowInstance.stepsStatus[stepId].status === StepStatus.PENDING) {
        const oldStatus = workflowInstance.stepsStatus[stepId].status;
        workflowInstance.stepsStatus[stepId].status = StepStatus.SKIPPED;
        this.emitStepChanged(id, stepId, oldStatus, StepStatus.SKIPPED);
      }
    }

    const saved = await this.workflowInstanceRepository.save(workflowInstance);
    this.writeAuditLog(
      AuditLogType.WORKFLOW_CANCELLED,
      saved.id,
      beforeSnapshot,
      { ...saved },
    );
    return saved;
  }

  async updateStepStatus(
    instanceId: string,
    updateStepStatusDto: UpdateStepStatusDto,
  ): Promise<WorkflowInstance> {
    const workflowInstance = await this.findOneInstance(instanceId);
    const { stepId, status, output, error, taskInstanceId } = updateStepStatusDto;

    if (!workflowInstance.stepsStatus[stepId]) {
      throw new NotFoundException(`Step "${stepId}" not found in workflow instance`);
    }

    const oldStatus = workflowInstance.stepsStatus[stepId].status;
    const stepStatusInfo: StepStatusInfo = {
      ...workflowInstance.stepsStatus[stepId],
      status: status as StepStatus,
    };

    if (output !== undefined) {
      stepStatusInfo.output = output;
    }
    if (error !== undefined) {
      stepStatusInfo.error = error;
    }
    if (taskInstanceId !== undefined) {
      stepStatusInfo.taskInstanceId = taskInstanceId;
    }

    if (status === StepStatus.RUNNING && !stepStatusInfo.startedAt) {
      stepStatusInfo.startedAt = new Date();
    }
    if (
      [StepStatus.SUCCESS, StepStatus.FAILED, StepStatus.SKIPPED].includes(
        status as StepStatus,
      ) &&
      !stepStatusInfo.completedAt
    ) {
      stepStatusInfo.completedAt = new Date();
    }

    workflowInstance.stepsStatus[stepId] = stepStatusInfo;

    const saved = await this.workflowInstanceRepository.save(workflowInstance);
    this.emitStepChanged(instanceId, stepId, oldStatus, status);
    return saved;
  }

  async getExecutionOrder(definitionId: string): Promise<string[]> {
    const definition = await this.workflowDefinitionRepository.findOne({
      where: { id: definitionId },
    });
    if (!definition) {
      throw new NotFoundException(
        `Workflow definition with ID "${definitionId}" not found`,
      );
    }
    return this.topologicalSort(definition.steps);
  }

  resolveStepInput(
    step: Step,
    stepsOutput: Record<string, any>,
    workflowInput: Record<string, any>,
  ): Record<string, any> {
    const input: Record<string, any> = { ...workflowInput };

    if (step.inputMapping) {
      for (const [key, valuePath] of Object.entries(step.inputMapping)) {
        input[key] = this.resolveValuePath(valuePath, stepsOutput, workflowInput);
      }
    }

    return input;
  }

  private resolveValuePath(
    path: string,
    stepsOutput: Record<string, any>,
    workflowInput: Record<string, any>,
  ): any {
    const match = path.match(/\$\{steps\.(\w+)\.output\.(.+)\}/);
    if (match) {
      const [, stepId, outputPath] = match;
      const stepOutput = stepsOutput[stepId];
      return this.getNestedValue(stepOutput, outputPath);
    }

    const inputMatch = path.match(/\$\{input\.(.+)\}/);
    if (inputMatch) {
      return this.getNestedValue(workflowInput, inputMatch[1]);
    }

    return path;
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }
}
