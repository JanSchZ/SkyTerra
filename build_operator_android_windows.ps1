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

if (-not $Env:ANDROID_HOME) {
    $defaultSdk = Join-Path $Env:USERPROFILE "AppData\Local\Android\Sdk"
    if (Test-Path $defaultSdk) {
        $Env:ANDROID_HOME = $defaultSdk
    }
}

if (-not (Test-Path $Env:ANDROID_HOME)) {
    Fail "No se encontró el SDK de Android. Instala Android Studio y asegúrate de que ANDROID_HOME apunte al SDK."
}

$sdkPath = (Get-Item $Env:ANDROID_HOME).FullName

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

    $env:APP_ENV = "production"
    try {
        Write-Host "🧹 Sincronizando proyecto nativo..." -ForegroundColor Cyan
        npx expo prebuild --platform android --no-install

        $localProperties = @(
            "sdk.dir=$sdkPath"
        )
        $localProperties | Out-File -FilePath "android\local.properties" -Encoding ascii

        Write-Host "🏗  Ejecutando Gradle assembleRelease..." -ForegroundColor Green
        Push-Location (Join-Path $AppDir "android")
        try {
            .\gradlew.bat clean assembleRelease
        }
        finally {
            Pop-Location
        }
    }
    finally {
        Remove-Item Env:APP_ENV -ErrorAction SilentlyContinue
    }
}
finally {
    Pop-Location
}

$apkPath = Join-Path $AppDir "android\app\build\outputs\apk\release\app-release.apk"
Write-Host ""
if (Test-Path $apkPath) {
    Write-Host "✅ Build finalizado: $apkPath"
    Write-Host ""
    Write-Host "📂 Contenido de la carpeta de salida:" -ForegroundColor Cyan
    Get-ChildItem (Split-Path $apkPath) | Format-Table Name, Length, LastWriteTime
    Write-Host ""
    Write-Host "👀 Abriendo la carpeta en el Explorador..."
    Invoke-Item (Split-Path $apkPath) 2>$null
} else {
    Write-Host "⚠️  Build finalizado pero no se encontró el APK en $apkPath. Revisa los logs." -ForegroundColor Yellow
}
