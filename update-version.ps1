param (
    [ValidateSet("patch","minor","major")]
    [string]$v = "patch",

    [string]$msg = "Trabajo del día"
)

# -----------------------------
# 1️⃣ Detectar branch actual
# -----------------------------
$branch = git rev-parse --abbrev-ref HEAD
Write-Host "Branch actual: $branch"

# -----------------------------
# 2️⃣ Verificar cambios no comiteados
# -----------------------------
$changes = git status --porcelain
if ($changes) {
    Write-Host "Hay cambios sin commit. Comiteando..."
    git add .
    git commit -m "$msg"
}

# -----------------------------
# 3️⃣ Incrementar versión
# -----------------------------
npm version $v
$package = Get-Content package.json | ConvertFrom-Json
$version = $package.version
$commit = git rev-parse --short HEAD
Write-Host "Nueva version: v$version ($commit)"

# -----------------------------
# 4️⃣ Push según branch
# -----------------------------
if ($branch -eq "main") {
    git push origin $branch
    git push origin --tags
    Write-Host "Push completado en main con tags"
    
    # -----------------------------
    # 5️⃣ Actualizar README.md
    # -----------------------------
    $readme = Get-Content README.md
    $pattern = '(<!--VERSION-->)(.*?)(<!--/VERSION-->)'
    $replacement = "`$1`nVersion actual: v$version (`$commit)`n`$3"
    $readme -replace $pattern, $replacement | Set-Content README.md
    Write-Host "README.md actualizado con version"
} else {
    git push origin $branch
    Write-Host "Push completado en dev (sin tags)"
}
