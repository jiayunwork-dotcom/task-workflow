import { Module, OnModuleInit, Logger } from '@nestjs/common';
import { TypeOrmModule, DataSource } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST', 'localhost'),
        port: configService.get('DB_PORT', 5432),
        username: configService.get('DB_USERNAME', 'postgres'),
        password: configService.get('DB_PASSWORD', 'postgres'),
        database: configService.get('DB_DATABASE', 'task_workflow'),
        entities: [__dirname + '/../**/*.entity{.ts,.js}'],
        synchronize: true,
        logging: configService.get('NODE_ENV') === 'development',
        ssl: configService.get('NODE_ENV') === 'production' ? { rejectUnauthorized: false } : false,
      }),
      inject: [ConfigService],
    }),
  ],
})
export class DatabaseModule implements OnModuleInit {
  private readonly logger = new Logger(DatabaseModule.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async onModuleInit() {
    try {
      await this.dataSource.query('SELECT 1');
      this.logger.log('Database connection established successfully');
      const tables = await this.dataSource.query(
        "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
      );
      this.logger.log(`Found ${tables.length} tables in database`);
    } catch (error) {
      this.logger.error('Database connection failed:', error.message);
      throw error;
    }
  }
}
