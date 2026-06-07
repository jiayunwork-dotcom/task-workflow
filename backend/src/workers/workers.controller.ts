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
import { WorkersService } from './workers.service';
import {
  RegisterWorkerDto,
  HeartbeatDto,
  UpdateWorkerDto,
} from './dto/worker.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { WorkerStatus } from '../common/enums';

@Controller('workers')
export class WorkersController {
  constructor(private readonly workersService: WorkersService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  register(@Body() registerWorkerDto: RegisterWorkerDto) {
    return this.workersService.register(registerWorkerDto);
  }

  @Get()
  findAll(
    @Query() paginationDto: PaginationDto,
    @Query('status') status?: WorkerStatus,
  ) {
    return this.workersService.findAll(paginationDto, status);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.workersService.findOne(id);
  }

  @Post(':id/heartbeat')
  heartbeat(
    @Param('id') id: string,
    @Body() heartbeatDto: HeartbeatDto,
  ) {
    return this.workersService.heartbeat(id, heartbeatDto);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateWorkerDto: UpdateWorkerDto,
  ) {
    return this.workersService.update(id, updateWorkerDto);
  }

  @Post(':id/shutdown')
  gracefulShutdown(@Param('id') id: string) {
    return this.workersService.gracefulShutdown(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.workersService.remove(id);
  }
}
