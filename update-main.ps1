# update-main.ps1

# 1. Detección de la rama
$branch = git rev-parse --abbrev-ref HEAD
if ($branch -ne "main") {
    Write-Host "Error: Este script solo debe ejecutarse en la rama 'main'." -ForegroundColor Red
    exit 1
}
Write-Host "--- Iniciando proceso de Release en 'main' ---" -ForegroundColor Cyan

# 2. Sincronizar 'dev' para asegurarnos de que tenemos la última versión
Write-Host "Trayendo los últimos cambios de 'dev'..."
git fetch origin dev
if ($LASTEXITCODE -ne 0) { Write-Host "Error al traer 'dev'." -ForegroundColor Red; exit 1 }

# 3. Forzar a 'main' a ser un espejo exacto de 'dev' (¡La solución a los conflictos!)
Write-Host "Reseteando 'main' para que sea idéntica a 'origin/dev'..."
git reset --hard origin/dev
if ($LASTEXITCODE -ne 0) { Write-Host "Error durante el reset." -ForegroundColor Red; exit 1 }
Write-Host "'main' ahora es un espejo de 'dev'." -ForegroundColor Green

# 4. Obtener la versión y crear el tag de release
$package = Get-Content package.json | ConvertFrom-Json
$version = $package.version
Write-Host "Creando tag de release: v$version" -ForegroundColor Green
git tag "v$version"
if ($LASTEXITCODE -ne 0) { Write-Host "Error al crear el tag v$version. Puede que ya exista." -ForegroundColor Red; exit 1 }

# 5. Empujar todo a GitHub (con --force para que acepte la nueva historia de 'main')
Write-Host "Empujando 'main' y el tag v$version a GitHub..."
git push --force origin main
git push origin "v$version"

Write-Host "--- ¡Release completado con éxito! ---" -ForegroundColor Green
