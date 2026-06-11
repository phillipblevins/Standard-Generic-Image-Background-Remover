@echo off
:: =========================================================================
::  Background Remover - Automated Android APK Builder (Windows Command Line)
:: =========================================================================
:: This script automates compiling the production web assets and bundling 
:: them into a fully-functional, standalone Android APK (.apk) locally 
:: without requiring the Android Studio graphical interface.
:: =========================================================================

setlocal EnableDelayedExpansion
title Android APK Builder

echo =========================================================================
echo  [+][+] STARTING ANDROID NATIVE APK BUILD PROCESS [+][+]
echo =========================================================================
echo.

:: -------------------------------------------------------------------------
:: STEP 1: Verify Windows System Requirements
:: -------------------------------------------------------------------------
echo [1/6] Verifying local development environment...

where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH!
    echo Please download and install Node.js from https://nodejs.org/
    pause
    exit /b 1
)
echo  - Node.js detected: OK

:: Check for Java JDK 17+ (needed for Gradle builds)
where java >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [WARNING] Java Development Kit (JDK) is not found in your system path!
    echo If the build fails, make sure you install JDK 17 (or newer)
    echo and set your JAVA_HOME environment variable.
) else (
    echo  - Java JDK detected: OK
)

:: Check for Android SDK
if "%ANDROID_HOME%"=="" (
    if "%ANDROID_SDK_ROOT%"=="" (
        :: Try fallback to standard user path of Android Studio SDK installations
        set "FALLBACK_SDK=%LOCALAPPDATA%\Android\Sdk"
        if exist "!FALLBACK_SDK!" (
            set "ANDROID_HOME=!FALLBACK_SDK!"
            echo  - Android SDK auto-detected at: !FALLBACK_SDK!
        ) else (
            echo [WARNING] ANDROID_HOME environment variable is not defined!
            echo If compilation fails, make sure Android Studio SDK is installed.
        )
    ) else (
        set "ANDROID_HOME=%ANDROID_SDK_ROOT%"
    )
)
if not "%ANDROID_HOME%"=="" (
    echo  - Android Home is set to: %ANDROID_HOME%
)
echo.

:: -------------------------------------------------------------------------
:: STEP 2: Ensure Capacitor Packages and Web Dependencies are Installed
:: -------------------------------------------------------------------------
echo [2/6] Restoring packages and verifying Capacitor configuration...
if not exist "node_modules\" (
    echo  - Installing project dependencies (npm install)...
    call npm install
)

:: Verify package.json contains capacitor dependencies
findstr /i "capacitor" package.json >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo  - Adding @capacitor/core and @capacitor/cli...
    call npm install @capacitor/core @capacitor/cli --save-dev
)
echo  - Web packages: OK
echo.

:: -------------------------------------------------------------------------
:: STEP 3: Initialize Capacitor & Setup Android Native Wrapper if missing
:: -------------------------------------------------------------------------
echo [3/6] Configuring Android Native Container...

if not exist "capacitor.config.json" (
    echo  - Generating capacitor.config.json...
    call npx cap init "Background Remover" "com.example.bgremover" --web-dir=dist
)

if not exist "android\" (
    echo  - Adding Native Android studio Wrapper (npx cap add android)...
    call npm install @capacitor/android
    call npx cap add android
) else (
    echo  - Android wrapper container found: OK
)
echo.

:: -------------------------------------------------------------------------
:: STEP 4: Build Web Production Assets
:: -------------------------------------------------------------------------
echo [4/6] Compiling production-ready React / Web assets (npm run build)...
call npm run build
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Web application build failed! Please check code or syntax.
    pause
    exit /b 1
)
echo  - Web bundle: OK
echo.

:: -------------------------------------------------------------------------
:: STEP 5: Synchronize Assets to the Android Container
:: -------------------------------------------------------------------------
echo [5/6] Syncing static files to Android Gradle package...
call npx cap sync
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Capacitor sync failed!
    pause
    exit /b 1
)
echo  - Device asset sync: OK
echo.

:: -------------------------------------------------------------------------
:: STEP 6: Compile the APK directly via Gradle Wrapper (No Android Studio UI)
:: -------------------------------------------------------------------------
echo [6/6] Bundling Native Android APK via Gradle...
if not exist "android\gradlew.bat" (
    echo [ERROR] Android Gradle wrapper (gradlew.bat) wasn't found inside \android!
    echo Ensure Gradle initialized correctly.
    pause
    exit /b 1
)

:: Move into the android sub-workspace and invoke the Gradle wrapper assembler
cd android
echo Assembly instruction: gradlew assembleDebug...
call gradlew.bat assembleDebug
set "GRADLE_STATUS=%ERRORLEVEL%"
cd ..

if %GRADLE_STATUS% neq 0 (
    echo.
    echo =========================================================================
    echo [COMPILE ERROR] Gradle failed to compile the APK module.
    echo Common reasons:
    echo  1. Android SDK or Build-Tools are missing.
    echo  2. Java JDK 17 is missing or incompatible.
    echo  3. Internet connection interrupted while downloading gradle dependencies.
    echo =========================================================================
    pause
    exit /b 1
)

:: -------------------------------------------------------------------------
:: SCRIPT SUCCESS: Move output files and display completion info
:: -------------------------------------------------------------------------
set "APK_OUTPUT=android\app\build\outputs\apk\debug\app-debug.apk"
set "FINAL_DEST=background-remover-debug.apk"

if exist "%APK_OUTPUT%" (
    copy /y "%APK_OUTPUT%" "%FINAL_DEST%" >nul
    echo.
    echo =========================================================================
    echo  [+][+] SUCCESS! APK BUILD COMPLETED PERFECTLY! [+][+]
    echo =========================================================================
    echo.
    echo  A standalone build has been generated successfully.
    echo.
    echo  👉 Native APK File Name:  %FINAL_DEST%
    echo  👉 Location:                %CD%\%FINAL_DEST%
    echo.
    echo  How to run it on your physical phone:
    echo  1. Send "%FINAL_DEST%" to your Android phone (via USB, email, Google Drive).
    echo  2. Open the file on your device and tap "Install" (Authorize "Unknown Sources" if prompted).
    echo  3. Launch and enjoy! No fake phone wrapper - it runs as a pure native app!
    echo =========================================================================
    
    :: Highlight in File Explorer for convenience
    explorer.exe /select,"%FINAL_DEST%"
) else (
    echo [ERROR] Build claimed success, but destination APK wasn't found at:
    echo %APK_OUTPUT%
)

pause
exit /b 0
