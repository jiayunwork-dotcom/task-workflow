import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Request,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { AlertsService } from './alerts.service';
import {
  CreateAlertRuleDto,
  UpdateAlertRuleDto,
} from './dto/metrics.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { AlertSeverity } from './entities/alert.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('metrics')
@UseGuards(JwtAuthGuard)
export class MetricsController {
  constructor(
    private readonly metricsService: MetricsService,
    private readonly alertsService: AlertsService,
  ) {}

  @Get('overview')
  getOverallMetrics() {
    return this.metricsService.getOverallMetrics();
  }

  @Get('queues')
  getQueuesMetrics() {
    return this.metricsService.getQueuesMetrics();
  }

  @Get('workers')
  getWorkersMetrics() {
    return this.metricsService.getWorkersMetrics();
  }

  @Get('task-durations')
  getTaskDurationMetrics(
    @Query('taskDefinitionName') taskDefinitionName?: string,
    @Query('hours') hours?: number,
  ) {
    return this.metricsService.getTaskDurationMetrics(
      taskDefinitionName,
      hours ? parseInt(hours as any, 10) : 24,
    );
  }

  @Get('throughput')
  getThroughputMetrics(@Query('hours') hours?: number) {
    return this.metricsService.getThroughputMetrics(
      hours ? parseInt(hours as any, 10) : 24,
    );
  }

  @Post('alert-rules')
  @HttpCode(HttpStatus.CREATED)
  createAlertRule(@Body() createAlertRuleDto: CreateAlertRuleDto) {
    return this.alertsService.createRule(createAlertRuleDto);
  }

  @Get('alert-rules')
  findAllAlertRules(@Query() paginationDto: PaginationDto) {
    return this.alertsService.findAllRules(paginationDto);
  }

  @Get('alert-rules/:id')
  findOneAlertRule(@Param('id') id: string) {
    return this.alertsService.findOneRule(id);
  }

  @Patch('alert-rules/:id')
  updateAlertRule(
    @Param('id') id: string,
    @Body() updateAlertRuleDto: UpdateAlertRuleDto,
  ) {
    return this.alertsService.updateRule(id, updateAlertRuleDto);
  }

  @Delete('alert-rules/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeAlertRule(@Param('id') id: string) {
    return this.alertsService.removeRule(id);
  }

  @Get('alerts')
  findAllAlerts(
    @Query() paginationDto: PaginationDto,
    @Query('acknowledged') acknowledged?: string,
    @Query('severity') severity?: AlertSeverity,
  ) {
    const ack = acknowledged === 'true'
      ? true
      : acknowledged === 'false'
      ? false
      : undefined;
    return this.alertsService.findAllAlerts(paginationDto, ack, severity);
  }

  @Get('alerts/:id')
  findOneAlert(@Param('id') id: string) {
    return this.alertsService.findOneAlert(id);
  }

  @Post('alerts/:id/acknowledge')
  acknowledgeAlert(@Param('id') id: string, @Request() req) {
    return this.alertsService.acknowledgeAlert(id, req.user.id);
  }
}
