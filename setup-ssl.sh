#!/bin/bash
# Script para configurar SSL/HTTPS com Let's Encrypt
# Domínio: buscadorpxt.com.br

set -e

echo "================================================"
echo "  Configurando SSL para buscadorpxt.com.br"
echo "================================================"

# Verificar se está rodando como root
if [ "$EUID" -ne 0 ]; then
    echo "⚠️  Execute este script com sudo"
    exit 1
fi

# 1. Verificar se DNS está propagado
echo "🔍 Verificando DNS..."
DNS_IP=$(dig +short buscadorpxt.com.br A | head -1)

if [ -z "$DNS_IP" ]; then
    echo "❌ DNS ainda não propagado para buscadorpxt.com.br"
    echo "   Aguarde a propagação e tente novamente"
    echo "   Verifique em: https://dnschecker.org"
    exit 1
fi

if [ "$DNS_IP" != "31.97.171.93" ]; then
    echo "⚠️  DNS aponta para: $DNS_IP"
    echo "   Esperado: 31.97.171.93"
    echo "   Continuar mesmo assim? (s/n)"
    read -r resposta
    if [ "$resposta" != "s" ]; then
        exit 1
    fi
fi

echo "✅ DNS configurado: $DNS_IP"

# 2. Instalar Certbot
echo "📦 Instalando Certbot..."
apt update
apt install certbot python3-certbot-nginx -y

# 3. Obter certificado SSL
echo "🔒 Obtendo certificado SSL..."
echo ""
echo "⚠️  ATENÇÃO: Você precisará fornecer um email válido"
echo ""

certbot --nginx \
    -d buscadorpxt.com.br \
    -d www.buscadorpxt.com.br \
    --non-interactive \
    --agree-tos \
    --redirect \
    --email admin@buscadorpxt.com.br || {
        echo ""
        echo "❌ Erro ao obter certificado SSL"
        echo "   Tente manualmente: sudo certbot --nginx -d buscadorpxt.com.br -d www.buscadorpxt.com.br"
        exit 1
    }

# 4. Verificar renovação automática
echo "⚙️  Verificando renovação automática..."
systemctl status certbot.timer --no-pager | head -5

# 5. Testar renovação
echo "🧪 Testando renovação (dry-run)..."
certbot renew --dry-run

echo ""
echo "================================================"
echo "  ✅ SSL configurado com sucesso!"
echo "================================================"
echo ""
echo "🔒 Certificado instalado para:"
echo "   - https://buscadorpxt.com.br"
echo "   - https://www.buscadorpxt.com.br"
echo ""
echo "🔄 Renovação automática configurada"
echo ""
echo "📌 Próximo passo: Configurar firewall"
echo "   Execute: sudo bash setup-firewall.sh"
echo ""
