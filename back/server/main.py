from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from back.server.routers.bvh import router

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
app.include_router(router)


@app.get("/")
async def root():
    return {"message": "Motion Style Transfer API is running"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)