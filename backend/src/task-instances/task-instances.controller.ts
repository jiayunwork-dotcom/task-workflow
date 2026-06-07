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
import { TaskInstancesService } from './task-instances.service';
import {
  CreateTaskInstanceDto,
  ClaimTaskDto,
  UpdateTaskProgressDto,
  CompleteTaskDto,
  FailTaskDto,
} from './dto/task-instance.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { TaskStatus } from '../common/enums';

@Controller('task-instances')
export class TaskInstancesController {
  constructor(
    private readonly taskInstancesService: TaskInstancesService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createTaskInstanceDto: CreateTaskInstanceDto) {
    return this.taskInstancesService.create(createTaskInstanceDto);
  }

  @Get()
  findAll(
    @Query() paginationDto: PaginationDto,
    @Query('status') status?: TaskStatus,
    @Query('queueName') queueName?: string,
    @Query('workerId') workerId?: string,
  ) {
    return this.taskInstancesService.findAll(
      paginationDto,
      status,
      queueName,
      workerId,
    );
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.taskInstancesService.findOne(id);
  }

  @Post('claim')
  claimTasks(@Body() claimTaskDto: ClaimTaskDto) {
    return this.taskInstancesService.claimTasks(claimTaskDto);
  }

  @Post(':id/start')
  startTask(
    @Param('id') id: string,
    @Body() body: { workerId: string },
  ) {
    return this.taskInstancesService.startTask(id, body.workerId);
  }

  @Patch(':id/progress')
  updateProgress(
    @Param('id') id: string,
    @Body() updateTaskProgressDto: UpdateTaskProgressDto,
  ) {
    return this.taskInstancesService.updateProgress(
      id,
      updateTaskProgressDto,
    );
  }

  @Post(':id/complete')
  completeTask(
    @Param('id') id: string,
    @Body() completeTaskDto: CompleteTaskDto,
  ) {
    return this.taskInstancesService.completeTask(id, completeTaskDto);
  }

  @Post(':id/fail')
  failTask(
    @Param('id') id: string,
    @Body() failTaskDto: FailTaskDto,
  ) {
    return this.taskInstancesService.failTask(id, failTaskDto);
  }

  @Post(':id/cancel')
  cancelTask(@Param('id') id: string) {
    return this.taskInstancesService.cancelTask(id);
  }

  @Post(':id/requeue')
  requeueTask(@Param('id') id: string) {
    return this.taskInstancesService.requeueTask(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.taskInstancesService.remove(id);
  }
}
