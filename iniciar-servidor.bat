@echo off
setlocal

cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js no esta instalado o no esta disponible en el PATH.
  echo Instala Node.js desde https://nodejs.org/ y vuelve a ejecutar este archivo.
  pause
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo npm no esta disponible en el PATH.
  echo Reinstala Node.js o revisa la configuracion del PATH.
  pause
  exit /b 1
)

if not exist "node_modules\" (
  echo Instalando dependencias...
  call npm install
  if errorlevel 1 (
    echo No se pudieron instalar las dependencias.
    pause
    exit /b 1
  )
)

echo.
echo Iniciando servidor local de PideYA...
echo Abre http://localhost:5174 en el navegador.
echo.

call npm run dev -- --host 0.0.0.0

pause
