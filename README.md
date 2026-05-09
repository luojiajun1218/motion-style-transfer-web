# Motion Style Transfer Web System

A deep learning-based motion style transfer web application with real-time BVH file preview and style transformation.

## Features

- **Motion Style Transfer**: Fuse content from source motion with style from style motion to generate new motion sequences
- **Real-time 3D Preview**: Three.js-based skeleton animation rendering with synchronized preview of source, style, and result motions
- **BVH File Support**: Complete BVH file parsing and generation pipeline
- **Intuitive UI**: Drag-and-drop upload, one-click transformation

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18 + TypeScript + Vite + Three.js + React Three Fiber |
| Backend | FastAPI + PyTorch |
| Format | BVH (Biovision Hierarchy) |

## Project Structure

```
├── front/                # React frontend
│   ├── src/
│   │   ├── components/   # UI components
│   │   ├── pages/        # Pages
│   │   └── services/     # API service layer
│   └── package.json
│
├── back/                 # Python backend
│   ├── server/           # FastAPI service
│   │   ├── routers/      # API routes
│   │   ├── services/     # Business logic
│   │   └── models/       # Data models
│   ├── model/            # Deep learning model
│   └── pretrained/       # Pretrained weights (download required)
│
├── data/                 # Data directory (prepare yourself, see below)
│   ├── animation/        # BVH parsing tools
│   └── preprocessed_xia/ # Preprocessed training data
```

## Quick Start

### Requirements

- Python 3.8+
- Node.js 18+
- CUDA 11.4+ (for GPU inference)

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/your-username/motion-style-transfer-web.git
cd motion-style-transfer-web

# Backend dependencies
cd back
pip install -r server/requirements.txt

# Frontend dependencies
cd ../front
npm install
```

### 2. Prepare Data & Model

**Pretrained Model** (required):

Download pretrained weights from [Google Drive](https://drive.google.com/file/d/1yhkAoyDLJHRsJE5HWcyoJ2tprsyZ3msF/view) and place at:
```
back/pretrained/xia_pretrained.pth
```

**Training Data** (optional, only for training):

1. Download `mocap_xia.zip` from https://deepmotionediting.github.io/style_transfer
2. Unzip to `data/` directory
3. Run preprocessing:
   ```bash
   python data/xia_preprocess.py
   ```

### 3. Run

**Backend:**
```bash
uvicorn back.server.main:app --host 0.0.0.0 --port 9000
```

**Frontend:**
```bash
cd front
npm run dev
```

Visit `http://localhost:3000` to use the application.

## Usage

1. **Upload Source Motion**: Select "Source" in the left panel, upload a BVH file (motion content)
2. **Upload Style Motion**: Select "Style" in the left panel, upload a BVH file (motion style)
3. **Execute Transfer**: Click "Transfer" button to generate the fused motion
4. **Preview Result**: Central canvas displays skeleton animations in real-time

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/upload` | POST | Upload BVH file |
| `/api/transfer` | POST | Execute style transfer |
| `/api/file/{id}` | GET | Retrieve BVH file content |

## Reference

The core style transfer algorithm is based on [MoST (CVPR 2024)](https://arxiv.org/abs/2403.06225). Thanks to the authors for their open-source contribution.

Parts of the code reference:
- [GL-Transformer](https://github.com/Boeun-Kim/GL-Transformer) - Transformer architecture
- [Aberman et. al.](https://deepmotionediting.github.io/style_transfer) - Data processing pipeline
- [Park et. al.](https://github.com/soomean/Diverse-Motion-Stylization) - Diverse motion stylization

## License

MIT License
