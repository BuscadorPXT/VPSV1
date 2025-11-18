# PLANO DE MIGRAÇÃO: REPLIT → HOSTINGER VPS
## Buscador PXT - Migração Zero-Downtime

**Data:** 14 de Novembro de 2025
**Ambiente Atual:** Replit (Autoscale)
**Ambiente Destino:** Hostinger VPS
**Estratégia:** Blue-Green Deployment (Zero-Downtime)

---

## ÍNDICE

1. [Resumo Executivo](#1-resumo-executivo)
2. [Pré-Requisitos](#2-pré-requisitos)
3. [Fase 1: Preparação Local](#fase-1-preparação-local)
4. [Fase 2: Compra e Setup VPS](#fase-2-compra-e-setup-vps)
5. [Fase 3: Deploy na VPS](#fase-3-deploy-na-vps)
6. [Fase 4: Testes Completos](#fase-4-testes-completos)
5. [Fase 5: Configuração DNS](#fase-5-configuração-dns)
6. [Fase 6: Migração (Go-Live)](#fase-6-migração-go-live)
7. [Fase 7: Pós-Migração](#fase-7-pós-migração)
8. [Rollback](#rollback-se-necessário)
9. [Troubleshooting](#troubleshooting)

---

## 1. RESUMO EXECUTIVO

### Objetivo
Migrar o Buscador PXT do Replit para Hostinger VPS com **ZERO downtime** e **ZERO impacto** para usuários.

### Tempo Estimado
- **Preparação:** 2-3 horas
- **Setup VPS:** 1-2 horas
- **Deploy e Testes:** 2-3 horas
- **Migração (DNS):** 15-30 minutos
- **Total:** 6-9 horas

### Economia Esperada
- **Atual (Replit otimizado):** $69.78/mês ($837/ano)
- **VPS Hostinger 3:** $12.99/mês ($156/ano)
- **Economia:** $681/ano (81% de redução)

### Risco
- **Baixo** - Migração reversível em 5-10 minutos (rollback DNS)
- **Downtime esperado:** 0-5 minutos (propagação DNS)

---

## 2. PRÉ-REQUISITOS

### 2.1 Antes de Começar

#### ✅ Checklist de Preparação

```
□ Conta Hostinger criada
□ VPS comprada (Hostinger VPS 2 ou 3)
□ Acesso SSH à VPS obtido
□ Domínio buscadorpxt.com.br acessível
□ Acesso ao painel DNS do domínio
□ Backup completo do código no Git
□ Arquivo secrets.md acessível (credenciais)
□ Acesso ao painel Firebase
□ Acesso ao painel Stripe/ASAAS
□ Acesso ao Google Apps Script
□ Tempo disponível: 6-9 horas (ou dividir em dias)
```

### 2.2 Informações Necessárias

Anote estas informações:

```
VPS:
- IP da VPS: ___________________
- Usuário SSH: root (ou outro): ___________________
- Porta SSH: 22 (padrão): ___________________

Domínio:
- Domínio principal: buscadorpxt.com.br
- DNS Provider: ___________________
- Acesso ao painel DNS: [sim/não]

Replit:
- URL atual: https://...-replit.dev
- Pode manter online? [sim]
```

### 2.3 Arquivos Criados (Prontos)

Estes arquivos já foram criados neste projeto:

```
✅ .env.production           - Variáveis de ambiente (VPS)
✅ vps-setup.sh             - Script de setup automático
✅ ecosystem.config.js       - Configuração PM2
✅ nginx-buscadorpxt.conf   - Configuração Nginx
✅ PLANO_MIGRACAO_HOSTINGER.md (este arquivo)
```

---

## FASE 1: PREPARAÇÃO LOCAL

### Passo 1.1: Preparar Repositório Git

```bash
# Se ainda não tem Git configurado:
cd /Users/jonathanmachado/Documents/BuscadorPXTV1-main

# Inicializar Git (se necessário)
git init

# Adicionar remote (GitHub, GitLab, etc)
git remote add origin https://github.com/seu-usuario/buscadorpxt.git

# Adicionar todos os arquivos (exceto .env e secrets.md)
git add .

# Commit
git commit -m "Preparação para migração VPS"

# Push
git push -u origin main
```

**⚠️ IMPORTANTE:**
- NUNCA commitar `.env` ou `secrets.md`
- Verificar `.gitignore` contém:
  ```
  .env
  .env.*
  secrets.md
  node_modules/
  dist/
  logs/
  ```

### Passo 1.2: Backup de Segurança

```bash
# Criar backup completo
cd /Users/jonathanmachado/Documents/
tar -czf BuscadorPXT-backup-$(date +%Y%m%d).tar.gz BuscadorPXTV1-main/

# Copiar para local seguro (Dropbox, Google Drive, etc)
```

### Passo 1.3: Documentar Estado Atual

```bash
# Listar variáveis de ambiente do Replit
# (copiar do painel do Replit Secrets para arquivo local seguro)

# Anotar URLs importantes:
- URL Replit atual
- Webhooks configurados
- CORS origins
```

---

## FASE 2: COMPRA E SETUP VPS

### Passo 2.1: Comprar VPS Hostinger

1. Acesse: https://www.hostinger.com.br/servidor-vps
2. Escolha plano:
   - **VPS 2:** $8.99/mês (2 vCPU, 8 GB RAM) - adequado
   - **VPS 3:** $12.99/mês (3 vCPU, 12 GB RAM) - **recomendado**
3. Sistema Operacional: **Ubuntu 22.04 LTS** ou **24.04 LTS**
4. Localização: Brasil (Ashburn ou São Paulo, se disponível)
5. Finalizar compra

### Passo 2.2: Acessar Painel VPS Hostinger

1. Login no painel Hostinger
2. Ir em "VPS" → Sua VPS
3. Anotar informações:
   - **IP:** Exemplo: 123.45.67.89
   - **Usuário SSH:** root
   - **Senha:** (gerada pelo Hostinger)

### Passo 2.3: Conectar via SSH

#### **No Mac/Linux:**

```bash
# Conectar à VPS
ssh root@123.45.67.89
# Trocar 123.45.67.89 pelo IP real

# Senha: (copiar do painel Hostinger)
```

#### **No Windows:**

- Usar PuTTY ou Windows Terminal
- Host: 123.45.67.89
- Port: 22
- Username: root
- Password: (do painel Hostinger)

### Passo 2.4: Executar Setup Automático

```bash
# Já conectado via SSH na VPS:

# 1. Criar usuário buscadorpxt (se quiser segurança extra)
adduser buscadorpxt
usermod -aG sudo buscadorpxt

# 2. Fazer upload do script vps-setup.sh
# Opção A: Via SCP (do seu Mac)
scp /Users/jonathanmachado/Documents/BuscadorPXTV1-main/vps-setup.sh root@123.45.67.89:/root/

# Opção B: Copiar e colar conteúdo
nano /root/vps-setup.sh
# Colar conteúdo, Ctrl+O (salvar), Ctrl+X (sair)

# 3. Dar permissão de execução
chmod +x /root/vps-setup.sh

# 4. Executar script
sudo ./vps-setup.sh
```

**O script irá instalar:**
- Node.js 20.x
- npm
- PM2
- Nginx
- Certbot (Let's Encrypt)
- UFW (Firewall)
- Fail2ban
- Criar usuário `buscadorpxt`

**Tempo estimado:** 5-10 minutos

### Passo 2.5: Verificar Instalação

```bash
# Verificar versões instaladas
node --version  # Deve mostrar v20.x.x
npm --version   # Deve mostrar v10.x.x
pm2 --version
nginx -v

# Verificar firewall
sudo ufw status  # Deve mostrar ativo com portas 22, 80, 443

# Tudo OK? Prosseguir.
```

---

## FASE 3: DEPLOY NA VPS

### Passo 3.1: Trocar para Usuário buscadorpxt

```bash
# Trocar de root para buscadorpxt
su - buscadorpxt

# Verificar diretório home
pwd  # Deve mostrar: /home/buscadorpxt
```

### Passo 3.2: Clonar Repositório

```bash
# Clonar projeto do Git
git clone https://github.com/seu-usuario/buscadorpxt.git buscadorpxt

# Entrar no diretório
cd buscadorpxt

# Verificar branch
git branch  # Deve estar em main
```

**⚠️ Se não tem Git configurado:**

```bash
# Fazer upload via SCP (do seu Mac)
cd /Users/jonathanmachado/Documents/
tar -czf buscadorpxt.tar.gz BuscadorPXTV1-main/
scp buscadorpxt.tar.gz buscadorpxt@123.45.67.89:/home/buscadorpxt/

# Na VPS:
cd /home/buscadorpxt
tar -xzf buscadorpxt.tar.gz
mv BuscadorPXTV1-main buscadorpxt
cd buscadorpxt
```

### Passo 3.3: Configurar Variáveis de Ambiente

```bash
# Copiar .env.production para .env
cp .env.production .env

# Editar .env
nano .env
```

**⚠️ ATUALIZAR ESTAS VARIÁVEIS:**

```bash
# Trocar:
VITE_WSS_URL=wss://7081f9c2-...-replit.dev/
# Para:
VITE_WSS_URL=wss://buscadorpxt.com.br/

# Adicionar:
CORS_ORIGIN=https://buscadorpxt.com.br,https://www.buscadorpxt.com.br,http://localhost:5173

# Verificar se TODAS as outras variáveis estão corretas
# (conferir com secrets.md)
```

**Salvar:** `Ctrl+O`, `Enter`
**Sair:** `Ctrl+X`

### Passo 3.4: Instalar Dependências

```bash
# Instalar todas as dependências
npm install

# Tempo estimado: 5-10 minutos (depende da conexão)
```

### Passo 3.5: Build do Projeto

```bash
# Build frontend e backend
npm run build

# Isso vai:
# 1. Compilar frontend React (Vite) → /dist/public
# 2. Compilar backend TypeScript (esbuild) → /dist/index.js

# Tempo estimado: 2-5 minutos
```

### Passo 3.6: Verificar Build

```bash
# Verificar se arquivos foram criados
ls -lh dist/
# Deve mostrar:
#   index.js (backend)
#   public/ (frontend)

ls -lh dist/public/
# Deve mostrar arquivos HTML, JS, CSS, assets
```

### Passo 3.7: Copiar Configuração PM2

```bash
# ecosystem.config.js já está no projeto
# Verificar se caminho está correto:
nano ecosystem.config.js
```

Verificar linha:
```javascript
cwd: '/home/buscadorpxt/buscadorpxt',  // Deve bater com pwd
```

### Passo 3.8: Criar Diretório de Logs

```bash
mkdir -p logs
```

### Passo 3.9: Testar Aplicação (Sem PM2)

```bash
# Testar manualmente primeiro
NODE_ENV=production node dist/index.js
```

**Aguardar mensagem:**
```
🚀 Server running on http://0.0.0.0:5000
```

**Testar em outro terminal (ou no navegador):**
```bash
curl http://123.45.67.89:5000
# Deve retornar HTML do frontend
```

**Se funcionou:**
- Pressionar `Ctrl+C` para parar
- Prosseguir para PM2

**Se deu erro:**
- Ver logs de erro
- Verificar .env
- Ver seção Troubleshooting

### Passo 3.10: Iniciar com PM2

```bash
# Iniciar aplicação com PM2
pm2 start ecosystem.config.js

# Verificar status
pm2 status
# Deve mostrar:
# │ id │ name        │ status │ cpu │ memory │
# │ 0  │ buscadorpxt │ online │ 5%  │ 150MB  │

# Ver logs
pm2 logs buscadorpxt --lines 50

# Salvar configuração PM2 (para iniciar no boot)
pm2 save
```

**⚠️ Se status não for "online":**
```bash
pm2 logs buscadorpxt  # Ver erro
pm2 restart buscadorpxt
```

---

## FASE 4: TESTES COMPLETOS

### Passo 4.1: Testar Via IP

```bash
# No navegador do seu computador:
http://123.45.67.89:5000

# Deve abrir o Buscador PXT
```

### Passo 4.2: Checklist de Funcionalidades

```
□ Página inicial carrega
□ Login funciona (testar com conta real)
□ Dashboard carrega após login
□ Produtos aparecem na tabela
□ Filtros funcionam
□ Sidebar abre/fecha
□ Perfil do usuário aparece
□ Não há erros no console (F12)
```

### Passo 4.3: Testar WebSocket

```bash
# No navegador (F12 → Network → WS)
# Deve aparecer conexão WebSocket ativa

# Ou ver logs do PM2:
pm2 logs buscadorpxt | grep WebSocket
```

### Passo 4.4: Testar Banco de Dados (Neon)

```bash
# Login deve funcionar (conecta ao Neon)
# Produtos devem aparecer (lê do Neon)
# Se tudo aparecer = Neon conectado ✅
```

### Passo 4.5: Testar Performance

```bash
# Chrome DevTools (F12 → Network)
# Verificar:
□ Tempo de carregamento < 3 segundos
□ Sem erros 404
□ Assets carregando corretamente
```

**Se TODOS os testes passarem:** Prosseguir para Nginx.
**Se algo falhar:** Ver Troubleshooting.

---

## FASE 5: CONFIGURAÇÃO DNS

### Passo 5.1: Configurar Nginx

```bash
# Voltar para root
exit  # Sair do usuário buscadorpxt
# Ou abrir novo terminal SSH como root

# Copiar configuração Nginx
sudo cp /home/buscadorpxt/buscadorpxt/nginx-buscadorpxt.conf /etc/nginx/sites-available/buscadorpxt.com.br

# Criar symlink
sudo ln -s /etc/nginx/sites-available/buscadorpxt.com.br /etc/nginx/sites-enabled/

# Testar configuração
sudo nginx -t
# Deve mostrar: "syntax is ok" e "test is successful"

# Recarregar Nginx
sudo systemctl reload nginx
```

### Passo 5.2: Obter Certificado SSL (Let's Encrypt)

```bash
# Certbot para gerar SSL
sudo certbot --nginx -d buscadorpxt.com.br -d www.buscadorpxt.com.br

# Responder às perguntas:
# Email: seu-email@gmail.com
# Termos: (A)gree
# Share email: (N)o
# Redirect HTTP→HTTPS: (2) Redirect

# Certbot irá:
# ✅ Verificar que você é dono do domínio
# ✅ Criar certificados SSL
# ✅ Atualizar config Nginx automaticamente
# ✅ Configurar renovação automática (cron)

# Testar renovação
sudo certbot renew --dry-run
```

**⚠️ ATENÇÃO:** Este passo requer que o DNS já esteja apontando para a VPS (próximo passo) OU que você use DNS challenge.

**Alternativa (se DNS ainda não aponta):**

```bash
# Pular SSL por enquanto
# Testar via HTTP primeiro
# Adicionar SSL depois do DNS
```

### Passo 5.3: Testar Nginx (HTTP)

```bash
# No navegador:
http://123.45.67.89

# Deve abrir o Buscador PXT (via Nginx agora, não porta 5000)
```

---

## FASE 6: MIGRAÇÃO (GO-LIVE)

### 🚨 **ESTE É O MOMENTO DA MIGRAÇÃO** 🚨

### Passo 6.1: Escolher Horário

**Horários Recomendados:**
- Madrugada (3h-5h) - Menos usuários
- Domingo à noite - Menos tráfego
- Fora de horário comercial

**Evitar:**
- Horário comercial (9h-18h)
- Dias de semana (segunda a sexta)

### Passo 6.2: Comunicar Usuários (Opcional)

```
Opção 1: Sem comunicação (migração transparente)
Opção 2: Aviso prévio (banner no site: "Manutenção programada")
```

### Passo 6.3: Atualizar DNS

#### **Registro.br (se for .com.br):**

1. Acessar: https://registro.br
2. Login com certificado digital ou usuário/senha
3. Ir em "DNS" → "Alterar Servidores DNS" (se usar DNS do Registro.br)
4. Ou ir ao painel do seu provedor DNS atual

#### **Atualizar Registros DNS:**

```
Tipo: A
Nome: @
Valor: 123.45.67.89 (IP da VPS)
TTL: 300 (5 minutos para rollback rápido)

Tipo: A
Nome: www
Valor: 123.45.67.89
TTL: 300
```

**OU (alternativa):**

```
Tipo: A
Nome: @
Valor: 123.45.67.89
TTL: 300

Tipo: CNAME
Nome: www
Valor: buscadorpxt.com.br
TTL: 300
```

**Salvar mudanças.**

### Passo 6.4: Aguardar Propagação DNS

```bash
# Do seu computador, verificar DNS:
dig buscadorpxt.com.br +short
# Deve retornar: 123.45.67.89 (IP da VPS)

# Ou:
nslookup buscadorpxt.com.br
```

**Tempo de propagação:** 5-30 minutos (geralmente 5-10 min)

### Passo 6.5: Testar Domínio

```bash
# Assim que DNS propagar:
curl -I https://buscadorpxt.com.br
# Deve retornar HTTP/2 200 (se SSL configurado)

# No navegador:
https://buscadorpxt.com.br
```

**✅ Se funcionar:** Migração bem-sucedida!
**❌ Se não funcionar:** Ver Troubleshooting ou Rollback.

### Passo 6.6: Atualizar Webhooks

Agora que o domínio aponta para VPS, atualizar webhooks:

#### **Google Apps Script:**

1. Abrir Google Sheets
2. Extensões → Apps Script
3. Atualizar variável:
   ```javascript
   const WEBHOOK_URL = 'https://buscadorpxt.com.br/api/webhook/google-sheets';
   ```
4. Salvar
5. Testar: Editar uma célula → Ver logs

#### **Stripe Dashboard:**

1. Acessar: https://dashboard.stripe.com
2. Developers → Webhooks
3. Editar webhook endpoint
4. Trocar URL:
   ```
   https://buscadorpxt.com.br/api/webhooks/stripe
   ```
5. Salvar

#### **ASAAS Dashboard:**

1. Acessar painel ASAAS
2. Configurações → Webhooks
3. Atualizar URL:
   ```
   https://buscadorpxt.com.br/api/webhooks/asaas
   ```
4. Salvar

### Passo 6.7: Testar Webhooks

```bash
# Google Sheets: Editar célula → Ver logs PM2
pm2 logs buscadorpxt | grep webhook

# Stripe: Fazer teste de pagamento (modo teste)

# ASAAS: Verificar painel
```

---

## FASE 7: PÓS-MIGRAÇÃO

### Passo 7.1: Monitoramento Intensivo (Primeiras 2h)

```bash
# Ver logs em tempo real
pm2 logs buscadorpxt

# Ver recursos (CPU, RAM)
pm2 monit

# Ver status
pm2 status

# Ver logs Nginx
sudo tail -f /var/log/nginx/buscadorpxt-access.log
sudo tail -f /var/log/nginx/buscadorpxt-error.log
```

**Verificar a cada 15 minutos:**
- Logs sem erros críticos
- CPU < 80%
- RAM < 80%
- Usuários conseguindo acessar

### Passo 7.2: Testes de Funcionalidade

```
□ Login funciona
□ Produtos carregam
□ WebSocket conecta
□ Sincronização Google Sheets funciona (editar célula)
□ Webhooks funcionando (ver logs)
□ Pagamentos funcionando (teste)
□ Performance boa (< 3s loading)
```

### Passo 7.3: Aumentar TTL do DNS

```
Após 24h de estabilidade:

Atualizar DNS:
TTL: 300 → 3600 (1 hora)

Após 7 dias:
TTL: 3600 → 86400 (24 horas)
```

### Passo 7.4: Desligar Replit (Economizar $)

```
Após 7 dias de VPS estável:

1. Acessar painel Replit
2. Parar deployment
3. Cancelar assinatura (se houver)
4. Economia: $69.78/mês economizados! 🎉
```

### Passo 7.5: Configurar Backup Automático

```bash
# Criar script de backup
nano /home/buscadorpxt/backup.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/home/buscadorpxt/backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup código
tar -czf $BACKUP_DIR/code_$DATE.tar.gz /home/buscadorpxt/buscadorpxt

# Backup .env
cp /home/buscadorpxt/buscadorpxt/.env $BACKUP_DIR/env_$DATE

# Manter apenas últimos 7 dias
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete
find $BACKUP_DIR -name "env_*" -mtime +7 -delete

echo "Backup completed: $DATE"
```

```bash
# Dar permissão
chmod +x /home/buscadorpxt/backup.sh

# Agendar backup diário (3 AM)
crontab -e
# Adicionar linha:
0 3 * * * /home/buscadorpxt/backup.sh >> /home/buscadorpxt/backup.log 2>&1
```

### Passo 7.6: Configurar Monitoramento (Opcional)

```bash
# PM2 Plus (grátis para 1 servidor)
pm2 plus

# Ou usar UptimeRobot (grátis)
# https://uptimerobot.com
# Adicionar monitor: https://buscadorpxt.com.br/health
```

---

## ROLLBACK (SE NECESSÁRIO)

### Quando Fazer Rollback?

```
- Erro crítico que não consegue corrigir em 10 minutos
- Site completamente offline
- Perda de dados
- Performance inaceitável
```

### Passo a Passo Rollback

#### **1. Reverter DNS (RÁPIDO)**

```
Acessar painel DNS
Atualizar registro A:
  Nome: @
  Valor: [IP-ANTIGO-DO-REPLIT]
  TTL: 60 (1 minuto)

Salvar
```

#### **2. Aguardar Propagação (5-15 min)**

```bash
# Verificar DNS
dig buscadorpxt.com.br +short
# Deve voltar ao IP do Replit
```

#### **3. Verificar Replit**

```
- Reativar deployment no Replit
- Testar: https://...-replit.dev
- Testar: https://buscadorpxt.com.br (após DNS propagar)
```

#### **4. Comunicar Usuários**

```
"Manutenção temporária concluída.
Sistema operando normalmente."
```

#### **5. Corrigir Problema na VPS**

```
- Analisar logs: pm2 logs buscadorpxt
- Corrigir configuração
- Testar via IP da VPS
- Tentar migração novamente
```

---

## TROUBLESHOOTING

### Problema: "npm install" falha

**Solução:**
```bash
# Limpar cache npm
npm cache clean --force

# Deletar node_modules
rm -rf node_modules
rm package-lock.json

# Reinstalar
npm install
```

### Problema: "npm run build" falha

**Solução:**
```bash
# Ver erro completo
npm run build 2>&1 | tee build.log

# Verificar .env
cat .env | grep VITE_

# Verificar espaço em disco
df -h
```

### Problema: PM2 status "errored"

**Solução:**
```bash
# Ver logs detalhados
pm2 logs buscadorpxt --err --lines 100

# Deletar e recriar
pm2 delete buscadorpxt
pm2 start ecosystem.config.js

# Verificar .env
cat /home/buscadorpxt/buscadorpxt/.env
```

### Problema: Nginx "502 Bad Gateway"

**Solução:**
```bash
# Verificar se app está rodando
pm2 status
# Se não estiver online:
pm2 restart buscadorpxt

# Verificar porta
netstat -tuln | grep 5000
# Deve mostrar: LISTEN :5000

# Ver logs Nginx
sudo tail -50 /var/log/nginx/buscadorpxt-error.log
```

### Problema: SSL não funciona

**Solução:**
```bash
# Re-executar Certbot
sudo certbot --nginx -d buscadorpxt.com.br -d www.buscadorpxt.com.br --force-renewal

# Verificar DNS primeiro
dig buscadorpxt.com.br +short
# Deve mostrar IP da VPS

# Testar manualmente
curl -I https://buscadorpxt.com.br
```

### Problema: WebSocket não conecta

**Solução:**
```bash
# Verificar .env
grep VITE_WSS_URL /home/buscadorpxt/buscadorpxt/.env
# Deve ser: wss://buscadorpxt.com.br/

# Rebuild frontend
npm run build

# Restart PM2
pm2 reload buscadorpxt
```

### Problema: Banco de dados não conecta

**Solução:**
```bash
# Verificar DATABASE_URL no .env
grep DATABASE_URL /home/buscadorpxt/buscadorpxt/.env

# Testar conexão Neon
ping ep-holy-rain-a67fpqrh.us-west-2.aws.neon.tech

# Ver logs do app
pm2 logs buscadorpxt | grep -i database
```

---

## CHECKLIST FINAL

### Pré-Migração
```
□ VPS comprada (Hostinger VPS 2 ou 3)
□ SSH funcionando
□ Setup automático executado (vps-setup.sh)
□ Projeto clonado na VPS
□ .env configurado corretamente
□ npm install executado
□ npm run build bem-sucedido
□ PM2 rodando (status: online)
□ Teste via IP funcionando
□ Nginx configurado
□ SSL obtido (Let's Encrypt)
□ Teste via domínio funcionando
```

### Migração
```
□ Horário escolhido (baixa demanda)
□ Usuários comunicados (opcional)
□ DNS atualizado (registro A)
□ Propagação DNS verificada (dig/nslookup)
□ Domínio funcionando (https://buscadorpxt.com.br)
□ Webhooks atualizados (Google, Stripe, ASAAS)
□ Webhooks testados
```

### Pós-Migração
```
□ Monitoramento 2h (sem erros críticos)
□ Funcionalidades testadas (login, produtos, etc)
□ WebSocket funcionando
□ Performance boa (< 3s)
□ Logs limpos (sem erros)
□ Backup configurado (cron)
□ Monitoramento configurado (PM2 Plus/UptimeRobot)
□ Replit desligado (após 7 dias estável)
```

---

## CONTATOS DE EMERGÊNCIA

```
VPS Hostinger:
- Suporte: https://www.hostinger.com.br/contato
- Painel: https://hpanel.hostinger.com

Neon (Database):
- Status: https://status.neon.tech
- Docs: https://neon.tech/docs

Firebase:
- Console: https://console.firebase.google.com
- Status: https://status.firebase.google.com

Stripe:
- Dashboard: https://dashboard.stripe.com
- Status: https://status.stripe.com
```

---

## CONCLUSÃO

Seguindo este plano passo a passo, você terá uma migração **zero-downtime** e **zero impacto** para usuários.

**Economia esperada:** $681/ano (81% de redução)
**Tempo total:** 6-9 horas
**Risco:** Baixo (reversível em minutos)

**Boa sorte! 🚀**

---

*Plano criado por: Claude Code*
*Data: 14 de Novembro de 2025*
*Versão: 1.0*
