function Show-Tree {
    param(
        [string]$Path = ".",
        [string]$Indent = "",
        [string[]]$Exclude = @('node_modules', 'dist', '.git', 'build', 'coverage')
    )
    
    $item = Get-Item $Path
    if ($item.Name -in $Exclude) { return }
    
    if ($item.PSIsContainer) {
        "$Indent[+] $($item.Name)/"
        $children = Get-ChildItem $Path -Force | 
                   Where-Object { $_.Name -notin $Exclude -and $_.Name -notmatch '^\..*' }
        
        foreach ($child in $children) {
            Show-Tree -Path $child.FullName -Indent "$Indent  " -Exclude $Exclude
        }
    } else {
        "$Indent$($item.Name)"
    }
}

Show-Tree -Path "." -Exclude @('node_modules', 'dist', '.git', 'build', 'coverage', '.vscode', '.idea') | 
Out-File -FilePath estructura.txt -Encoding UTF8