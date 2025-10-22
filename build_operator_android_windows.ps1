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

        Write-Host "🎨 Actualizando launcher icons light/dark..." -ForegroundColor Cyan

        $mipmapDirs = Get-ChildItem "android\app\src\main\res" -Directory -Filter "mipmap*" -ErrorAction SilentlyContinue
        foreach ($dir in $mipmapDirs) {
            Get-ChildItem $dir.FullName -Filter "ic_launcher*.png" -ErrorAction SilentlyContinue | Remove-Item -Force
        }

        function Invoke-IconGeneration {
            param(
                [string]$VariantPrefix,
                [string]$SourceImage
            )

            foreach ($density in @("mdpi", "hdpi", "xhdpi", "xxhdpi", "xxxhdpi")) {
                switch ($density) {
                    "mdpi"   { $fg = 108; $base = 48 }
                    "hdpi"   { $fg = 162; $base = 72 }
                    "xhdpi"  { $fg = 216; $base = 96 }
                    "xxhdpi" { $fg = 324; $base = 144 }
                    default  { $fg = 432; $base = 192 }
                }

                $targetDir = Join-Path "android\app\src\main\res" "$VariantPrefix-$density"
                if (-not (Test-Path $targetDir)) {
                    New-Item -ItemType Directory -Path $targetDir | Out-Null
                }

                npx sharp-cli -i $SourceImage -o (Join-Path $targetDir "ic_launcher_foreground.webp") resize $fg $fg --fit contain --background "rgba(0,0,0,0)"
                foreach ($name in @("ic_launcher", "ic_launcher_round")) {
                    npx sharp-cli -i $SourceImage -o (Join-Path $targetDir "$name.webp") resize $base $base --fit contain --background "rgba(0,0,0,0)"
                }
            }
        }

        Invoke-IconGeneration -VariantPrefix "mipmap" -SourceImage (Join-Path $AppDir "assets\Logo_Skyterra_negro.png")
        Invoke-IconGeneration -VariantPrefix "mipmap-night" -SourceImage (Join-Path $AppDir "assets\Logo_skyterra_blanco.png")

        Write-Host "🏗  Ejecutando Gradle assembleRelease..." -ForegroundColor Green
        Push-Location (Join-Path $AppDir "android")
        try {
            .\gradlew.bat assembleRelease
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
