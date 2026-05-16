"""
一键启动脚本 - 同时启动前后端服务
"""
import subprocess
import sys
import os
import signal
import time
import queue
import threading
from pathlib import Path

# 项目根目录
ROOT_DIR = Path(__file__).parent.absolute()


def stream_process_output(name, proc, output_queue):
    if not proc.stdout:
        return
    for line in iter(proc.stdout.readline, ""):
        if line:
            output_queue.put((name, line.rstrip()))


def child_process_options():
    """Keep Ctrl+C handling in this launcher on Windows."""
    if sys.platform == "win32":
        return {"creationflags": subprocess.CREATE_NEW_PROCESS_GROUP}
    return {}


def stop_process(name, proc):
    """Stop a spawned dev-server process and its children."""
    if proc.poll() is not None:
        return

    print(f"[{name}] 正在停止...")
    if sys.platform == "win32":
        subprocess.run(
            ["taskkill", "/PID", str(proc.pid), "/T", "/F"],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            check=False,
        )
    else:
        proc.terminate()
        try:
            proc.wait(timeout=5)
        except subprocess.TimeoutExpired:
            proc.kill()
    print(f"[{name}] 已停止")


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
    output_queue = queue.Queue()

    try:
        # 启动后端 (FastAPI)
        print("\n[后端] 启动 FastAPI 服务 (端口 9000)...")
        backend_cmd = [
            sys.executable, "-m", "uvicorn",
            "back.server.main:app",
            "--host", "0.0.0.0",
            "--port", "9000"
        ]
        backend_env = os.environ.copy()
        backend_env["AUTH_TEMPORARY_LOGIN"] = "1"
        backend_proc = subprocess.Popen(
            backend_cmd,
            cwd=ROOT_DIR,
            env=backend_env,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            encoding='utf-8',
            errors='replace',
            **child_process_options()
        )
        processes.append(("后端", backend_proc))
        threading.Thread(
            target=stream_process_output,
            args=("后端", backend_proc, output_queue),
            daemon=True
        ).start()

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
            shell=True,
            **child_process_options()
        )
        processes.append(("前端", frontend_proc))
        threading.Thread(
            target=stream_process_output,
            args=("前端", frontend_proc, output_queue),
            daemon=True
        ).start()

        print("\n" + "=" * 50)
        print("服务已启动:")
        print("  后端 API:  http://localhost:9000")
        print("  前端界面:  http://localhost:3000")
        print("=" * 50)
        print("\n按 Ctrl+C 停止所有服务...")

        # 实时打印输出
        reported_exits = set()
        while True:
            while True:
                try:
                    name, line = output_queue.get_nowait()
                except queue.Empty:
                    break
                print(f"[{name}] {line}")

            # 检查进程是否存活
            for name, proc in processes:
                if proc.poll() is not None and name not in reported_exits:
                    reported_exits.add(name)
                    print(f"[{name}] 进程已退出 (code: {proc.returncode})")
            if len(reported_exits) == len(processes):
                break

            time.sleep(0.1)

    except KeyboardInterrupt:
        print("\n\n正在停止所有服务...")

    finally:
        # 清理进程
        for name, proc in processes:
            stop_process(name, proc)

        print("\n所有服务已停止。再见!")

if __name__ == "__main__":
    main()
