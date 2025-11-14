# ✅ CHECKLIST DE MIGRAÇÃO - BUSCADOR PXT
## Do Replit para Hostinger VPS

**Use este checklist para acompanhar o progresso da migração**

---

## 📋 PREPARAÇÃO (Antes de Começar)

- [ ] VPS Hostinger comprada (VPS 2 ou 3)
- [ ] Acesso SSH funcionando
- [ ] Domínio buscadorpxt.com.br acessível
- [ ] Acesso ao painel DNS
- [ ] Backup do código criado
- [ ] Arquivo secrets.md acessível
- [ ] Tempo disponível: 6-9 horas

---

## 🖥️ SETUP VPS (1-2 horas)

- [ ] Conectado via SSH à VPS
- [ ] Upload do script `vps-setup.sh`
- [ ] Executado: `sudo ./vps-setup.sh`
- [ ] Node.js 20.x instalado (verificar: `node --version`)
- [ ] PM2 instalado (verificar: `pm2 --version`)
- [ ] Nginx instalado (verificar: `nginx -v`)
- [ ] Certbot instalado (verificar: `certbot --version`)
- [ ] Firewall UFW ativo (verificar: `sudo ufw status`)
- [ ] Fail2ban rodando
- [ ] Usuário `buscadorpxt` criado

---

## 📦 DEPLOY DO PROJETO (2-3 horas)

- [ ] Trocado para usuário `buscadorpxt`: `su - buscadorpxt`
- [ ] Projeto clonado: `git clone ...`
- [ ] Arquivo `.env` criado (copiado de `.env.production`)
- [ ] Variável `VITE_WSS_URL` atualizada para `wss://buscadorpxt.com.br/`
- [ ] Variável `CORS_ORIGIN` atualizada
- [ ] Executado: `npm install` ✅
- [ ] Executado: `npm run build` ✅
- [ ] Arquivos em `/dist/` criados
- [ ] Diretório `/logs/` criado
- [ ] Testado manualmente: `NODE_ENV=production node dist/index.js`
- [ ] PM2 iniciado: `pm2 start ecosystem.config.js`
- [ ] PM2 status: **online** ✅
- [ ] PM2 salvo: `pm2 save`

---

## 🧪 TESTES VIA IP (30 min)

- [ ] Acesso via `http://IP-DA-VPS:5000` funciona
- [ ] Página inicial carrega
- [ ] Login funciona
- [ ] Dashboard carrega
- [ ] Produtos aparecem
- [ ] WebSocket conecta (verificar Network → WS)
- [ ] Sem erros no console (F12)
- [ ] Performance boa (< 3s)

---

## 🌐 CONFIGURAÇÃO NGINX + SSL (1 hora)

- [ ] Config Nginx copiada: `/etc/nginx/sites-available/buscadorpxt.com.br`
- [ ] Symlink criado: `/etc/nginx/sites-enabled/`
- [ ] Nginx testado: `sudo nginx -t` → **syntax ok** ✅
- [ ] Nginx recarregado: `sudo systemctl reload nginx`
- [ ] Acesso via `http://IP-DA-VPS` funciona (sem porta)
- [ ] Certbot executado: `sudo certbot --nginx -d buscadorpxt.com.br -d www.buscadorpxt.com.br`
- [ ] Certificado SSL obtido ✅
- [ ] HTTPS funcionando: `https://IP-DA-VPS` (ou subdomínio teste)

---

## 🚀 MIGRAÇÃO (GO-LIVE) (30 min)

### ⏰ Horário Escolhido: ________________

- [ ] Horário de baixa demanda escolhido (madrugada/domingo)
- [ ] Usuários comunicados (opcional)
- [ ] DNS atualizado (registro A → IP da VPS)
- [ ] TTL configurado: 300 (5 minutos)
- [ ] Aguardado propagação (5-30 min)
- [ ] Verificado DNS: `dig buscadorpxt.com.br +short` → **IP correto** ✅
- [ ] Testado: `https://buscadorpxt.com.br` → **funciona** ✅
- [ ] Login funciona no domínio
- [ ] Produtos carregam
- [ ] WebSocket conecta

---

## 🔗 ATUALIZAÇÃO DE WEBHOOKS (30 min)

### Google Sheets
- [ ] Apps Script aberto
- [ ] `WEBHOOK_URL` atualizada para `https://buscadorpxt.com.br/api/webhook/google-sheets`
- [ ] Salvo e testado (editar célula)
- [ ] Logs PM2 mostram webhook recebido

### Stripe
- [ ] Dashboard Stripe → Webhooks
- [ ] Endpoint atualizado para `https://buscadorpxt.com.br/api/webhooks/stripe`
- [ ] Testado (pagamento teste)

### ASAAS
- [ ] Painel ASAAS → Webhooks
- [ ] URL atualizada para `https://buscadorpxt.com.br/api/webhooks/asaas`
- [ ] Salvo

---

## 📊 MONITORAMENTO (Primeiras 2 horas)

- [ ] Logs PM2 sem erros: `pm2 logs buscadorpxt`
- [ ] CPU < 80%: `pm2 monit`
- [ ] RAM < 80%: `pm2 monit`
- [ ] Usuários conseguindo acessar
- [ ] WebSocket estável
- [ ] Webhooks funcionando
- [ ] Performance boa

---

## ✅ PÓS-MIGRAÇÃO (Dias seguintes)

### 24 Horas Após Migração
- [ ] Todos os testes funcionais passaram
- [ ] Logs limpos (sem erros críticos)
- [ ] Performance estável
- [ ] TTL DNS aumentado para 3600 (1 hora)

### 7 Dias Após Migração
- [ ] Sistema 100% estável
- [ ] Backup automático configurado (cron)
- [ ] Monitoramento configurado (PM2 Plus/UptimeRobot)
- [ ] TTL DNS aumentado para 86400 (24 horas)
- [ ] Replit desligado 🎉
- [ ] **Economia: $681/ano ativada!** 💰

---

## 🔙 PLANO DE ROLLBACK (Se necessário)

Se algo der MUITO errado:

- [ ] DNS revertido para IP antigo (Replit)
- [ ] TTL reduzido para 60 segundos
- [ ] Aguardado propagação (5-15 min)
- [ ] Replit reativado
- [ ] Domínio funcionando no Replit
- [ ] Problema analisado
- [ ] Correção feita na VPS
- [ ] Nova tentativa de migração agendada

---

## 📞 CONTATOS DE EMERGÊNCIA

```
Hostinger Suporte: https://www.hostinger.com.br/contato
Neon Status: https://status.neon.tech
Firebase Console: https://console.firebase.google.com
Stripe Dashboard: https://dashboard.stripe.com
```

---

## 🎯 STATUS GERAL

**Data de Início:** _______________
**Data de Conclusão:** _______________

**Migração:** [ ] Em Progresso | [ ] Concluída | [ ] Rollback Necessário

**Notas:**
_____________________________________________________________
_____________________________________________________________
_____________________________________________________________

---

## 💡 DICAS RÁPIDAS

1. **Use screen/tmux** para manter sessão SSH ativa:
   ```bash
   screen -S migracao
   # Para sair sem fechar: Ctrl+A, D
   # Para voltar: screen -r migracao
   ```

2. **Monitore logs em tempo real:**
   ```bash
   pm2 logs buscadorpxt --lines 100 --raw
   ```

3. **Veja recursos do sistema:**
   ```bash
   htop  # ou: pm2 monit
   ```

4. **Backup rápido antes de mudanças:**
   ```bash
   cp .env .env.backup-$(date +%Y%m%d-%H%M%S)
   ```

5. **Teste sempre antes de aplicar:**
   ```bash
   sudo nginx -t  # Antes de reload
   pm2 start --dry-run  # Antes de start
   ```

---

**Boa sorte! Você consegue! 🚀**

*Imprima este checklist e marque cada item conforme avança*
