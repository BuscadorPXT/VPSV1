#!/bin/bash
# Script para configurar firewall UFW

set -e

echo "================================================"
echo "  Configurando Firewall (UFW)"
echo "================================================"

# Verificar se está rodando como root
if [ "$EUID" -ne 0 ]; then
    echo "⚠️  Execute este script com sudo"
    exit 1
fi

# 1. Instalar UFW se não estiver instalado
if ! command -v ufw &> /dev/null; then
    echo "📦 Instalando UFW..."
    apt update
    apt install ufw -y
fi

# 2. Resetar regras (cuidado!)
echo "⚠️  Resetando regras do firewall..."
ufw --force reset

# 3. Configurar regras
echo "⚙️  Configurando regras..."

# Permitir SSH (IMPORTANTE: não bloquear antes de permitir!)
ufw allow OpenSSH
ufw allow 22/tcp

# Permitir HTTP e HTTPS
ufw allow 'Nginx Full'
ufw allow 80/tcp
ufw allow 443/tcp

# 4. Ativar firewall
echo "🔥 Ativando firewall..."
ufw --force enable

# 5. Mostrar status
echo ""
echo "================================================"
echo "  ✅ Firewall configurado com sucesso!"
echo "================================================"
echo ""
echo "Status do firewall:"
ufw status verbose
echo ""
echo "📌 Portas abertas:"
echo "   - 22 (SSH)"
echo "   - 80 (HTTP)"
echo "   - 443 (HTTPS)"
echo ""
