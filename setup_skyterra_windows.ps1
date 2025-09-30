#requires -Version 5.1

param()

$ErrorActionPreference = 'Stop'

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackendDir = Join-Path $ProjectRoot 'services\api'
$FrontendDir = Join-Path $ProjectRoot 'apps\web'
$EnvFile = Join-Path $ProjectRoot '.env'
$EnvExample = Join-Path $ProjectRoot 'env.example'
$VenvDir = Join-Path $BackendDir '.venv'
$VenvPython = Join-Path $VenvDir 'Scripts\python.exe'
$ManualActions = @()
$FailedSteps = 0

function Add-Manual {
    param([string]$Message)
    $script:ManualActions += $Message
}

function Test-CommandAvailable {
    param([string]$Name, [string]$Hint)
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        Write-Host "[FALTA] No se encontro '$Name'."
        Add-Manual "Instala '$Name'. Sugerencia: $Hint"
        $script:FailedSteps++
        return $false
    }
    return $true
}

function Test-VersionGreaterOrEqual {
    param([string]$Current, [string]$Required)
    $curParts = $Current.Split('.')
    $reqParts = $Required.Split('.')
    for ($i = 0; $i -lt 3; $i++) {
        $cur = if ($i -lt $curParts.Length) { [int]$curParts[$i] } else { 0 }
        $req = if ($i -lt $reqParts.Length) { [int]$reqParts[$i] } else { 0 }
        if ($cur -gt $req) { return $true }
        if ($cur -lt $req) { return $false }
    }
    return $true
}

function Run-Step {
    param([string]$Description, [ScriptBlock]$Action)
    Write-Host "`n==> $Description"
    try {
        & $Action
        if ($LASTEXITCODE -ne 0) {
            throw "Codigo de salida $LASTEXITCODE"
        }
        Write-Host "[OK] $Description"
    } catch {
        Write-Host "[ERROR] ${Description}: $($_.Exception.Message)"
        Add-Manual "$Description. Ejecuta manualmente y corrige el error mostrado."
        $script:FailedSteps++
    }
}

Write-Host "SkyTerra - Setup automatico para Windows"
Write-Host "Proyecto: $ProjectRoot"

$pythonCmd = $null
$pythonArgs = @()
if (Get-Command python -ErrorAction SilentlyContinue) {
    $pythonCmd = (Get-Command python).Source
} elseif (Get-Command py -ErrorAction SilentlyContinue) {
    $pythonCmd = (Get-Command py).Source
    $pythonArgs = @('-3')
} else {
    Write-Host "[ERROR] No se encontro Python en el PATH."
    Add-Manual "Instala Python 3.9+ desde https://www.python.org/downloads/ (habilita 'Add Python to PATH')."
    $FailedSteps++
}

$pythonOk = $false
if ($pythonCmd) {
    try {
        $versionOutput = (& $pythonCmd @pythonArgs '--version' 2>&1).Trim()
        if ($versionOutput -match '^Python\s+([0-9\.]+)') {
            $pyVersion = $matches[1]
            Write-Host "Python detectado: $pyVersion"
            if (-not (Test-VersionGreaterOrEqual $pyVersion '3.9.0')) {
                Write-Host "[WARN] Se recomienda Python 3.9 o superior."
                Add-Manual "Actualiza Python (version actual: $pyVersion)."
            }
            $pythonOk = $true
        } else {
            throw "Salida inesperada: $versionOutput"
        }
    } catch {
        Write-Host ("[ERROR] No se pudo obtener la version de Python: {0}" -f $_.Exception.Message)
        Add-Manual "Verifica la instalacion de Python."
        $FailedSteps++
    }
}

$nodeAvailable = Test-CommandAvailable -Name node -Hint 'Descarga la version LTS en https://nodejs.org/'
if ($nodeAvailable) {
    $nodeVersion = ((& node -v).Trim()).TrimStart('v')
    Write-Host "Node detectado: $nodeVersion"
    if (-not (Test-VersionGreaterOrEqual $nodeVersion '18.0.0')) {
        Write-Host "[WARN] Se recomienda Node 18 o superior."
        Add-Manual "Actualiza Node (version actual: $nodeVersion)."
    }
}

$npmAvailable = Test-CommandAvailable -Name npm -Hint 'npm se instala junto con Node.js; reinstala Node si falta'

if (-not (Test-Path $BackendDir)) {
    Write-Host ("[ERROR] No se encontro el backend en {0}" -f $BackendDir)
    Add-Manual "Verifica que la carpeta services/api exista."
}

if (-not (Test-Path $FrontendDir)) {
    Write-Host ("[ERROR] No se encontro el frontend en {0}" -f $FrontendDir)
    Add-Manual "Verifica que la carpeta apps/web exista."
}

if (-not (Test-Path $EnvFile)) {
    if (Test-Path $EnvExample) {
        Copy-Item $EnvExample $EnvFile
        Write-Host "[OK] Se creo .env a partir de env.example"
        Add-Manual ("Revisa y completa {0} con tus claves reales (Railway DATABASE_URL, Cloudflare R2 AWS_*, Stripe, Mapbox)." -f $EnvFile)
    } else {
        Write-Host "[ERROR] No se encontro env.example para generar .env"
        Add-Manual "Crea manualmente .env siguiendo la documentacion."
    }
} else {
    Write-Host "[OK] Se detecto $EnvFile"
}

$dbMode = 'sqlite'
$dbPlaceholder = 'postgres://user:password@host:5432/dbname'
if (Test-Path $EnvFile) {
    $databaseLine = Select-String -Path $EnvFile -Pattern '^DATABASE_URL=' | Select-Object -Last 1
    if ($databaseLine) {
        $dbValue = $databaseLine.Line.Substring('DATABASE_URL='.Length).Trim()
        if ($dbValue -and ($dbValue -ne $dbPlaceholder)) {
            $dbMode = 'custom'
            Write-Host "[INFO] DATABASE_URL personalizado detectado."
        } elseif ($dbValue -eq $dbPlaceholder) {
            Write-Host "[WARN] DATABASE_URL usa un placeholder. Se usara SQLite local."
            Add-Manual "Copia la DATABASE_URL desde Railway en $EnvFile o comenta la linea para usar SQLite."
        } else {
            Write-Host "[INFO] No se configuro DATABASE_URL. Se usara SQLite local."
        }
    }
}

if ($pythonOk -and (Test-Path $BackendDir)) {
    if (-not (Test-Path $VenvDir)) {
        Run-Step "Crear entorno virtual" { & $pythonCmd @pythonArgs '-m' 'venv' $VenvDir }
    } else {
        Write-Host "[OK] Entorno virtual existente en $VenvDir"
    }

    if (Test-Path $VenvPython) {
        Run-Step "Actualizar pip" { & $VenvPython '-m' 'pip' 'install' '--upgrade' 'pip' }
        Run-Step "Instalar dependencias backend" { & $VenvPython '-m' 'pip' 'install' '-r' (Join-Path $BackendDir 'requirements.txt') }

        $originalDb = $env:DATABASE_URL
        $migrationBlock = {
            & $VenvPython (Join-Path $BackendDir 'manage.py') 'migrate' '--noinput'
        }
        if ($dbMode -eq 'sqlite') {
            $env:DATABASE_URL = ''
            Run-Step "Aplicar migraciones Django" $migrationBlock
            if ($null -ne $originalDb) {
                $env:DATABASE_URL = $originalDb
            } else {
                Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue
            }
        } else {
            Run-Step "Aplicar migraciones Django" $migrationBlock
        }
    } else {
        Write-Host "[ERROR] No se encontro el interprete de la venv en $VenvPython"
        Add-Manual "Revisa la creacion de la venv en $VenvDir"
    }
}

if ((Test-Path $FrontendDir) -and $npmAvailable) {
    Run-Step "Instalar dependencias frontend" {
        Push-Location $FrontendDir
        try {
            npm install
            if ($LASTEXITCODE -ne 0) {
                throw "Codigo de salida $LASTEXITCODE"
            }
        } finally {
            Pop-Location
        }
    }
} elseif (Test-Path $FrontendDir) {
    Add-Manual "No se pudieron instalar dependencias frontend porque npm no esta disponible."
}

Write-Host "`n=== Resumen ==="
if (($ManualActions.Count -eq 0) -and ($FailedSteps -eq 0)) {
    Write-Host "Setup completado sin errores."
} else {
    Write-Host "Acciones manuales pendientes:"
    foreach ($action in $ManualActions) {
        Write-Host " - $action"
    }
    Write-Host "Revisa los mensajes anteriores para mas detalles."
}

Write-Host 'Listo. Usa start_skyterra.bat para iniciar backend y frontend en Windows.'
