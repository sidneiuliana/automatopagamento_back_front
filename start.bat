@echo off
echo ========================================
echo    AutoPagamento PIX - Inicializador
echo ========================================
echo.

echo Verificando versao do Node.js...
node --version
if %errorlevel% neq 0 (
    echo ERRO: Node.js nao encontrado
    echo Certifique-se de que o Node.js 20.9.0 esta instalado
    pause
    exit /b 1
)

echo.
echo Instalando dependencias...
call npm run install-all
if %errorlevel% neq 0 (
    echo ERRO: Falha ao instalar dependencias
    pause
    exit /b 1
)

echo.
echo ========================================
echo    Iniciando aplicacao...
echo ========================================
echo.
echo Frontend: http://localhost:3000
echo Backend:  http://localhost:5000
echo.

call npm run dev
