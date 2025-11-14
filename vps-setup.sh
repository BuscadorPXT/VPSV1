#!/bin/bash

# ========================================
# BUSCADOR PXT - VPS SETUP SCRIPT
# Hostinger VPS Automated Setup
# ========================================
#
# Este script automatiza a configuração inicial da VPS
# Ubuntu 22.04 ou 24.04
#
# USO:
# 1. Fazer upload deste arquivo para a VPS
# 2. chmod +x vps-setup.sh
# 3. ./vps-setup.sh
#
# ========================================

set -e  # Exit on error

echo "========================================="
echo "🚀 BUSCADOR PXT - VPS SETUP"
echo "========================================="
echo ""

# Verificar se está rodando como root ou com sudo
if [[ $EUID -ne 0 ]]; then
   echo "❌ Este script precisa ser executado com sudo"
   echo "Execute: sudo ./vps-setup.sh"
   exit 1
fi

echo "✅ Rodando com privilégios de administrador"
echo ""

# ========================================
# 1. ATUALIZAR SISTEMA
# ========================================
echo "📦 [1/9] Atualizando sistema..."
apt update
apt upgrade -y
echo "✅ Sistema atualizado"
echo ""

# ========================================
# 2. INSTALAR DEPENDÊNCIAS BÁSICAS
# ========================================
echo "📦 [2/9] Instalando dependências básicas..."
apt install -y curl git build-essential ufw fail2ban
echo "✅ Dependências instaladas"
echo ""

# ========================================
# 3. INSTALAR NODE.JS 20.x
# ========================================
echo "📦 [3/9] Instalando Node.js 20.x..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Verificar versão
NODE_VERSION=$(node --version)
NPM_VERSION=$(npm --version)
echo "✅ Node.js instalado: $NODE_VERSION"
echo "✅ npm instalado: $NPM_VERSION"
echo ""

# ========================================
# 4. INSTALAR PM2
# ========================================
echo "📦 [4/9] Instalando PM2..."
npm install -g pm2

# Configurar PM2 para iniciar no boot
pm2 startup systemd -u buscadorpxt --hp /home/buscadorpxt

echo "✅ PM2 instalado e configurado"
echo ""

# ========================================
# 5. INSTALAR NGINX
# ========================================
echo "📦 [5/9] Instalando Nginx..."
apt install -y nginx

# Habilitar Nginx no boot
systemctl enable nginx
systemctl start nginx

echo "✅ Nginx instalado e rodando"
echo ""

# ========================================
# 6. CONFIGURAR FIREWALL (UFW)
# ========================================
echo "🔒 [6/9] Configurando firewall..."

# Resetar regras
ufw --force reset

# Permitir SSH, HTTP, HTTPS
ufw allow 22/tcp   # SSH
ufw allow 80/tcp   # HTTP
ufw allow 443/tcp  # HTTPS

# Habilitar firewall
ufw --force enable

echo "✅ Firewall configurado:"
ufw status
echo ""

# ========================================
# 7. CONFIGURAR FAIL2BAN
# ========================================
echo "🔒 [7/9] Configurando Fail2ban..."

# Criar configuração
cat > /etc/fail2ban/jail.local <<EOF
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true

[nginx-http-auth]
enabled = true
EOF

# Habilitar e iniciar Fail2ban
systemctl enable fail2ban
systemctl restart fail2ban

echo "✅ Fail2ban configurado e rodando"
echo ""

# ========================================
# 8. INSTALAR CERTBOT (Let's Encrypt)
# ========================================
echo "🔒 [8/9] Instalando Certbot..."
apt install -y certbot python3-certbot-nginx

echo "✅ Certbot instalado"
echo ""

# ========================================
# 9. CRIAR USUÁRIO BUSCADORPXT
# ========================================
echo "👤 [9/9] Criando usuário 'buscadorpxt'..."

# Criar usuário se não existir
if id "buscadorpxt" &>/dev/null; then
    echo "⚠️  Usuário 'buscadorpxt' já existe"
else
    adduser --disabled-password --gecos "" buscadorpxt
    usermod -aG sudo buscadorpxt
    echo "✅ Usuário 'buscadorpxt' criado"
fi

# Criar diretórios
mkdir -p /home/buscadorpxt/buscadorpxt
mkdir -p /home/buscadorpxt/logs
chown -R buscadorpxt:buscadorpxt /home/buscadorpxt

echo "✅ Diretórios criados"
echo ""

# ========================================
# RESUMO
# ========================================
echo "========================================="
echo "✅ SETUP CONCLUÍDO COM SUCESSO!"
echo "========================================="
echo ""
echo "Softwares instalados:"
echo "  ✅ Node.js: $NODE_VERSION"
echo "  ✅ npm: $NPM_VERSION"
echo "  ✅ PM2: $(pm2 --version)"
echo "  ✅ Nginx: $(nginx -v 2>&1 | cut -d'/' -f2)"
echo "  ✅ Certbot: $(certbot --version | cut -d' ' -f2)"
echo "  ✅ UFW (Firewall): Ativo"
echo "  ✅ Fail2ban: Rodando"
echo ""
echo "Usuário criado:"
echo "  👤 buscadorpxt (com acesso sudo)"
echo ""
echo "Próximos passos:"
echo "  1. Trocar para usuário buscadorpxt: su - buscadorpxt"
echo "  2. Clonar repositório do projeto"
echo "  3. Copiar arquivo .env.production para .env"
echo "  4. Executar: npm install"
echo "  5. Executar: npm run build"
echo "  6. Configurar Nginx (ver plano de migração)"
echo "  7. Obter SSL: sudo certbot --nginx -d seu-dominio.com"
echo "  8. Iniciar com PM2: pm2 start ecosystem.config.js"
echo ""
echo "📖 Consulte PLANO_MIGRACAO_HOSTINGER.md para detalhes"
echo "========================================="
