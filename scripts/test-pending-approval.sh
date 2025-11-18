#!/bin/bash

# 🧪 Script de Teste - Fluxo de Usuários Pendentes
# Uso: ./test-pending-approval.sh [comando]

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  🧪 Teste de Usuários Pendentes           ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════╝${NC}"
echo ""

# Função para verificar status da aplicação
check_status() {
    echo -e "${YELLOW}📊 Verificando status da aplicação...${NC}"
    echo ""

    # PM2 Status
    echo -e "${BLUE}1. Status do PM2:${NC}"
    pm2 status | grep buscadorpxt
    echo ""

    # Porta 5000
    echo -e "${BLUE}2. Verificando porta 5000:${NC}"
    if curl -s http://localhost:5000 > /dev/null; then
        echo -e "${GREEN}✅ Porta 5000 está respondendo${NC}"
    else
        echo -e "${RED}❌ Porta 5000 não responde - aplicação pode estar offline${NC}"
    fi
    echo ""

    # Última build
    echo -e "${BLUE}3. Último commit:${NC}"
    git log --oneline -1
    echo ""

    # Portas abertas
    echo -e "${BLUE}4. Portas principais abertas:${NC}"
    echo "  - 80 (nginx HTTP)"
    echo "  - 443 (nginx HTTPS)"
    echo "  - 5000 (BuscadorPXT) ✅"
    echo ""
}

# Função para mostrar logs
show_logs() {
    echo -e "${YELLOW}📋 Últimos logs da aplicação:${NC}"
    echo ""
    pm2 logs buscadorpxt --lines 30 --nostream
}

# Função para filtrar logs de aprovação
show_approval_logs() {
    echo -e "${YELLOW}🔍 Logs de aprovação:${NC}"
    echo ""
    pm2 logs buscadorpxt --lines 100 --nostream | grep -i -E "approv|pending|PENDING_APPROVAL" | tail -20
}

# Função para verificar usuários pendentes no banco
check_pending_users() {
    echo -e "${YELLOW}👥 Verificando usuários pendentes no banco de dados...${NC}"
    echo ""

    # Verificar se PGPASSWORD está definido
    if [ -z "$DATABASE_URL" ]; then
        echo -e "${RED}❌ DATABASE_URL não está definido${NC}"
        echo "Configure a variável de ambiente DATABASE_URL"
        return 1
    fi

    # Extrair informações da DATABASE_URL
    # Formato: postgresql://user:password@host:port/database
    DB_USER=$(echo $DATABASE_URL | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
    DB_PASS=$(echo $DATABASE_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
    DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
    DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
    DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')

    export PGPASSWORD=$DB_PASS

    psql -U $DB_USER -h $DB_HOST -p $DB_PORT -d $DB_NAME -c "
        SELECT
            id,
            email,
            name,
            \"isApproved\",
            status,
            role,
            \"subscriptionPlan\",
            \"createdAt\"
        FROM users
        WHERE \"isApproved\" = false
        ORDER BY \"createdAt\" DESC
        LIMIT 10;
    "
}

# Função para reiniciar aplicação
restart_app() {
    echo -e "${YELLOW}🔄 Reiniciando aplicação...${NC}"
    echo ""
    pm2 restart buscadorpxt
    echo ""
    echo -e "${GREEN}✅ Aplicação reiniciada${NC}"
    echo ""
    echo "Aguarde 5 segundos para estabilizar..."
    sleep 5
    check_status
}

# Função para rebuild do frontend
rebuild_frontend() {
    echo -e "${YELLOW}🏗️  Reconstruindo frontend...${NC}"
    echo ""

    # Exportar variáveis Firebase
    if [ -f .env ]; then
        export $(cat .env | grep ^VITE_ | xargs)
        echo -e "${GREEN}✅ Variáveis VITE_ carregadas${NC}"
    else
        echo -e "${RED}❌ Arquivo .env não encontrado${NC}"
        return 1
    fi

    # Build
    npm run build

    echo ""
    echo -e "${GREEN}✅ Frontend reconstruído${NC}"
    echo ""
    restart_app
}

# Função para mostrar URLs de acesso
show_urls() {
    echo -e "${BLUE}🌐 URLs de Acesso:${NC}"
    echo ""
    echo "  📱 Localhost:"
    echo "     http://localhost:5000"
    echo "     http://localhost:5000/login"
    echo "     http://localhost:5000/pending-approval"
    echo "     http://localhost:5000/admin"
    echo ""

    # Tentar pegar IP do servidor
    SERVER_IP=$(hostname -I | awk '{print $1}')
    if [ ! -z "$SERVER_IP" ]; then
        echo "  🌍 IP Externo (se acessível):"
        echo "     http://$SERVER_IP:5000"
        echo ""
    fi

    echo "  💡 Dica: Use port forwarding do Claude Code/VS Code"
    echo "     para acessar do seu navegador local"
    echo ""
}

# Função para mostrar guia rápido
show_guide() {
    echo -e "${BLUE}📖 Guia Rápido de Teste:${NC}"
    echo ""
    echo "1️⃣  Criar conta nova:"
    echo "   - Acessar http://localhost:5000/login"
    echo "   - Clicar em 'Cadastre-se'"
    echo "   - Preencher dados (use email fictício)"
    echo "   - Verificar redirecionamento para /pending-approval"
    echo ""
    echo "2️⃣  Fazer login com conta pendente:"
    echo "   - Usar email/senha da conta criada"
    echo "   - Verificar toast 'Aguardando Aprovação'"
    echo "   - Confirmar redirecionamento para /pending-approval"
    echo "   - ⚠️  NÃO deve ficar em loop!"
    echo ""
    echo "3️⃣  Admin aprovar usuário:"
    echo "   - Login com conta admin em /admin"
    echo "   - Ir para 'Pending Approval'"
    echo "   - Aprovar usuário"
    echo ""
    echo "4️⃣  Verificar redirecionamento automático:"
    echo "   - Manter aba /pending-approval aberta"
    echo "   - Admin aprova em outra aba"
    echo "   - Verificar redirecionamento automático"
    echo ""
    echo "📄 Para guia completo, ver: GUIA_TESTE_USUARIOS_PENDENTES.md"
    echo ""
}

# Menu principal
case "$1" in
    status)
        check_status
        ;;
    logs)
        show_logs
        ;;
    approval-logs)
        show_approval_logs
        ;;
    pending)
        check_pending_users
        ;;
    restart)
        restart_app
        ;;
    rebuild)
        rebuild_frontend
        ;;
    urls)
        show_urls
        ;;
    guide)
        show_guide
        ;;
    *)
        echo "Comandos disponíveis:"
        echo ""
        echo "  ${GREEN}./test-pending-approval.sh status${NC}          - Verificar status da aplicação"
        echo "  ${GREEN}./test-pending-approval.sh logs${NC}            - Mostrar logs recentes"
        echo "  ${GREEN}./test-pending-approval.sh approval-logs${NC}   - Filtrar logs de aprovação"
        echo "  ${GREEN}./test-pending-approval.sh pending${NC}         - Listar usuários pendentes no DB"
        echo "  ${GREEN}./test-pending-approval.sh restart${NC}         - Reiniciar aplicação"
        echo "  ${GREEN}./test-pending-approval.sh rebuild${NC}         - Rebuild frontend + restart"
        echo "  ${GREEN}./test-pending-approval.sh urls${NC}            - Mostrar URLs de acesso"
        echo "  ${GREEN}./test-pending-approval.sh guide${NC}           - Guia rápido de teste"
        echo ""
        echo "Exemplos:"
        echo "  ${YELLOW}./test-pending-approval.sh status${NC}"
        echo "  ${YELLOW}./test-pending-approval.sh guide${NC}"
        echo ""
        ;;
esac
