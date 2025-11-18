# Scripts Utilitários

Esta pasta contém todos os scripts auxiliares do projeto.

## 🔧 Scripts de Build e Deploy

### `build-production.sh`
Build da aplicação com variáveis de ambiente Firebase exportadas.
```bash
./scripts/build-production.sh
```

### `deploy.sh`
Script de deploy completo.
```bash
./scripts/deploy.sh
```

### `deploy-performance-optimizations.sh`
Deploy com otimizações de performance.
```bash
./scripts/deploy-performance-optimizations.sh
```

---

## ⚙️ Scripts de Setup/Configuração

### `setup-nginx.sh`
Configura nginx para o projeto.
```bash
sudo ./scripts/setup-nginx.sh
```

### `setup-ssl.sh`
Configura certificado SSL com certbot.
```bash
sudo ./scripts/setup-ssl.sh
```

### `setup-firewall.sh`
Configura firewall UFW.
```bash
sudo ./scripts/setup-firewall.sh
```

### `vps-setup.sh`
Setup completo do VPS.
```bash
sudo ./scripts/vps-setup.sh
```

### `webhook-setup.js`
Configura webhooks do Google Sheets.
```bash
node scripts/webhook-setup.js
```

---

## 👥 Scripts de Usuários

### `approve-user.js`
Aprova um usuário manualmente.
```bash
node scripts/approve-user.js <email>
```

### `check-user-status.js`
Verifica status de um usuário.
```bash
node scripts/check-user-status.js <email>
```

### `clear-user-cache.js`
Limpa cache de usuário.
```bash
node scripts/clear-user-cache.js <email>
```

### `check-online-users.js`
Lista usuários online no sistema.
```bash
node scripts/check-online-users.js
```

---

## 🗄️ Scripts de Banco de Dados

### `execute-indexes.js`
Cria índices de performance no banco de dados.
```bash
node scripts/execute-indexes.js
```

---

## 🧪 Scripts de Teste

### `test-pending-approval.sh`
Testa fluxo de aprovação de usuários.
```bash
./scripts/test-pending-approval.sh
```

### `test-zero-downtime.sh`
Testa deploy com zero downtime.
```bash
./scripts/test-zero-downtime.sh
```

### `test-sheets.js`
Testa integração com Google Sheets.
```bash
node scripts/test-sheets.js
```

---

## 🔍 Scripts de Diagnóstico

### `run-check.sh`
Executa check de usuários online.
```bash
./scripts/run-check.sh
```

---

## 📋 Como Usar

### Executar Scripts Shell (.sh)
```bash
# Dar permissão de execução
chmod +x scripts/nome-do-script.sh

# Executar
./scripts/nome-do-script.sh
```

### Executar Scripts Node.js (.js)
```bash
# Executar direto com node
node scripts/nome-do-script.js [argumentos]

# Ou com npm (se configurado)
npm run script-name
```

### Com Sudo (Quando Necessário)
```bash
# Scripts de setup geralmente precisam de sudo
sudo ./scripts/setup-nginx.sh
sudo ./scripts/setup-ssl.sh
sudo ./scripts/setup-firewall.sh
```

---

## ⚠️ Avisos Importantes

- **Backup**: Sempre faça backup antes de executar scripts de banco/deploy
- **Ambiente**: Verifique variáveis `.env` antes de rodar scripts
- **Permissões**: Scripts de setup precisam de `sudo`
- **Logs**: Verifique logs com `pm2 logs buscadorpxt` após deploy

---

## 🆘 Troubleshooting

### Script não executa
```bash
# Dar permissão
chmod +x scripts/nome.sh
```

### Erro de variável de ambiente
```bash
# Verificar .env
cat .env | grep NOME_VARIAVEL

# Exportar manualmente
export NOME_VARIAVEL="valor"
```

### Script Node.js falha
```bash
# Verificar dependências
npm install

# Executar com mais detalhes
NODE_ENV=development node scripts/nome.js
```

---

**Última Atualização**: 18/11/2025
