from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from back.server.routers.auth import router as auth_router
from back.server.routers.bvh import router as bvh_router
from back.server.routers.preset import router as preset_router

app = FastAPI(
    title="Motion Style Transfer API",
    description="Backend API for BVH motion style transfer",
    version="1.0.0"
)

# CORS 配置 - 允许前端访问
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3006", "http://127.0.0.1:3000", "http://127.0.0.1:3006"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(auth_router)
app.include_router(bvh_router)
app.include_router(preset_router)


@app.get("/")
async def root():
    return {"message": "Motion Style Transfer API is running"}


if __name__ == "__main__":
    import uvicorn
    # 使用端口 9000 避开 Windows Hyper-V 保留端口范围 7998-8097
    uvicorn.run(app, host="0.0.0.0", port=9000)
