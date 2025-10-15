param (
    [ValidateSet("patch","minor","major")]
    [string]$v = "patch",
    [string]$msg = "chore(release): version $v Trabajo en desarrollo"
)

# -----------------------------
# 1. Detección y Sincronización Inicial
# -----------------------------
$branch = git rev-parse --abbrev-ref HEAD
Write-Host "Branch actual: $branch"

# Si estamos en 'main', el flujo es diferente y más estricto.
if ($branch -eq "main") {
    Write-Host "Estás en la rama 'main'. El script se ejecutará en modo 'release'." -ForegroundColor Cyan
    # 1. Asegurarse de que 'main' esté limpia y sincronizada con el remoto.
    if (git status --porcelain) {
        Write-Host "Error: La rama 'main' tiene cambios locales sin comitear. Por favor, guárdalos o descártalos." -ForegroundColor Red
        exit 1
    }
    Write-Host "Sincronizando 'main' con el repositorio remoto..."
    git pull origin main
    if ($LASTEXITCODE -ne 0) { Write-Host "Error al sincronizar 'main'." -ForegroundColor Red; exit 1 }

    # 2. Traer los cambios de 'dev' a 'main'.
    Write-Host "Fusionando 'dev' en 'main'..."
    git merge dev
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Error durante el merge de 'dev'. Resuelve los conflictos y ejecuta el script de nuevo en 'main'." -ForegroundColor Red
        exit 1
    }
    Write-Host "'dev' fusionado correctamente en 'main'." -ForegroundColor Green

} else { # Flujo normal para ramas de desarrollo (ej. 'dev')
    # 1. Sincronizar con el remoto ANTES de empezar
    Write-Host "Sincronizando con origin/$branch..."
    git pull origin $branch
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Error al hacer git pull. Resuelve los conflictos y vuelve a intentarlo." -ForegroundColor Red
        exit 1
    }

    # 2. Comitear cambios de desarrollo (si los hay)
    if (git status --porcelain) {
        Write-Host "Hay cambios sin guardar. Comiteando como '$msg'..."
        git add .
        git commit -m "$msg"
    } else {
        Write-Host "No hay cambios de desarrollo que comitear."
    }

    # 3. Incrementar versión en la rama de desarrollo
    Write-Host "Incrementando versión de desarrollo ($v)..."
    npm version $v -m "feat(release): bump version to %s"
}

# -----------------------------
# 4. Actualizar README.md (se hace en todas las ramas)
# -----------------------------
# Obtenemos la versión del package.json, que ahora es la fuente de verdad.
$package = Get-Content package.json | ConvertFrom-Json
$version = $package.version
$commit = git rev-parse --short HEAD
Write-Host "Versión actual para el README: v$version (commit $commit)" -ForegroundColor Green

# Actualizamos el README aqui mismo
Write-Host "Actualizando README.md..."
$readmePath = "README.md"
$readmeContent = Get-Content $readmePath -Raw -Encoding UTF8

# Aseguramos que el patrón funcione con saltos de línea
$pattern = "(?s)(<!--VERSION-->).*?(<!--/VERSION-->)"
$replacement = "<!--VERSION-->`nVersion actual: $branch v$version (commit $commit)`n<!--/VERSION-->"

# Realizamos el reemplazo
$updatedContent = $readmeContent -replace $pattern, $replacement

# Guardamos el contenido actualizado
Set-Content -Path $readmePath -Value $updatedContent -Encoding UTF8 # Actualizamos el README aqui mismo

# Añadimos el README al último commit (el de la versión) para mantener el historial limpio
git add README.md
git commit --amend --no-edit

# -----------------------------
# 5. Push final a GitHub
# -----------------------------
if ($branch -eq "main") {
    Write-Host "Empujando 'main' y los tags de la nueva versión a GitHub..." -ForegroundColor Cyan
    git push origin $branch
    git push origin --tags
    Write-Host "¡Release en 'main' completado con éxito!" -ForegroundColor Green
} else {
    Write-Host "Empujando cambios de desarrollo a origin/$branch..."
    git push origin $branch
    Write-Host "Push en '$branch' completado."
}

Write-Host "--- Proceso finalizado ---" -ForegroundColor Yellow