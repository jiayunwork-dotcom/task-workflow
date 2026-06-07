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
import { TaskDefinitionsService } from './task-definitions.service';
import {
  CreateTaskDefinitionDto,
  UpdateTaskDefinitionDto,
} from './dto/task-definition.dto';
import { PaginationDto } from '../common/dto/pagination.dto';

@Controller('task-definitions')
export class TaskDefinitionsController {
  constructor(
    private readonly taskDefinitionsService: TaskDefinitionsService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createTaskDefinitionDto: CreateTaskDefinitionDto) {
    return this.taskDefinitionsService.create(createTaskDefinitionDto);
  }

  @Get()
  findAll(@Query() paginationDto: PaginationDto) {
    return this.taskDefinitionsService.findAll(paginationDto);
  }

  @Get('name/:name')
  findByName(@Param('name') name: string) {
    return this.taskDefinitionsService.findByName(name);
  }

  @Get('name/:name/latest')
  findLatestByName(@Param('name') name: string) {
    return this.taskDefinitionsService.findLatestByName(name);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.taskDefinitionsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateTaskDefinitionDto: UpdateTaskDefinitionDto,
  ) {
    return this.taskDefinitionsService.update(id, updateTaskDefinitionDto);
  }

  @Patch(':id/deprecate')
  deprecate(@Param('id') id: string) {
    return this.taskDefinitionsService.deprecate(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.taskDefinitionsService.remove(id);
  }
}
