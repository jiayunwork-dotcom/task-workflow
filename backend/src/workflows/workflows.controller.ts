import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { WorkflowsService } from './workflows.service';
import {
  CreateWorkflowDefinitionDto,
  UpdateWorkflowDefinitionDto,
  StartWorkflowDto,
  UpdateStepStatusDto,
} from './dto/workflow.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { WorkflowStatus } from '../common/enums';

@Controller('workflows')
export class WorkflowsController {
  constructor(private readonly workflowsService: WorkflowsService) {}

  @Post('definitions')
  @HttpCode(HttpStatus.CREATED)
  createDefinition(
    @Body() createWorkflowDefinitionDto: CreateWorkflowDefinitionDto,
  ) {
    return this.workflowsService.createDefinition(createWorkflowDefinitionDto);
  }

  @Get('definitions')
  findAllDefinitions(@Query() paginationDto: PaginationDto) {
    return this.workflowsService.findAllDefinitions(paginationDto);
  }

  @Get('definitions/:id')
  findOneDefinition(@Param('id') id: string) {
    return this.workflowsService.findOneDefinition(id);
  }

  @Get('definitions/:id/execution-order')
  getExecutionOrder(@Param('id') id: string) {
    return this.workflowsService.getExecutionOrder(id);
  }

  @Patch('definitions/:id')
  updateDefinition(
    @Param('id') id: string,
    @Body() updateWorkflowDefinitionDto: UpdateWorkflowDefinitionDto,
  ) {
    return this.workflowsService.updateDefinition(
      id,
      updateWorkflowDefinitionDto,
    );
  }

  @Delete('definitions/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeDefinition(@Param('id') id: string) {
    return this.workflowsService.removeDefinition(id);
  }

  @Post('definitions/:id/start')
  startWorkflow(
    @Param('id') id: string,
    @Body() startWorkflowDto: StartWorkflowDto,
  ) {
    return this.workflowsService.startWorkflow(id, startWorkflowDto);
  }

  @Get('instances')
  findAllInstances(
    @Query() paginationDto: PaginationDto,
    @Query('status') status?: WorkflowStatus,
  ) {
    return this.workflowsService.findAllInstances(paginationDto, status);
  }

  @Get('instances/:id')
  findOneInstance(@Param('id') id: string) {
    return this.workflowsService.findOneInstance(id);
  }

  @Post('instances/:id/cancel')
  cancelInstance(@Param('id') id: string) {
    return this.workflowsService.cancelInstance(id);
  }

  @Patch('instances/:id/steps')
  updateStepStatus(
    @Param('id') id: string,
    @Body() updateStepStatusDto: UpdateStepStatusDto,
  ) {
    return this.workflowsService.updateStepStatus(id, updateStepStatusDto);
  }
}
