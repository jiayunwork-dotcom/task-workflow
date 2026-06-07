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
import { QueuesService } from './queues.service';
import { CreateQueueDto, UpdateQueueDto } from './dto/queue.dto';
import { PaginationDto } from '../common/dto/pagination.dto';

@Controller('queues')
export class QueuesController {
  constructor(private readonly queuesService: QueuesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createQueueDto: CreateQueueDto) {
    return this.queuesService.create(createQueueDto);
  }

  @Get()
  findAll(@Query() paginationDto: PaginationDto) {
    return this.queuesService.findAll(paginationDto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.queuesService.findOne(id);
  }

  @Get(':name/stats')
  getQueueStats(@Param('name') name: string) {
    return this.queuesService.getQueueStats(name);
  }

  @Get(':name/depth')
  getQueueDepth(@Param('name') name: string) {
    return this.queuesService.getQueueDepth(name).then((depth) => ({ depth }));
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateQueueDto: UpdateQueueDto) {
    return this.queuesService.update(id, updateQueueDto);
  }

  @Patch(':id/pause')
  pause(@Param('id') id: string) {
    return this.queuesService.pause(id);
  }

  @Patch(':id/resume')
  resume(@Param('id') id: string) {
    return this.queuesService.resume(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.queuesService.remove(id);
  }
}
