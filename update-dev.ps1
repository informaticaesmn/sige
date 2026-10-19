# update-dev.ps1
# Automatiza el versionado en la rama dev: commitea cambios, incrementa versión,
# actualiza README.md y pushea todo. Saltea el incremento si no hay cambios reales.
param (
    [ValidateSet("patch","minor","major")]
    [string]$v = "patch",
    [string]$msg = "chore: trabajo en desarrollo",
    [switch]$SkipBuild,     # Opcional: saltear el build de verificación
    [switch]$Force          # Opcional: forzar incremento incluso sin cambios
)

# --- 1. Detección de la rama ---
$branch = git rev-parse --abbrev-ref HEAD
if ($branch -ne "dev") {
    Write-Host "Error: Este script solo debe ejecutarse en la rama 'dev'." -ForegroundColor Red
    exit 1
}
Write-Host "--- Actualizando versión en 'dev' ---" -ForegroundColor Yellow

# --- 2. Sincronizar con el remoto ANTES de empezar ---
Write-Host "Sincronizando con origin/dev..."
git pull origin dev
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error al hacer git pull. Resuelve los conflictos y vuelve a intentarlo." -ForegroundColor Red
    exit 1
}

# --- 3. Comitear cambios de desarrollo pendientes (si los hay) ---
$hasLocalChanges = $false
if (git status --porcelain) {
    Write-Host "Hay cambios sin guardar. Comiteando como '$msg'..."
    git add .
    # Usar --no-verify solo si se necesita; de lo contrario respetar hooks
    git commit -m "$msg"
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Error al comitear cambios. Abortando." -ForegroundColor Red
        exit 1
    }
    $hasLocalChanges = $true
}

# --- 3b. Verificar si hay cambios NO COMMITEADOS respecto al remoto ---
# Si no hay cambios locales ni diferencias con origin/dev, evitar incremento vacío
git fetch origin dev
if ($LASTEXITCODE -ne 0) {
    Write-Host "Advertencia: No se pudo hacer git fetch. Continuando con precaución..." -ForegroundColor Yellow
}

$unpushedChanges = git rev-list --count "origin/dev..dev"
if ($LASTEXITCODE -ne 0) { $unpushedChanges = 0 }

if (-not $Force -and -not $hasLocalChanges -and $unpushedChanges -eq 0) {
    Write-Host "No hay cambios nuevos desde el último push a origin/dev." -ForegroundColor Yellow
    Write-Host "Saltando el incremento de versión. Usa -Force para forzar." -ForegroundColor Yellow
    Write-Host "--- Proceso finalizado (sin cambios) ---" -ForegroundColor Green
    exit 0
}

# --- 3c. Verificar tests unitarios ANTES de incrementar versión ---
Write-Host "Ejecutando tests unitarios rápidos (npm run test:unit)..."
npm run test:unit
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Los tests unitarios fallaron. Arreglalo antes de versionar." -ForegroundColor Red
    exit 1
}
Write-Host "Tests unitarios OK." -ForegroundColor Green

# --- 4. Verificar build ANTES de incrementar versión ---
if (-not $SkipBuild) {
    Write-Host "Verificando build (npm run build)..."
    npm run build
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Error: El build falló. Arreglalo antes de versionar." -ForegroundColor Red
        exit 1
    }
    Write-Host "Build OK." -ForegroundColor Green
}

# --- 5. Incrementar versión (solo modifica los archivos, no crea commit ni tag) ---
Write-Host "Incrementando versión de desarrollo ($v)..."
npm version $v --no-git-tag-version
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error al ejecutar npm version." -ForegroundColor Red
    exit 1
}

# --- 6. Actualizar README.md con la nueva versión ---
$package = Get-Content package.json | ConvertFrom-Json
$version = $package.version
Write-Host "Actualizando README.md para la versión v$version..."
$readmePath = "README.md"
$readmeContent = Get-Content $readmePath -Raw -Encoding UTF8

# El marcador de versión tiene que quedar en UNA sola línea: el workflow
# update-readme-v2.yml lo reemplaza con `sed` (trabaja línea a línea). Antes se
# escribía con saltos de línea y a partir de ahí el workflow nunca volvía a matchear.
$pattern = "(?s)<!--VERSION-->.*?<!--/VERSION-->"
$replacement = "<!--VERSION-->Versión actual: dev v$version<!--/VERSION-->"
$updatedContent = $readmeContent -replace $pattern, $replacement
# Escribir SIN BOM: `Set-Content -Encoding UTF8` en PS 5.1 agrega BOM al archivo.
[System.IO.File]::WriteAllText((Resolve-Path $readmePath).Path, $updatedContent, (New-Object System.Text.UTF8Encoding($false)))

# --- 7. Crear un único commit de versión ---
Write-Host "Creando commit de versión v$version..."
git add package.json package-lock.json README.md
git commit -m "chore(release): version dev v$version"
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error al crear el commit de versión. ¿Hay cambios para commitear?" -ForegroundColor Red
    exit 1
}

# --- 8. Empujar a GitHub ---
Write-Host "Empujando cambios a origin/dev..."
git push origin dev
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error al hacer git push. Revisá la conexión y permisos." -ForegroundColor Red
    exit 1
}

Write-Host "--- Proceso en 'dev' finalizado con éxito ---" -ForegroundColor Green
Write-Host "Versión dev: v$version" -ForegroundColor Cyan
