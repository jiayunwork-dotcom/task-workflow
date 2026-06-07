# 分布式任务队列与工作流编排引擎 - Web管理面板

基于 Angular 17+ + TypeScript + Angular Material 构建的专业运维管理后台。

## 技术栈

- **Angular 17+** (Standalone Components)
- **Angular Material** - UI组件库
- **RxJS** - 响应式编程
- **ng2-charts + Chart.js** - 数据图表
- **原生SVG** - DAG图可视化 (无需额外依赖)
- **TypeScript** - 类型安全

## 功能特性

### 1. 核心布局
- 侧边栏导航菜单（可折叠）
- 顶部工具栏（用户信息、告警提醒）
- Angular Router 配置
- 响应式布局适配

### 2. Dashboard首页
- 系统概览卡片：活跃Worker数、队列深度、近1小时任务完成/失败数
- 各队列深度柱状图
- 近1小时任务完成/失败数量折线图
- 待处理告警列表

### 3. 工作流管理页面
- 工作流定义列表（表格展示，支持分页）
- 可视化DAG图（节点=步骤，边=依赖）
- 手动触发工作流对话框
- 创建/编辑工作流入口

### 4. 工作流实例详情页
- DAG执行进度图：已完成(绿色)/执行中(蓝色)/等待中(灰色)/失败(红色)
- 各步骤日志输出面板
- 手动重试失败步骤按钮
- 步骤详情和输出数据查看

### 5. 任务列表页
- 按状态分Tab：Pending/Running/Success/Failed/DeadLetter
- 筛选条件：队列、状态、时间范围
- 批量操作：重试、取消、移动到死信
- 任务详情查看入口

### 6. 队列管理页面
- 队列列表及配置
- 暂停/恢复队列按钮
- 查看死信队列内容
- 死信重新入队/丢弃操作

### 7. Worker监控页面
- Worker列表：在线状态、CPU/内存使用率、已处理任务数
- Worker最近处理的任务历史
- 离线/在线/忙碌状态标识

### 8. 定时任务页面
- Cron任务列表
- 启停控制（SlideToggle）
- 执行历史记录
- 创建/编辑Cron任务表单

## 项目结构

```
frontend/
├── src/
│   ├── app/
│   │   ├── components/          # 公共组件
│   │   │   ├── layout/          # 主布局组件
│   │   │   ├── sidebar/         # 侧边栏
│   │   │   ├── toolbar/         # 顶部工具栏
│   │   │   └── dag-graph/       # DAG图可视化组件
│   │   ├── pages/               # 页面组件
│   │   │   ├── dashboard/       # 首页
│   │   │   ├── workflows/       # 工作流管理
│   │   │   ├── workflow-instance-detail/  # 工作流实例详情
│   │   │   ├── tasks/           # 任务列表
│   │   │   ├── queues/          # 队列管理
│   │   │   ├── workers/         # Worker监控
│   │   │   └── cron-jobs/       # 定时任务
│   │   ├── services/            # 公共服务
│   │   │   ├── api.service.ts          # API服务封装
│   │   │   ├── mock-data.service.ts    # Mock数据服务
│   │   │   ├── realtime.service.ts     # 实时更新（轮询）服务
│   │   │   ├── auth.service.ts         # 认证服务
│   │   │   └── alert.service.ts        # 告警服务
│   │   ├── guards/              # 路由守卫
│   │   │   └── auth.guard.ts
│   │   ├── pipes/               # 管道
│   │   │   ├── status.pipe.ts   # 状态相关管道
│   │   │   └── date-format.pipe.ts  # 日期相关管道
│   │   ├── models/              # 类型定义
│   │   │   └── index.ts
│   │   ├── app.component.ts     # 根组件
│   │   ├── app.config.ts        # 应用配置
│   │   └── app.routes.ts        # 路由配置
│   ├── environments/            # 环境配置
│   ├── index.html
│   ├── main.ts
│   └── styles.scss
├── angular.json
├── package.json
├── tsconfig.json
└── proxy.conf.json              # 开发代理配置
```

## 快速开始

### 安装依赖

```bash
cd frontend
npm install
```

### 开发模式运行

```bash
npm start
```

访问 `http://localhost:4200`

### 构建生产版本

```bash
npm run build
```

## 开发代理配置

项目已配置开发时代理（`proxy.conf.json`）：
- `/api` -> `http://localhost:8080`
- `/ws` -> `ws://localhost:8080`

如需修改后端地址，请编辑 `proxy.conf.json` 文件。

## 数据说明

当前版本使用Mock数据服务（`mock-data.service.ts`）提供演示数据。接入真实后端时：

1. 在 `api.service.ts` 中实现真实的HTTP调用
2. 移除各组件中对 `MockDataService` 的依赖，改用 `ApiService`
3. 保持现有接口定义不变

## 状态颜色标识

| 状态 | 颜色 | 说明 |
|------|------|------|
| PENDING / 等待中 | #94a3b8 | 灰色 |
| RUNNING / 执行中 / BUSY | #3b82f6 | 蓝色 |
| SUCCESS / 成功 / ONLINE | #10b981 | 绿色 |
| FAILED / 失败 | #ef4444 | 红色 |
| DEAD_LETTER / 死信 | #7b1fa2 | 紫色 |
| CANCELLED / 已取消 | #f59e0b | 橙色 |
| OFFLINE / 离线 | #94a3b8 | 灰色 |

## 响应式布局

- 桌面端：完整布局，侧边栏展开
- 平板（≤768px）：图表单列显示，筛选器垂直排列
- 手机（≤480px）：统计卡片单列显示

## License

MIT
