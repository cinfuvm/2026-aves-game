@echo off
REM Lanzador visual del juego (TIC-80). Hace build y abre la ventana.
REM Los graficos (aves + fondos + paleta) viven en build\juego.tic: se carga con
REM `load` ANTES de `import code`, porque `import code` solo trae el script.
cd /d "C:\Users\mauri\Desktop\proyecto web\2026-aves-game\game"
echo Compilando TypeScript...
node "..\bin\tsc80.js" build
echo Abriendo TIC-80...
"C:\Users\mauri\Desktop\proyecto web\2026-aves-game\tools\tic80\tic80.exe" --skip --keepcmd --fs="C:\Users\mauri\Desktop\proyecto web\2026-aves-game\game" --cmd "load build/juego.tic & import code build/output.js & run"

