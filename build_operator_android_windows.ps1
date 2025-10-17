#requires -Version 5.1
<#
.SYNOPSIS
  Genera un APK de producción para la app de operadores usando Expo en Windows.

.DESCRIPTION
  - Instala dependencias y ejecuta `npx expo run:android --variant release`.
  - Utiliza el archivo apps/operator-mobile/.env.production para apuntar al backend en Railway.
  - Requiere que ANDROID_HOME esté configurado y que existan las herramientas de Android.
#>

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$AppDir    = Join-Path $ScriptDir "apps/operator-mobile"
$EnvFile   = ".env.production"

function Fail($Message) {
    Write-Error $Message
    exit 1
}

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Fail "Node.js no está instalado o no está en el PATH. Descárgalo desde https://nodejs.org/."
}

if (-not (Get-Command npx -ErrorAction SilentlyContinue)) {
    Fail "npx no está disponible. Verifica tu instalación de Node.js (versión 18 o superior)."
}

if (-not (Test-Path $AppDir)) {
    Fail "No se encontró el directorio de la app de operadores en '$AppDir'."
}

$EnvPath = Join-Path $AppDir $EnvFile
if (-not (Test-Path $EnvPath)) {
    Fail "No existe '$EnvFile' en apps/operator-mobile. Crea el archivo con API_URL de producción."
}

Write-Host "📦 Preparando dependencias en $AppDir ..." -ForegroundColor Cyan
Push-Location $AppDir
try {
    npm install

    $apiUrlLine = Select-String -Path $EnvPath -Pattern "^API_URL" | Select-Object -First 1
    if ($apiUrlLine) {
        Write-Host "🔐 Usando variables de $EnvFile ($apiUrlLine)." -ForegroundColor Cyan
    }

    Write-Host "📱 Verifica que tu dispositivo/emulador Android esté disponible y ANDROID_HOME configurado." -ForegroundColor Yellow
    Write-Host "🚀 Compilando APK release..." -ForegroundColor Green

    npx expo run:android --variant release --env-file $EnvFile
}
finally {
    Pop-Location
}

Write-Host "`n✅ Build finalizado. El APK se encuentra normalmente en:"
Write-Host "   apps/operator-mobile/android/app/build/outputs/apk/release/app-release.apk"
Write-Host "   Si necesitas firmar con tu keystore, ajusta android/app/build.gradle." -ForegroundColor Yellow
