# 分布式任务队列与工作流编排引擎

一个功能完整的分布式任务队列与工作流编排系统，支持DAG工作流编排、多Worker并行消费、故障恢复和可视化管理。

## 技术架构

### 后端
- **框架**: NestJS 10 + TypeScript
- **数据库**: PostgreSQL 16 (任务定义、执行历史)
- **缓存/队列**: Redis 7 (队列数据结构、Worker心跳)
- **认证**: JWT Bearer Token
- **调度**: @nestjs/schedule + Cron表达式

### 前端
- **框架**: Angular 17 (Standalone Components)
- **UI组件**: Angular Material
- **图表**: ng2-charts + Chart.js
- **DAG可视化**: 原生SVG实现

### 部署
- **容器化**: Docker + Docker Compose
- **后端镜像**: node:20-alpine
- **前端镜像**: nginx:alpine
- **Worker**: 可水平扩展，默认2副本

## 项目结构

```
task-workflow/
├── backend/                    # 后端 NestJS 应用
│   ├── src/
│   │   ├── auth/              # 认证与权限模块
│   │   ├── task-definitions/  # 任务定义与注册模块
│   │   ├── queues/            # 队列管理模块
│   │   ├── workflows/         # 工作流DAG编排模块
│   │   ├── task-instances/    # 任务实例与状态追踪
│   │   ├── workers/           # Worker管理模块
│   │   ├── scheduler/         # 调度策略模块
│   │   ├── metrics/           # 可观测性与告警
│   │   ├── common/            # 通用工具
│   │   ├── database/          # 数据库配置
│   │   ├── app.module.ts
│   │   └── main.ts
│   ├── Dockerfile
│   ├── package.json
│   └── .env.example
│
├── frontend/                   # 前端 Angular 应用
│   ├── src/
│   │   ├── app/
│   │   │   ├── components/    # 公共组件 (布局、DAG图)
│   │   │   ├── pages/         # 页面组件
│   │   │   │   ├── dashboard/    # 系统概览
│   │   │   │   ├── workflows/    # 工作流管理
│   │   │   │   ├── tasks/        # 任务列表
│   │   │   │   ├── queues/       # 队列管理
│   │   │   │   ├── workers/      # Worker监控
│   │   │   │   └── cron-jobs/    # 定时任务
│   │   │   ├── services/      # API服务、实时更新
│   │   │   ├── guards/        # 路由守卫
│   │   │   ├── pipes/         # 管道
│   │   │   └── models/        # TypeScript类型
│   │   └── main.ts
│   ├── Dockerfile
│   ├── nginx.conf
│   └── package.json
│
├── docker-compose.yml          # 容器编排配置
└── README.md
```

## 核心功能

### 1. 任务定义与注册
- 唯一名称标识、JSON Schema参数校验
- 超时时间、最大重试次数、重试策略
- 优先级(1-10)、所属队列
- 版本管理，修改创建新版本
- 被引用任务只能标记废弃

### 2. 队列管理
- 多独立队列，各自有并发/速率限制
- 优先级队列 (Redis ZSet实现)
- 延迟队列 (支持定时触发和重试退避)
- 死信队列 (人工审查后重新入队或丢弃)
- 队列暂停/恢复
- 深度阈值告警

### 3. 工作流DAG编排
- 步骤间依赖构成有向无环图
- 拓扑排序验证无环
- 编排模式：
  - 串行链 (A→B→C)
  - 并行扇出 (A→[B,C,D])
  - 扇入汇聚 ([B,C,D]→E)
  - 条件分支 (根据输出值决策)
  - 循环 (DO-WHILE，限制最大次数)
- 步骤间数据传递：`${steps.A.output.userId}`

### 4. Worker管理
- Worker注册，声明可处理队列和并发能力
- 长轮询/BRPOP拉取任务
- 可见性超时 + 心跳续期
- 意外崩溃自动回收任务
- 优雅关闭机制
- 实时监控：在线状态、CPU、内存、处理数

### 5. 任务状态追踪
- 状态机：Pending → Claimed → Running → Success/Failed
- 超时重试、死信转移
- 实时进度上报 (百分比+描述)
- 完整生命周期日志

### 6. 调度策略
- Cron定时调度 (标准Cron表达式，支持时区)
- 并发策略：Skip/Queue/Replace
- 事件触发 (API/Webhook)
- 速率限制保护

### 7. 故障处理
- 重试策略：固定间隔/指数退避+随机抖动
- 死信转移后可修改参数重新提交
- 网络分区容错
- 唯一执行ID用于幂等校验

### 8. 可观测性
- 指标：队列深度、入队出队速率、任务耗时P95、Worker利用率、失败率
- 告警规则：队列超限、Worker离线、失败率超限、耗时激增

## Web管理面板

### Dashboard首页
- 系统概览卡片 (活跃Worker、队列深度、任务完成/失败数)
- 各队列深度柱状图
- 近1小时任务趋势折线图
- 待处理告警列表

### 工作流管理
- 工作流定义列表
- DAG图可视化
- 手动触发工作流
- 工作流实例详情页 (DAG执行进度、步骤日志、手动重试)

### 任务管理
- 按状态分Tab展示
- 队列/状态/时间范围筛选
- 批量操作 (重试/取消/移至死信)

### 其他页面
- 队列管理：配置参数、暂停/恢复、死信管理
- Worker监控：在线状态、负载、任务历史
- 定时任务：Cron配置启停、执行历史

## 快速开始

### 方式一：Docker Compose (推荐)

```bash
# 1. 克隆项目后，在根目录执行
docker-compose up -d

# 2. 访问前端管理面板
# http://localhost:8080

# 3. 默认管理员账号
# Email: admin@example.com
# Password: admin123
```

### 方式二：本地开发

#### 启动依赖服务
```bash
# 启动PostgreSQL和Redis
docker run -d --name postgres -p 5432:5432 -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=task_workflow postgres:16-alpine
docker run -d --name redis -p 6379:6379 redis:7-alpine
```

#### 启动后端
```bash
cd backend
cp .env.example .env
# 编辑 .env 配置数据库和Redis连接

npm install
npm run start:dev
# API服务运行在 http://localhost:3000/api
```

#### 启动前端
```bash
cd frontend
npm install
npm start
# 前端运行在 http://localhost:4200
```

## REST API

所有API端点前缀: `/api`

### 认证
```
POST /auth/login - 登录获取Token
```

### 任务定义
```
GET    /task-definitions          - 列表
POST   /task-definitions          - 创建
GET    /task-definitions/:id      - 详情
PUT    /task-definitions/:id      - 更新(创建新版本)
DELETE /task-definitions/:id      - 删除(需先废弃)
POST   /task-definitions/:id/deprecate - 标记废弃
```

### 队列管理
```
GET    /queues                    - 列表
POST   /queues                    - 创建
GET    /queues/:id                - 详情
PUT    /queues/:id                - 更新
DELETE /queues/:id                - 删除
POST   /queues/:id/pause          - 暂停
POST   /queues/:id/resume         - 恢复
GET    /queues/:id/stats          - 统计信息
GET    /queues/:id/dead-letter    - 死信列表
POST   /queues/:id/dead-letter/:taskId/requeue - 死信重新入队
DELETE /queues/:id/dead-letter/:taskId - 丢弃死信
```

### 工作流
```
GET    /workflows/definitions     - 工作流定义列表
POST   /workflows/definitions     - 创建工作流定义
GET    /workflows/definitions/:id - 详情
PUT    /workflows/definitions/:id - 更新
DELETE /workflows/definitions/:id - 删除
POST   /workflows/definitions/:id/start - 启动工作流实例

GET    /workflows/instances       - 工作流实例列表
GET    /workflows/instances/:id   - 实例详情
POST   /workflows/instances/:id/cancel - 取消实例
```

### 任务实例
```
GET    /task-instances            - 列表
POST   /task-instances            - 创建任务
GET    /task-instances/:id        - 详情
POST   /task-instances/:id/claim  - Worker认领
POST   /task-instances/:id/start  - 开始执行
POST   /task-instances/:id/progress - 更新进度
POST   /task-instances/:id/complete - 完成任务
POST   /task-instances/:id/fail   - 任务失败
POST   /task-instances/:id/cancel - 取消任务
POST   /task-instances/:id/requeue - 重新入队
```

### Worker
```
GET    /workers                   - 列表
POST   /workers/register          - Worker注册
POST   /workers/:id/heartbeat     - 心跳续期
POST   /workers/:id/shutdown      - 优雅关闭
DELETE /workers/:id               - 移除Worker
```

### 调度
```
GET    /cron-jobs                 - Cron任务列表
POST   /cron-jobs                 - 创建Cron任务
GET    /cron-jobs/:id             - 详情
PUT    /cron-jobs/:id             - 更新
DELETE /cron-jobs/:id             - 删除
POST   /cron-jobs/:id/toggle      - 启停
GET    /cron-jobs/:id/history     - 执行历史
```

### 指标与告警
```
GET    /metrics/overview          - 系统概览指标
GET    /metrics/queues            - 队列指标
GET    /metrics/tasks             - 任务指标
GET    /metrics/workers           - Worker指标
GET    /alerts                    - 告警列表
PUT    /alerts/:id/read           - 标记已读
```

## 角色权限

| 角色 | 权限 |
|------|------|
| admin | 所有操作权限 |
| operator | 任务/工作流操作，队列管理，Worker管理 |
| viewer | 只读权限，查看所有数据 |

## 环境变量配置

### 后端 (.env)
```env
PORT=3000
NODE_ENV=development

# 数据库
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=task_workflow

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=24h

# 默认管理员
DEFAULT_ADMIN_EMAIL=admin@example.com
DEFAULT_ADMIN_PASSWORD=admin123
```

## 注意事项

1. **生产环境**: 请务必修改默认的JWT密钥和数据库密码
2. **数据持久化**: Docker Compose已配置数据卷，数据不会因容器重启丢失
3. **Worker扩展**: 可通过调整docker-compose.yml中的replicas数量来扩展Worker
4. **幂等性**: 业务方应使用任务的执行ID做幂等校验

## License

MIT
