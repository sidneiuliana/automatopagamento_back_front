#!/bin/bash

echo "========================================"
echo "   AutoPagamento PIX - Inicializador"
echo "========================================"
echo

echo "Verificando versão do Node.js..."
node --version
if [ $? -ne 0 ]; then
    echo "ERRO: Node.js não encontrado"
    echo "Certifique-se de que o Node.js 20.9.0 está instalado"
    exit 1
fi

echo
echo "Instalando dependências..."
npm run install-all
if [ $? -ne 0 ]; then
    echo "ERRO: Falha ao instalar dependências"
    exit 1
fi

echo
echo "========================================"
echo "   Iniciando aplicação..."
echo "========================================"
echo
echo "Frontend: http://localhost:3000"
echo "Backend:  http://localhost:5000"
echo

npm run dev
