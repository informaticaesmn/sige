param (
    [ValidateSet("patch","minor","major")]
    [string]$v = "patch",

    [string]$msg = "chore(release): version $v Trabajo en desarrollo"
)

# -----------------------------
# 1. Detectar branch actual
# -----------------------------
$branch = git rev-parse --abbrev-ref HEAD
Write-Host "Branch actual: $branch"

# -----------------------------
# 2. Sincronizar con el remoto ANTES de empezar
# -----------------------------
Write-Host "Sincronizando con origin/$branch..."
git pull origin $branch
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error al hacer git pull. Por favor, resuelve los conflictos manualmente y vuelve a intentarlo."
    exit 1 # Detiene el script si el pull falla
}

# -----------------------------
# 3. Comitear cambios de desarrollo (si los hay)
# -----------------------------
if (git status --porcelain) {
    Write-Host "Hay cambios sin guardar. Comiteando como '$msg'..."
    git add .
    git commit -m "$msg"
} else {
    Write-Host "No hay cambios de desarrollo que comitear. Continuando..."
}

# -----------------------------
# 4. Incrementar version y actualizar README
# -----------------------------
Write-Host "Incrementando version ($v)..."
# Usamos -m para personalizar el mensaje del commit que crea npm version
npm version $v -m "chore(release): version %s"
$package = Get-Content package.json | ConvertFrom-Json
$version = $package.version
$commit = git rev-parse --short HEAD
Write-Host "Nueva version: v$version ($commit)"

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

# Anadimos el README al ultimo commit (el de la version) para mantener el historial limpio
git add README.md
git commit --amend --no-edit

# -----------------------------
# 5. Push final a GitHub
# -----------------------------
Write-Host "Empujando cambios a origin/$branch..."
if ($branch -eq "main") {
    # El tag ya fue creado por `npm version`, solo necesitamos empujarlo
    git push origin $branch
    git push origin --tags
    Write-Host "Push completado en 'main' con tags."
} else {
    git push origin $branch
    Write-Host "Push completado en '$branch' (sin tags)."
}

Write-Host "Proceso finalizado con exito."