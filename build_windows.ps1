# 设置环境变量
$env:PATH = "C:\Users\linfr\.cargo\bin;C:\Users\linfr\AppData\Roaming\npm;" + $env:PATH

# 切换到项目目录
Set-Location "G:\dev\AI\my_todo"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Building Windows Package with PostgreSQL" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Cargo: $(Get-Command cargo -ErrorAction SilentlyContinue).Source" -ForegroundColor Green
Write-Host "pnpm: $(Get-Command pnpm -ErrorAction SilentlyContinue).Source" -ForegroundColor Green
Write-Host "Current Directory: $PWD" -ForegroundColor Green
Write-Host ""

# 运行 Tauri 构建（带 postgres feature）
Write-Host "Running Tauri build with postgres feature..." -ForegroundColor Yellow
pnpm tauri build --features postgres

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "BUILD SUCCESSFUL!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Package location:" -ForegroundColor Cyan
    Get-ChildItem -Path "src-tauri\target\release\bundle" -Recurse -File | Where-Object { $_.Extension -match "\.(msi|exe)$" } | ForEach-Object {
        $size = [math]::Round($_.Length / 1MB, 2)
        Write-Host "  - $($_.FullName) ($size MB)" -ForegroundColor Green
    }
} else {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "BUILD FAILED!" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
}

Write-Host ""
