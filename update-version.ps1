param (
    [ValidateSet("patch","minor","major")]
    [string]$v = "patch",

    [string]$msg = "Trabajo del día"
)

# 1️⃣ Agregar cambios locales
git add .

# 2️⃣ Commit preliminar con mensaje recibido
git commit -m "$msg"

# 3️⃣ Incrementar versión según tipo
npm version $v

# 4️⃣ Push de la rama actual
$branch = git rev-parse --abbrev-ref HEAD
git push origin $branch

# 5️⃣ Push de tags generados por npm version
git push origin --tags

# 6️⃣ Pull de la rama para traer README actualizado por GitHub Actions
git pull origin $branch

# 7️⃣ Obtener info de versión y commit
$package = Get-Content package.json | ConvertFrom-Json
$version = $package.version
$commit = git rev-parse --short HEAD

# 8️⃣ Obtener URL del repositorio remoto
$repoUrl = git config --get remote.origin.url

# 9️⃣ Mostrar toda la info
Write-Host "✅ Rama actual: $branch"
Write-Host "✅ Versión actual: v$version"
Write-Host "✅ Commit actual: $commit"
Write-Host "✅ Repo remoto: $repoUrl"

# 10️⃣ Actualizar README.md con la nueva versión
#(Get-Content README.md) -replace '(<!--VERSION-->)(.*?)(<!--/VERSION-->)',
# "`$1`nVersión actual: v$version`n`$3" | Set-Content README.md
# manera de usarlo: .\update-version.ps1 -v minor -msg "Mensaje del commit"