# update-main.ps1
# Release en la rama 'main': sincroniza con 'dev', crea tag y pushea.
# 'main' es un espejo exacto de 'origin/dev' (reset --hard).
# Asume que la versión fue incrementada previamente en 'dev' por update-dev.ps1.
param(
    [switch]$SkipBuild,     # Opcional: saltear el build de verificación
    [switch]$SkipTag        # Opcional: no crear tag (útil si ya existe)
)

# --- 1. Detección de la rama ---
$branch = git rev-parse --abbrev-ref HEAD
if ($branch -ne "main") {
    Write-Host "Error: Este script solo debe ejecutarse en la rama 'main'." -ForegroundColor Red
    exit 1
}
Write-Host "--- Iniciando proceso de Release en 'main' ---" -ForegroundColor Cyan

# --- 2. Sincronizar 'dev' para asegurarnos de que tenemos la última versión ---
Write-Host "Trayendo los últimos cambios de 'dev'..."
git fetch origin dev
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error al traer 'dev'. Abortando." -ForegroundColor Red
    exit 1
}

# --- 2b. Verificar que no hay cambios sin commitear en 'main' ---
if (git status --porcelain) {
    Write-Host "Error: Hay cambios sin commitear en 'main'. Commitea o descarta antes de hacer release." -ForegroundColor Red
    exit 1
}

# --- 3. Forzar a 'main' a ser un espejo exacto de 'origin/dev' ---
Write-Host "Reseteando 'main' para que sea idéntica a 'origin/dev'..."
git reset --hard origin/dev
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error durante el reset. Abortando." -ForegroundColor Red
    exit 1
}
Write-Host "'main' ahora es un espejo de 'dev'." -ForegroundColor Green

# --- 3b. Verificar build antes de push (integridad de calidad) ---
if (-not $SkipBuild) {
    Write-Host "Verificando build (npm run build)..."
    npm run build
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Error: El build falló. No se hará push. Arreglalo antes del release." -ForegroundColor Red
        exit 1
    }
    Write-Host "Build OK." -ForegroundColor Green
}

# --- 4. Obtener la versión y crear el tag de release ---
$package = Get-Content package.json | ConvertFrom-Json
$version = $package.version
$tagName = "v$version"

Write-Host "Versión del release: $tagName" -ForegroundColor Green

if (-not $SkipTag) {
    # Verificar si el tag ya existe localmente
    $tagExists = git tag --list "$tagName"
    if ($tagExists) {
        Write-Host "El tag '$tagName' ya existe localmente. Saltando creación." -ForegroundColor Yellow
    } else {
        Write-Host "Creando tag de release: $tagName"
        git tag "$tagName"
        if ($LASTEXITCODE -ne 0) {
            Write-Host "Error al crear el tag '$tagName'." -ForegroundColor Red
            exit 1
        }
    }
} else {
    Write-Host "Saltando creación de tag (-SkipTag)." -ForegroundColor Yellow
}

# --- 5. Empujar todo a GitHub ---
Write-Host "Empujando 'main' a GitHub..."
git push --force origin main
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error al hacer push de 'main'." -ForegroundColor Red
    exit 1
}

if (-not $SkipTag) {
    Write-Host "Empujando tag '$tagName' a GitHub..."
    git push origin "$tagName"
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Advertencia: No se pudo hacer push del tag '$tagName'." -ForegroundColor Yellow
    }
}

Write-Host "--- ¡Release completado con éxito! ---" -ForegroundColor Green
Write-Host "Tag: $tagName | Deploy automático por GitHub Action 'firebase-hosting-main.yml'" -ForegroundColor Cyan
