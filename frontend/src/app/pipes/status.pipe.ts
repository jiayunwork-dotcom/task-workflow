import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'taskStatus', standalone: true })
export class TaskStatusPipe implements PipeTransform {
  transform(value: string): string {
    const statusMap: Record<string, string> = {
      'PENDING': '等待中',
      'CLAIMED': '已认领',
      'RUNNING': '执行中',
      'SUCCESS': '成功',
      'FAILED': '失败',
      'TIMEOUT': '超时',
      'DEAD_LETTER': '死信',
      'CANCELLED': '已取消'
    };
    return statusMap[value] || statusMap[value?.toUpperCase()] || value;
  }
}

@Pipe({ name: 'statusColor', standalone: true })
export class StatusColorPipe implements PipeTransform {
  transform(value: string): string {
    const colorMap: Record<string, string> = {
      'PENDING': '#9e9e9e',
      'CLAIMED': '#0288d1',
      'RUNNING': '#1976d2',
      'SUCCESS': '#388e3c',
      'FAILED': '#d32f2f',
      'TIMEOUT': '#f57c00',
      'DEAD_LETTER': '#7b1fa2',
      'CANCELLED': '#616161',
      'ONLINE': '#388e3c',
      'OFFLINE': '#9e9e9e',
      'BUSY': '#1976d2',
      'ACTIVE': '#388e3c',
      'INACTIVE': '#9e9e9e'
    };
    return colorMap[value] || colorMap[value?.toUpperCase()] || '#9e9e9e';
  }
}

@Pipe({ name: 'alertLevel', standalone: true })
export class AlertLevelPipe implements PipeTransform {
  transform(value: string): string {
    const levelMap: Record<string, string> = {
      'INFO': '信息',
      'WARNING': '警告',
      'ERROR': '错误',
      'CRITICAL': '严重'
    };
    return levelMap[value] || value;
  }
}

@Pipe({ name: 'alertColor', standalone: true })
export class AlertColorPipe implements PipeTransform {
  transform(value: string): string {
    const colorMap: Record<string, string> = {
      'INFO': '#1976d2',
      'WARNING': '#f57c00',
      'ERROR': '#d32f2f',
      'CRITICAL': '#7b1fa2'
    };
    return colorMap[value] || '#9e9e9e';
  }
}
