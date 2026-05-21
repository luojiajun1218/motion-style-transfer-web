<a id="english"></a>

# MST: Motion Style Transfer Web System

[English](#english) | [中文](#zh)

MST is a BVH motion style transfer demo system. It includes a React + Three.js frontend and a FastAPI backend. You can upload BVH motion files, choose custom or preset style files, and generate new stylized BVH results.

## Features

- Upload, preview, and play BVH files
- Compare source motion, style motion, and transfer result in three synchronized views
- Quickly transfer motion with preset styles
- Upload a custom style BVH file
- Log in with email verification codes, with temporary login support for development
- Download transferred BVH results

## Project Structure

```text
.
├── back/                 # FastAPI service and MST inference code
│   ├── server/           # Web API, routes, services, and backend tests
│   ├── model/            # MST model definitions
│   ├── pretrained/       # Model weight directory, prepared locally
│   └── xia_dataset.yml   # Dataset and skeleton configuration
├── data/                 # Local data, uploaded files, and result files, ignored by Git by default
│   ├── preset_styles/    # Preset style BVH files
│   ├── preprocessed_xia/ # Normalization statistics
│   ├── uploads/          # Runtime uploaded files
│   └── results/          # Runtime generated results
├── front/                # React + Vite frontend
└── start.py              # One-command frontend/backend launcher
```

## Requirements

- Python 3.10+, preferably with a virtual environment
- Node.js 18+ and npm
- PyTorch. CPU inference is supported; the backend automatically uses GPU when CUDA is available.
- Local model and data files:
  - `back/pretrained/xia_pretrained.pth`
  - `data/preprocessed_xia/distribution.npz`
  - `data/preset_styles/*.bvh`

`data/` and model weight files are ignored by `.gitignore` by default. If you start from a clean repository, put these files in the corresponding directories first.

## Quick Start

Run this command from the project root:

```bash
python start.py
```

The script checks frontend `node_modules` and basic backend dependencies, then starts:

- Backend API: `http://localhost:9000`
- Frontend page: `http://localhost:3000`

`start.py` sets `AUTH_TEMPORARY_LOGIN=1`, which is suitable for local development. You can use the temporary login flow on the login page.

## Manual Start

Backend:

```bash
python -m pip install -r back/server/requirements.txt
python -m uvicorn back.server.main:app --host 0.0.0.0 --port 9000
```

Frontend:

```bash
cd front
npm install
npm run dev
```

The frontend development server proxies `/api` requests to `http://localhost:9000`.

## Login Configuration

Backend APIs require a Bearer token by default. For development, you can enable temporary login:

```bash
set AUTH_TEMPORARY_LOGIN=1
```

To use real email verification code login, configure SMTP:

```bash
set SMTP_HOST=smtp.example.com
set SMTP_PORT=587
set SMTP_FROM=no-reply@example.com
set SMTP_USERNAME=your-user
set SMTP_PASSWORD=your-password
set SMTP_STARTTLS=1
```

You can enable debug verification codes with:

```bash
set AUTH_DEBUG_CODES=1
```

PowerShell users can set environment variables with `$env:NAME="value"`.

## Common Commands

Frontend tests:

```bash
cd front
npm test
```

Frontend build:

```bash
cd front
npm run build
```

Backend tests:

```bash
python -m unittest discover back.server.tests
```

Test only the transfer API contract:

```bash
python -m unittest back.server.tests.test_transfer_contract
```

## API Overview

All business APIs are mounted under `/api`:

- `POST /api/auth/request-code`: request a login verification code
- `POST /api/auth/verify-code`: verify the login code and return a token
- `GET /api/auth/session`: read the current login session
- `POST /api/auth/logout`: log out
- `POST /api/upload`: upload a BVH file
- `POST /api/transfer`: run motion style transfer
- `GET /api/file/{file_id}`: download or read a BVH file
- `GET /api/preset/styles`: read the preset style list
- `GET /api/preset/{style_id}`: read the file ID for a specified preset style

`/api/upload`, `/api/transfer`, `/api/file/*`, and `/api/preset/*` require authentication.

## Data and Outputs

- Uploaded files are saved to `data/uploads/`
- Transfer results are saved to `data/results/`
- Preset styles are loaded from `data/preset_styles/`
- Normalization statistics are loaded from `data/preprocessed_xia/distribution.npz`

These directories may contain large runtime files and are usually not committed to Git. To clean local results, delete runtime files under `data/uploads/` and `data/results/`.

## Notes

- The current inference flow uses `style_transfer` from `back/demo.py`, which loads `back/xia_dataset.yml`, `data/preprocessed_xia/distribution.npz`, and `back/pretrained/xia_pretrained.pth`.
- Only `.bvh` uploads are supported.
- Default ports are backend `9000` and frontend `3000`. To change the frontend port or proxy, edit `front/vite.config.ts`.
- On Windows, starting with `python start.py` is recommended. The script handles child process cleanup when Ctrl+C is pressed.

## Reference

The core style transfer algorithm is based on [MoST (CVPR 2024)](https://arxiv.org/abs/2403.06225).

Related projects and resources:

- [GL-Transformer](https://github.com/Boeun-Kim/GL-Transformer): Transformer architecture
- [Aberman et al.](https://deepmotionediting.github.io/style_transfer): data processing pipeline
- [Diverse Motion Stylization](https://github.com/soomean/Diverse-Motion-Stylization): motion stylization reference

## License

MIT License

<a id="zh"></a>

## MST：动作风格迁移 Web 系统

[English](#english) | [中文](#zh)

MST 是一个 BVH 动作风格迁移演示系统。项目包含一个 React + Three.js 前端和一个 FastAPI 后端，可以上传 BVH 动作文件、选择自定义或预设风格文件，并生成新的风格化 BVH 结果。

## 功能

- BVH 文件上传、预览和播放
- 源动作、风格动作、迁移结果三视图对比
- 基于预设风格的快速迁移
- 自定义风格 BVH 上传
- 邮箱验证码登录，开发模式支持临时登录
- 迁移结果 BVH 下载

## 项目结构

```text
.
├── back/                 # FastAPI 服务和 MST 推理代码
│   ├── server/           # Web API、路由、服务和后端测试
│   ├── model/            # MST 模型定义
│   ├── pretrained/       # 模型权重目录，需本地准备
│   └── xia_dataset.yml   # 数据集和骨骼配置
├── data/                 # 本地数据、上传文件、结果文件，默认不纳入 Git
│   ├── preset_styles/    # 预设风格 BVH
│   ├── preprocessed_xia/ # 归一化统计数据
│   ├── uploads/          # 运行时上传文件
│   └── results/          # 运行时生成结果
├── front/                # React + Vite 前端
└── start.py              # 一键启动前后端
```

## 环境要求

- Python 3.10+，建议使用虚拟环境
- Node.js 18+ 和 npm
- PyTorch。可使用 CPU 运行；有 CUDA 时后端会自动使用 GPU。
- 本地模型和数据文件：
  - `back/pretrained/xia_pretrained.pth`
  - `data/preprocessed_xia/distribution.npz`
  - `data/preset_styles/*.bvh`

`data/` 和模型权重文件默认被 `.gitignore` 排除。如果从干净仓库开始，需要先把这些文件放到对应目录。

## 快速启动

在项目根目录执行：

```bash
python start.py
```

脚本会自动检查前端 `node_modules` 和后端基础依赖，然后启动：

- 后端 API：`http://localhost:9000`
- 前端页面：`http://localhost:3000`

`start.py` 会设置 `AUTH_TEMPORARY_LOGIN=1`，适合本地开发调试。页面登录时可以使用临时登录流程。

## 手动启动

后端：

```bash
python -m pip install -r back/server/requirements.txt
python -m uvicorn back.server.main:app --host 0.0.0.0 --port 9000
```

前端：

```bash
cd front
npm install
npm run dev
```

前端开发服务器会把 `/api` 请求代理到 `http://localhost:9000`。

## 登录配置

后端接口默认需要 Bearer Token。开发时可以启用临时登录：

```bash
set AUTH_TEMPORARY_LOGIN=1
```

如果需要真实邮箱验证码登录，可以配置 SMTP：

```bash
set SMTP_HOST=smtp.example.com
set SMTP_PORT=587
set SMTP_FROM=no-reply@example.com
set SMTP_USERNAME=your-user
set SMTP_PASSWORD=your-password
set SMTP_STARTTLS=1
```

调试验证码可以开启：

```bash
set AUTH_DEBUG_CODES=1
```

PowerShell 用户可使用 `$env:NAME="value"` 设置环境变量。

## 常用命令

前端测试：

```bash
cd front
npm test
```

前端构建：

```bash
cd front
npm run build
```

后端测试：

```bash
python -m unittest discover back.server.tests
```

单独测试迁移接口契约：

```bash
python -m unittest back.server.tests.test_transfer_contract
```

## API 概览

所有业务接口都挂在 `/api` 下：

- `POST /api/auth/request-code`：请求登录验证码
- `POST /api/auth/verify-code`：验证登录验证码并返回 token
- `GET /api/auth/session`：读取当前登录会话
- `POST /api/auth/logout`：退出登录
- `POST /api/upload`：上传 BVH 文件
- `POST /api/transfer`：执行动作风格迁移
- `GET /api/file/{file_id}`：下载或读取 BVH 文件
- `GET /api/preset/styles`：读取预设风格列表
- `GET /api/preset/{style_id}`：读取指定预设风格对应的文件 ID

`/api/upload`、`/api/transfer`、`/api/file/*` 和 `/api/preset/*` 都需要认证。

## 数据和输出

- 上传文件会保存到 `data/uploads/`
- 迁移结果会保存到 `data/results/`
- 预设风格来自 `data/preset_styles/`
- 归一化统计数据来自 `data/preprocessed_xia/distribution.npz`

这些目录可能包含较大的运行时文件，通常不提交到 Git。需要清理本地结果时，可以删除 `data/uploads/` 和 `data/results/` 中的运行时文件。

## 注意事项

- 当前推理流程使用 `back/demo.py` 中的 `style_transfer`，会加载 `back/xia_dataset.yml`、`data/preprocessed_xia/distribution.npz` 和 `back/pretrained/xia_pretrained.pth`。
- 仅支持 `.bvh` 文件上传。
- 端口默认是后端 `9000`、前端 `3000`。如需修改前端端口或代理，编辑 `front/vite.config.ts`。
- Windows 下建议通过 `python start.py` 启动，脚本已处理 Ctrl+C 时的子进程清理。

## 参考

核心动作风格迁移算法基于 [MoST (CVPR 2024)](https://arxiv.org/abs/2403.06225)。

相关项目和资源：

- [GL-Transformer](https://github.com/Boeun-Kim/GL-Transformer)：Transformer 架构
- [Aberman et al.](https://deepmotionediting.github.io/style_transfer)：数据处理流程
- [Diverse Motion Stylization](https://github.com/soomean/Diverse-Motion-Stylization)：动作风格化参考

## 许可证

MIT License
