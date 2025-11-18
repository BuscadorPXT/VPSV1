#!/bin/bash
# Script para configurar Nginx como reverse proxy para buscadorpxt.com.br
# IP da VPS: 31.97.171.93

set -e

echo "================================================"
echo "  Configurando Nginx para buscadorpxt.com.br"
echo "================================================"

# Verificar se está rodando como root
if [ "$EUID" -ne 0 ]; then
    echo "⚠️  Execute este script com sudo"
    exit 1
fi

# 1. Atualizar sistema e instalar Nginx
echo "📦 Instalando Nginx..."
apt update
apt install nginx -y

# 2. Criar configuração do site
echo "⚙️  Criando configuração Nginx..."

cat > /etc/nginx/sites-available/buscadorpxt <<'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name buscadorpxt.com.br www.buscadorpxt.com.br;

    # Logs
    access_log /var/log/nginx/buscadorpxt_access.log;
    error_log /var/log/nginx/buscadorpxt_error.log;

    # Client max body size (para uploads)
    client_max_body_size 50M;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;

        # Headers para proxy
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;

        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket support específico (se sua app usar /ws)
    location /ws {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
EOF

# 3. Remover configuração default se existir link
if [ -L /etc/nginx/sites-enabled/default ]; then
    echo "🗑️  Removendo configuração default..."
    rm /etc/nginx/sites-enabled/default
fi

# 4. Criar link simbólico
echo "🔗 Ativando site..."
ln -sf /etc/nginx/sites-available/buscadorpxt /etc/nginx/sites-enabled/

# 5. Testar configuração
echo "✅ Testando configuração Nginx..."
nginx -t

# 6. Reiniciar Nginx
echo "🔄 Reiniciando Nginx..."
systemctl restart nginx
systemctl enable nginx

# 7. Status
echo ""
echo "================================================"
echo "  ✅ Nginx configurado com sucesso!"
echo "================================================"
echo ""
echo "Status do Nginx:"
systemctl status nginx --no-pager | head -10
echo ""
echo "📌 Próximo passo: Configurar SSL com Let's Encrypt"
echo "   Execute: sudo bash setup-ssl.sh"
echo ""
