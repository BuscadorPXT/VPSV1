#!/bin/bash

# 🚀 Script de Deploy com Zero-Downtime
# Este script faz deploy sem tirar o sistema do ar

set -e  # Para se houver erro

echo "🚀 Iniciando deploy com zero-downtime..."
echo ""

# 1. Verificar se PM2 está rodando
if ! pm2 list | grep -q "buscadorpxt"; then
    echo "❌ Erro: PM2 não está rodando. Execute primeiro: pm2 start ecosystem.config.js --env production"
    exit 1
fi

# 2. Build da aplicação
echo "📦 Step 1/3: Building aplicação..."
export VITE_FIREBASE_API_KEY="AIzaSyBg_EFchQ75sbbegkJtIdlyflZxuZki2DU"
export VITE_FIREBASE_PROJECT_ID="mvp1precos"
export VITE_FIREBASE_APP_ID="1:288807210289:web:c5d7e8f9a0b1c2d3e4f5g6"
export VITE_FIREBASE_AUTH_DOMAIN="mvp1precos.firebaseapp.com"
export VITE_FIREBASE_STORAGE_BUCKET="mvp1precos.firebasestorage.app"
export VITE_FIREBASE_MESSAGING_SENDER_ID="288807210289"
export VITE_WSS_URL="wss://buscadorpxt.com.br/"

npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build falhou!"
    exit 1
fi

echo "✅ Build concluído com sucesso!"
echo ""

# 3. Reload com zero-downtime (uma instância por vez)
echo "🔄 Step 2/3: Fazendo reload das instâncias (zero-downtime)..."
pm2 reload ecosystem.config.cjs --env production --update-env

if [ $? -ne 0 ]; then
    echo "❌ Reload falhou!"
    exit 1
fi

echo "✅ Reload concluído!"
echo ""

# 4. Verificar status
echo "📊 Step 3/3: Verificando status..."
pm2 list
echo ""

# 5. Salvar configuração do PM2
pm2 save

echo "✅ Deploy concluído com sucesso!"
echo "💡 Sistema atualizado sem downtime - usuários não foram afetados"
echo ""
echo "📝 Comandos úteis:"
echo "   pm2 logs buscadorpxt       - Ver logs em tempo real"
echo "   pm2 monit                  - Monitorar recursos"
echo "   pm2 status                 - Ver status das instâncias"
