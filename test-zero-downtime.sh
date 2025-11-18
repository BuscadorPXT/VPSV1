#!/bin/bash

# 🧪 Script de Teste de Zero-Downtime Deploy
# Este script testa se o deploy realmente não causa downtime

set -e

echo "🧪 Teste de Zero-Downtime Deploy"
echo "================================="
echo ""

# Verificar se PM2 está rodando
if ! command -v pm2 &> /dev/null; then
    echo "❌ PM2 não está instalado"
    exit 1
fi

if ! pm2 list | grep -q "buscadorpxt"; then
    echo "❌ Aplicação não está rodando no PM2"
    echo "💡 Execute primeiro: pm2 start ecosystem.config.js --env production"
    exit 1
fi

echo "✅ PM2 está rodando"
echo ""

# Teste 1: Verificar cluster mode
echo "📊 Teste 1: Verificando cluster mode..."
INSTANCES=$(pm2 jlist | jq '[.[] | select(.name=="buscadorpxt")] | length')

if [ "$INSTANCES" -lt 2 ]; then
    echo "⚠️  Aviso: Apenas $INSTANCES instância(s) rodando"
    echo "💡 Recomendado: 2+ instâncias para zero-downtime"
else
    echo "✅ $INSTANCES instâncias rodando - OK!"
fi
echo ""

# Teste 2: Verificar se app está respondendo
echo "📊 Teste 2: Verificando se app responde..."
if curl -s -f http://localhost:5000/ > /dev/null 2>&1; then
    echo "✅ Aplicação está respondendo - OK!"
else
    echo "❌ Aplicação não está respondendo"
    echo "💡 Verifique: pm2 logs buscadorpxt"
    exit 1
fi
echo ""

# Teste 3: Teste de reload enquanto monitora requests
echo "📊 Teste 3: Teste de reload com monitoramento..."
echo "ℹ️  Vou fazer requests contínuos e depois um reload"
echo "ℹ️  Se tudo estiver OK, você NÃO deve ver erros HTTP"
echo ""

# Criar arquivo temporário para resultados
RESULTS_FILE=$(mktemp)
ERRORS_FILE=$(mktemp)
TOTAL_REQUESTS=0
FAILED_REQUESTS=0

# Função de monitoramento em background
monitor_requests() {
    echo "🔍 Iniciando monitoramento de requests..."
    for i in {1..60}; do
        STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/ 2>&1)
        TOTAL_REQUESTS=$((TOTAL_REQUESTS + 1))

        if [ "$STATUS" != "200" ]; then
            FAILED_REQUESTS=$((FAILED_REQUESTS + 1))
            echo "$(date +%H:%M:%S) - ❌ HTTP $STATUS" | tee -a "$ERRORS_FILE"
        else
            echo "$(date +%H:%M:%S) - ✅ HTTP $STATUS"
        fi

        sleep 1
    done
}

# Iniciar monitoramento em background
monitor_requests &
MONITOR_PID=$!

# Aguardar alguns requests
sleep 5

# Fazer reload
echo ""
echo "🔄 Executando pm2 reload..."
pm2 reload ecosystem.config.js --env production > /dev/null 2>&1

# Aguardar monitoramento terminar
wait $MONITOR_PID

echo ""
echo "📊 Resultados do Teste:"
echo "========================"
echo "Total de requests: $TOTAL_REQUESTS"
echo "Requests com erro: $FAILED_REQUESTS"

if [ "$FAILED_REQUESTS" -eq 0 ]; then
    echo "✅ SUCESSO! Zero-downtime funcionando perfeitamente!"
    echo "🎉 Nenhum request falhou durante o reload"
else
    echo "⚠️  $FAILED_REQUESTS requests falharam durante o reload"
    echo "💡 Isso pode indicar:"
    echo "   - Reload muito rápido (normal se < 2 erros)"
    echo "   - Graceful shutdown não está funcionando corretamente"
    echo "   - App demora muito para iniciar"
    echo ""
    echo "Erros encontrados:"
    cat "$ERRORS_FILE"
fi

# Limpar arquivos temporários
rm -f "$RESULTS_FILE" "$ERRORS_FILE"

echo ""
echo "📝 Próximos passos:"
echo "   - Se teve 0 erros: Tudo OK! ✅"
echo "   - Se teve 1-2 erros: Aceitável (timing do teste)"
echo "   - Se teve 3+ erros: Investigar logs com 'pm2 logs buscadorpxt'"
echo ""
echo "💡 Para monitorar um deploy real:"
echo "   Terminal 1: while true; do curl -s -o /dev/null -w \"%{http_code}\n\" http://localhost:5000/; sleep 1; done"
echo "   Terminal 2: ./deploy.sh"
