# My TODO

一个基于 Tauri + React + TypeScript 构建的跨平台桌面待办事项应用。

## 功能特性

- **多视图支持**
  - 看板视图：拖拽式任务管理
  - 日历视图：按日期查看和管理任务

- **任务管理**
  - 创建、编辑、删除任务
  - 任务优先级设置（高、中、低）
  - 任务分类管理
  - 任务完成状态追踪
  - 拖拽排序任务

- **筛选与搜索**
  - 按优先级筛选
  - 按分类筛选
  - 按完成状态筛选
  - 关键词搜索

- **数据存储**
  - SQLite 本地数据库存储
  - 可选的云端 API 同步

## 技术栈

### 前端
- **React 19** - UI 框架
- **TypeScript** - 类型安全
- **Vite** - 构建工具
- **Tailwind CSS** - 样式框架
- **Zustand** - 状态管理
- **React Datepicker** - 日期选择
- **Lucide React** - 图标库
- **@dnd-kit** - 拖拽功能

### 后端
- **Tauri 2** - 桌面应用框架
- **Rust** - 后端逻辑
- **SQLite (better-sqlite3)** - 数据库

## 开发环境

### 推荐的 IDE 设置

- [VS Code](https://code.visualstudio.com/)
- [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) 插件
- [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer) 插件

### 环境要求

- **Node.js** >= 18
- **pnpm** (推荐) 或 npm/yarn
- **Rust** >= 1.70
- **系统依赖**
  - Windows: 无额外要求
  - Linux: 查看 [Tauri 文档](https://tauri.app/v1/guides/getting-started/prerequisites)
  - macOS: Xcode 命令行工具

## 安装

```bash
# 克隆仓库
git clone https://github.com/linfree/my-todo.git
cd my-todo

# 安装依赖
pnpm install
```

## 开发

```bash
# 启动开发服务器
pnpm tauri dev
```

## 构建

### Windows

```bash
# 使用构建脚本
build_windows.bat

# 或手动构建
pnpm tauri build
```

### macOS / Linux

```bash
pnpm tauri build
```

构建产物位于 `src-tauri/target/release/bundle/` 目录。

## 配置

### API 设置

应用支持配置 API 端点进行数据同步。设置入口位于应用内的设置菜单。

### 本地设置

创建 `settings.local.json` 文件可覆盖默认配置（该文件已加入 .gitignore）。

## 项目结构

```
my-todo/
├── src/                    # 前端源码
│   ├── components/         # React 组件
│   ├── lib/               # 工具函数和 API
│   ├── store/             # Zustand 状态管理
│   └── types/             # TypeScript 类型定义
├── src-tauri/             # Tauri 后端
│   ├── src/               # Rust 源码
│   └── tauri.conf.json    # Tauri 配置
└── public/                # 静态资源
```

## 脚本命令

| 命令 | 说明 |
|------|------|
| `pnpm dev` | 启动 Vite 开发服务器 |
| `pnpm build` | 构建前端资源 |
| `pnpm preview` | 预览构建结果 |
| `pnpm tauri dev` | 启动 Tauri 开发模式 |
| `pnpm tauri build` | 构建桌面应用 |

## 许可证

MIT

## 贡献

欢迎提交 Issue 和 Pull Request！
