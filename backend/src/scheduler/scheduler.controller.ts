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
import { SchedulerService } from './scheduler.service';
import {
  CreateCronJobDto,
  UpdateCronJobDto,
  TriggerJobDto,
} from './dto/scheduler.dto';
import { PaginationDto } from '../common/dto/pagination.dto';

@Controller('scheduler')
export class SchedulerController {
  constructor(private readonly schedulerService: SchedulerService) {}

  @Post('jobs')
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createCronJobDto: CreateCronJobDto) {
    return this.schedulerService.create(createCronJobDto);
  }

  @Get('jobs')
  findAll(@Query() paginationDto: PaginationDto) {
    return this.schedulerService.findAll(paginationDto);
  }

  @Get('jobs/:id')
  findOne(@Param('id') id: string) {
    return this.schedulerService.findOne(id);
  }

  @Patch('jobs/:id')
  update(
    @Param('id') id: string,
    @Body() updateCronJobDto: UpdateCronJobDto,
  ) {
    return this.schedulerService.update(id, updateCronJobDto);
  }

  @Delete('jobs/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.schedulerService.remove(id);
  }

  @Post('jobs/:id/activate')
  activate(@Param('id') id: string) {
    return this.schedulerService.activate(id);
  }

  @Post('jobs/:id/deactivate')
  deactivate(@Param('id') id: string) {
    return this.schedulerService.deactivate(id);
  }

  @Post('jobs/:id/trigger')
  trigger(
    @Param('id') id: string,
    @Body() triggerJobDto: TriggerJobDto,
  ) {
    return this.schedulerService.trigger(id, triggerJobDto);
  }
}
