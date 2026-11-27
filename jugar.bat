@echo off
REM Lanzador del juego (Windows): compila el codigo y abre TIC-80 con los graficos.
REM Requisitos: Node.js y TIC-80. Si TIC-80 no esta en la ruta por defecto, define
REM TIC80_PATH con la ruta completa de tic80.exe (por ejemplo, con setx en una consola).
REM Los graficos (aves + fondos) viven en build\juego.tic: se cargan con `load`
REM ANTES de `import code`, porque `import code` solo trae el script.
setlocal

REM Carpeta del juego: siempre la de este archivo, sin importar desde donde se ejecute.
cd /d "%~dp0game"

if "%TIC80_PATH%"=="" set "TIC80_PATH=C:\Program Files\TIC-80\tic80.exe"
if not exist "%TIC80_PATH%" set "TIC80_PATH=tic80"

echo Compilando TypeScript...
node "..\bin\tsc80.js" build
if errorlevel 1 (
  echo.
  echo Error al compilar. Revisa el mensaje de arriba.
  pause
  exit /b 1
)

set "CMD=import code build/output.js & run"
if exist "build\juego.tic" (
  set "CMD=load build/juego.tic & import code build/output.js & run"
) else (
  echo AVISO: no existe build\juego.tic. El juego corre sin imagenes.
  echo        Ver README.md, seccion "Imagenes (sprites y fondos)".
)

echo Abriendo TIC-80...
"%TIC80_PATH%" --skip --keepcmd "--fs=%CD%" --cmd "%CMD%"
endlocal
