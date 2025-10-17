# update-dev.ps1
param (
    [ValidateSet("patch","minor","major")]
    [string]$v = "patch",
    [string]$msg = "chore: trabajo en desarrollo"
)

# 1. Detección de la rama
$branch = git rev-parse --abbrev-ref HEAD
if ($branch -ne "dev") {
    Write-Host "Error: Este script solo debe ejecutarse en la rama 'dev'." -ForegroundColor Red
    exit 1
}
Write-Host "--- Actualizando versión en 'dev' ---" -ForegroundColor Yellow

# 2. Sincronizar con el remoto ANTES de empezar
Write-Host "Sincronizando con origin/dev..."
git pull origin dev
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error al hacer git pull. Resuelve los conflictos y vuelve a intentarlo." -ForegroundColor Red
    exit 1
}

# 3. Comitear cambios de desarrollo pendientes (si los hay)
if (git status --porcelain) {
    Write-Host "Hay cambios sin guardar. Comiteando como '$msg'..."
    git add .
    git commit -m "$msg"
}

# 4. Incrementar versión (solo modifica los archivos, no crea commit)
Write-Host "Incrementando versión de desarrollo ($v)..."
npm version $v --no-git-tag-version
if ($LASTEXITCODE -ne 0) { Write-Host "Error al ejecutar npm version." -ForegroundColor Red; exit 1 }

# 5. Actualizar README.md
$package = Get-Content package.json | ConvertFrom-Json
$version = $package.version
Write-Host "Actualizando README.md para la versión v$version..."
$readmePath = "README.md"
$readmeContent = Get-Content $readmePath -Raw -Encoding UTF8
$pattern = "(?s)(<!--VERSION-->).*?(<!--/VERSION-->)"
$replacement = "<!--VERSION-->`nVersion actual: dev v$version`n<!--/VERSION-->"
$updatedContent = $readmeContent -replace $pattern, $replacement
Set-Content -Path $readmePath -Value $updatedContent -Encoding UTF8

# 6. Crear un único commit de versión
Write-Host "Creando commit unificado para la versión v$version..."
git add package.json package-lock.json README.md
git commit -m "chore(release): version v$version"

# 7. Empujar a GitHub
Write-Host "Empujando cambios a origin/dev..."
git push origin dev

Write-Host "--- Proceso en 'dev' finalizado con éxito ---" -ForegroundColor Green
