# MoST Backend 启动脚本
# 用法: ./start_backend.ps1

Set-Location $PSScriptRoot
Write-Host "启动 Motion Style Transfer Backend..." -ForegroundColor Green
python -m back.server.main