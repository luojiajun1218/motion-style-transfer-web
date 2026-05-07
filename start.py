"""
一键启动脚本 - 同时启动前后端服务
"""
import subprocess
import sys
import os
import signal
import time
from pathlib import Path

# 项目根目录
ROOT_DIR = Path(__file__).parent.absolute()

def check_node_modules():
    """检查前端依赖是否安装"""
    node_modules = ROOT_DIR / "front" / "node_modules"
    if not node_modules.exists():
        print("[前端] node_modules 不存在，正在安装依赖...")
        subprocess.run(["npm", "install"], cwd=ROOT_DIR / "front", shell=True)
        print("[前端] 依赖安装完成")

def check_python_deps():
    """检查后端 Python 依赖"""
    try:
        import fastapi
        import uvicorn
    except ImportError:
        print("[后端] 缺少依赖，正在安装...")
        subprocess.run([sys.executable, "-m", "pip", "install", "-r",
                       str(ROOT_DIR / "back" / "server" / "requirements.txt")])
        print("[后端] 依赖安装完成")

def main():
    print("=" * 50)
    print("Motion Style Transfer Web System")
    print("=" * 50)

    # 检查依赖
    check_node_modules()
    check_python_deps()

    processes = []

    try:
        # 启动后端 (FastAPI)
        print("\n[后端] 启动 FastAPI 服务 (端口 9000)...")
        backend_cmd = [
            sys.executable, "-m", "uvicorn",
            "back.server.main:app",
            "--host", "0.0.0.0",
            "--port", "9000"
        ]
        backend_proc = subprocess.Popen(
            backend_cmd,
            cwd=ROOT_DIR,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            encoding='utf-8',
            errors='replace'
        )
        processes.append(("后端", backend_proc))

        # 等待后端启动
        time.sleep(2)

        # 启动前端 (Vite)
        print("[前端] 启动 Vite 开发服务器 (端口 3000)...")
        frontend_cmd = ["npm", "run", "dev"]
        frontend_proc = subprocess.Popen(
            frontend_cmd,
            cwd=ROOT_DIR / "front",
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            encoding='utf-8',
            errors='replace',
            shell=True
        )
        processes.append(("前端", frontend_proc))

        print("\n" + "=" * 50)
        print("服务已启动:")
        print("  后端 API:  http://localhost:9000")
        print("  前端界面:  http://localhost:3000")
        print("=" * 50)
        print("\n按 Ctrl+C 停止所有服务...")

        # 实时打印输出
        while True:
            for name, proc in processes:
                if proc.stdout:
                    line = proc.stdout.readline()
                    if line:
                        print(f"[{name}] {line.rstrip()}")

            # 检查进程是否存活
            for name, proc in processes:
                if proc.poll() is not None:
                    print(f"[{name}] 进程已退出 (code: {proc.returncode})")

            time.sleep(0.1)

    except KeyboardInterrupt:
        print("\n\n正在停止所有服务...")

    finally:
        # 清理进程
        for name, proc in processes:
            if proc.poll() is None:
                print(f"[{name}] 正在停止...")
                proc.terminate()
                try:
                    proc.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    proc.kill()
                print(f"[{name}] 已停止")

        print("\n所有服务已停止。再见!")

if __name__ == "__main__":
    main()