# 🚀 GUIA DE EXECUÇÃO - SUA VPS HOSTINGER
## Comandos Exatos para Migração

**VPS Hostinger Comprada:**
- IP: `31.97.171.93`
- Usuário: `root`
- Senha: `rMq;;K&Lodb.gnW+qF8,`

---

## PASSO 1: CONECTAR VIA SSH (FAÇA AGORA)

### Opção A: Terminal do Mac (Recomendado)

Abra o Terminal do Mac (Cmd+Espaço, digite "Terminal"):

```bash
ssh root@31.97.171.93
```

Quando pedir senha, cole:
```
rMq;;K&Lodb.gnW+qF8,
```

### Opção B: Terminal do Cursor

No Cursor, abra o terminal integrado (Ctrl+`):

```bash
ssh root@31.97.171.93
```

Cole a senha quando solicitado.

---

## PASSO 2: PRIMEIRO ACESSO (Na VPS, após conectar)

### 2.1 Verificar Sistema

```bash
# Ver informações do sistema
cat /etc/os-release

# Deve mostrar: Ubuntu 22.04 ou 24.04
```

### 2.2 Atualizar Sistema

```bash
apt update && apt upgrade -y
```

**Tempo:** 5-10 minutos
**Aguarde:** Terminar completamente

---

## PASSO 3: UPLOAD DO SCRIPT DE SETUP

### 3.1 Abrir NOVO Terminal (no seu Mac)

NÃO fechar o SSH! Abrir nova aba/janela do Terminal.

### 3.2 Fazer Upload do Script

```bash
# No NOVO terminal do Mac (não no SSH):
cd /Users/jonathanmachado/Documents/BuscadorPXTV1-main

# Upload do script:
scp vps-setup.sh root@31.97.171.93:/root/
```

Quando pedir senha:
```
rMq;;K&Lodb.gnW+qF8,
```

**Deve mostrar:**
```
vps-setup.sh    100%  5.2KB  50.1KB/s   00:00
```

---

## PASSO 4: EXECUTAR SETUP AUTOMÁTICO

### 4.1 Voltar para o Terminal SSH (onde está conectado à VPS)

```bash
# Verificar se arquivo foi enviado:
ls -lh /root/vps-setup.sh

# Dar permissão de execução:
chmod +x /root/vps-setup.sh

# EXECUTAR SETUP:
./vps-setup.sh
```

**O que vai acontecer:**
- ✅ Instalar Node.js 20.x
- ✅ Instalar npm
- ✅ Instalar PM2
- ✅ Instalar Nginx
- ✅ Instalar Certbot (SSL)
- ✅ Configurar Firewall (UFW)
- ✅ Instalar Fail2ban
- ✅ Criar usuário `buscadorpxt`

**Tempo:** 5-10 minutos
**Aguarde:** Até ver mensagem final "✅ SETUP CONCLUÍDO COM SUCESSO!"

---

## PASSO 5: VERIFICAR INSTALAÇÃO

```bash
# Verificar versões instaladas:
node --version    # Deve mostrar: v20.x.x
npm --version     # Deve mostrar: v10.x.x
pm2 --version     # Deve mostrar número de versão
nginx -v          # Deve mostrar versão do Nginx

# Verificar firewall:
ufw status        # Deve mostrar: Status: active

# Tudo OK? Prosseguir!
```

---

## PASSO 6: CRIAR REPOSITÓRIO GIT (Se ainda não tiver)

### 6.1 No Terminal do Mac (não no SSH)

```bash
cd /Users/jonathanmachado/Documents/BuscadorPXTV1-main

# Verificar se já tem Git inicializado:
git status

# Se NÃO tiver Git:
git init
git add .
git commit -m "Preparação para deploy VPS"

# Criar repositório no GitHub:
# 1. Ir para https://github.com
# 2. Clicar em "New repository"
# 3. Nome: buscadorpxt
# 4. Privado: SIM
# 5. Criar

# Adicionar remote (trocar SEU-USUARIO pelo seu username do GitHub):
git remote add origin https://github.com/SEU-USUARIO/buscadorpxt.git
git branch -M main
git push -u origin main
```

**⚠️ IMPORTANTE:**
- Verificar que `.gitignore` está protegendo `.env` e `secrets.md`
- NUNCA commitar credenciais

---

## PASSO 7: CLONAR PROJETO NA VPS

### 7.1 Voltar para SSH (VPS)

```bash
# Trocar para usuário buscadorpxt:
su - buscadorpxt

# Verificar diretório:
pwd
# Deve mostrar: /home/buscadorpxt

# Clonar projeto (trocar SEU-USUARIO):
git clone https://github.com/SEU-USUARIO/buscadorpxt.git buscadorpxt

# Entrar no diretório:
cd buscadorpxt

# Verificar arquivos:
ls -la
```

**Deve ver:** package.json, .env.production, vps-setup.sh, etc.

---

## PASSO 8: CONFIGURAR VARIÁVEIS DE AMBIENTE

```bash
# Copiar .env.production para .env:
cp .env.production .env

# Editar .env:
nano .env
```

### 8.1 Atualizar Estas Linhas:

**Procure (Ctrl+W no nano) e atualize:**

```bash
# Trocar:
VITE_WSS_URL=wss://7081f9c2-0746-4fa0-bc2f-2274a33b30ad-00-27oyim1rk306b.riker.replit.dev/

# Para:
VITE_WSS_URL=wss://buscadorpxt.com.br/

# E adicionar/atualizar:
CORS_ORIGIN=https://buscadorpxt.com.br,https://www.buscadorpxt.com.br,http://localhost:5173
```

**Salvar:** Ctrl+O, Enter
**Sair:** Ctrl+X

### 8.2 Verificar Se Tudo Está Correto

```bash
# Ver variáveis importantes:
grep -E "(DATABASE_URL|FIREBASE|VITE_WSS_URL|CORS_ORIGIN)" .env
```

**Deve mostrar:** DATABASE_URL, FIREBASE_*, VITE_WSS_URL, CORS_ORIGIN

---

## PASSO 9: INSTALAR DEPENDÊNCIAS

```bash
# Instalar todas as dependências:
npm install
```

**Tempo:** 5-10 minutos (dependendo da conexão)
**Aguarde:** Até ver "added X packages"

---

## PASSO 10: BUILD DO PROJETO

```bash
# Build frontend + backend:
npm run build
```

**O que vai acontecer:**
- Compilar frontend React (Vite) → `/dist/public`
- Compilar backend TypeScript (esbuild) → `/dist/index.js`

**Tempo:** 2-5 minutos
**Aguarde:** Até terminar

### 10.1 Verificar Build

```bash
# Ver arquivos criados:
ls -lh dist/
# Deve mostrar: index.js, public/

ls -lh dist/public/
# Deve mostrar: index.html, assets/, etc
```

**Se não aparecer:** Ver erros do build, corrigir .env

---

## PASSO 11: CRIAR DIRETÓRIO DE LOGS

```bash
mkdir -p logs
```

---

## PASSO 12: TESTAR APLICAÇÃO (SEM PM2)

```bash
# Testar manualmente primeiro:
NODE_ENV=production node dist/index.js
```

**Aguarde mensagem:**
```
🚀 Server running on http://0.0.0.0:5000
```

### 12.1 Testar (Abrir NOVO terminal no Mac)

```bash
# Testar se app responde:
curl http://31.97.171.93:5000
```

**Deve retornar:** HTML do frontend

### 12.2 Parar Teste

**No terminal SSH (onde app está rodando):**
Pressionar `Ctrl+C`

---

## PASSO 13: INICIAR COM PM2

```bash
# Iniciar com PM2:
pm2 start ecosystem.config.js

# Ver status:
pm2 status
```

**Deve mostrar:**
```
│ id │ name        │ status │ cpu │ memory │
│ 0  │ buscadorpxt │ online │ 5%  │ 150MB  │
│ 1  │ buscadorpxt │ online │ 3%  │ 145MB  │
```

**Status deve ser:** `online` ✅

### 13.1 Ver Logs

```bash
pm2 logs buscadorpxt --lines 50
```

**Deve ver:** "Server running on http://0.0.0.0:5000"

### 13.2 Salvar Configuração PM2

```bash
pm2 save
```

---

## PASSO 14: TESTAR VIA IP (No navegador do Mac)

Abrir navegador e acessar:
```
http://31.97.171.93:5000
```

**Deve abrir:** Buscador PXT (página de login)

### 14.1 Checklist de Testes

```
□ Página inicial carrega
□ Login funciona (testar com conta real)
□ Dashboard aparece após login
□ Produtos aparecem na tabela
□ Sem erros no console (F12 → Console)
```

**Se tudo funcionar:** Prosseguir para Nginx!
**Se algo falhar:** Ver logs: `pm2 logs buscadorpxt`

---

## PASSO 15: CONFIGURAR NGINX

### 15.1 Voltar para Usuário Root

```bash
# Sair do usuário buscadorpxt:
exit

# Agora você está como root
```

### 15.2 Copiar Configuração Nginx

```bash
# Copiar config:
cp /home/buscadorpxt/buscadorpxt/nginx-buscadorpxt.conf /etc/nginx/sites-available/buscadorpxt.com.br

# Criar symlink:
ln -s /etc/nginx/sites-available/buscadorpxt.com.br /etc/nginx/sites-enabled/

# Testar configuração:
nginx -t
```

**Deve mostrar:**
```
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

### 15.3 Recarregar Nginx

```bash
systemctl reload nginx
```

---

## PASSO 16: TESTAR NGINX (Sem SSL ainda)

### 16.1 Testar Via IP (Sem Porta)

No navegador:
```
http://31.97.171.93
```

**Deve abrir:** Buscador PXT (agora via Nginx, não porta 5000)

---

## PASSO 17: OBTER CERTIFICADO SSL

### ⚠️ IMPORTANTE: Antes de executar

Certbot precisa que o **DNS já esteja apontando** para a VPS.

**Opções:**

**Opção A: Já configurar DNS agora (recomendado)**
1. Ir ao painel DNS do domínio
2. Criar registro A:
   - Nome: `@`
   - Valor: `31.97.171.93`
   - TTL: 300
3. Criar registro A para www:
   - Nome: `www`
   - Valor: `31.97.171.93`
   - TTL: 300
4. Aguardar 5-30 minutos (propagação)
5. Testar: `dig buscadorpxt.com.br +short` → deve mostrar `31.97.171.93`
6. Executar Certbot abaixo

**Opção B: Usar IP temporariamente**
- Pular SSL por enquanto
- Configurar depois que DNS estiver pronto

### 17.1 Se Escolheu Opção A (DNS Pronto):

```bash
# Obter certificado SSL:
certbot --nginx -d buscadorpxt.com.br -d www.buscadorpxt.com.br

# Responder:
# Email: seu-email@gmail.com
# Termos: (A)gree
# Share email: (N)o
# Redirect HTTP→HTTPS: (2) Redirect
```

**Certbot vai:**
- ✅ Verificar que você é dono do domínio
- ✅ Criar certificados SSL
- ✅ Atualizar config Nginx automaticamente
- ✅ Configurar renovação automática

### 17.2 Testar SSL

No navegador:
```
https://buscadorpxt.com.br
```

**Deve abrir:** Buscador PXT com HTTPS (cadeado verde)

---

## PASSO 18: TESTES FINAIS (VIA DOMÍNIO)

### 18.1 Checklist Completo

```
□ https://buscadorpxt.com.br carrega
□ Login funciona
□ Dashboard carrega
□ Produtos aparecem
□ Filtros funcionam
□ WebSocket conecta (F12 → Network → WS)
□ Performance boa (< 3s)
□ Sem erros 404 ou 500
```

**Se TUDO OK:** Migração concluída! 🎉

---

## PASSO 19: ATUALIZAR WEBHOOKS

Agora que o domínio aponta para a VPS, atualizar webhooks:

### 19.1 Google Apps Script

1. Abrir: Google Sheets do Buscador PXT
2. Extensões → Apps Script
3. Atualizar linha:
   ```javascript
   const WEBHOOK_URL = 'https://buscadorpxt.com.br/api/webhook/google-sheets';
   ```
4. Salvar (Ctrl+S)
5. Testar: Editar uma célula → Ver logs PM2

### 19.2 Stripe

1. Dashboard: https://dashboard.stripe.com
2. Developers → Webhooks
3. Editar endpoint
4. URL: `https://buscadorpxt.com.br/api/webhooks/stripe`
5. Salvar

### 19.3 ASAAS

1. Painel ASAAS
2. Configurações → Webhooks
3. URL: `https://buscadorpxt.com.br/api/webhooks/asaas`
4. Salvar

---

## PASSO 20: MONITORAMENTO (Primeiras 2 horas)

### 20.1 Ver Logs em Tempo Real

```bash
# Logs da aplicação:
pm2 logs buscadorpxt

# Logs do Nginx:
tail -f /var/log/nginx/buscadorpxt-access.log
tail -f /var/log/nginx/buscadorpxt-error.log
```

### 20.2 Ver Recursos (CPU, RAM)

```bash
pm2 monit
```

**Verificar:**
- CPU < 80%
- RAM < 80%
- Status: online

---

## PASSO 21: DESLIGAR REPLIT (Após 7 dias estável)

Após confirmar que VPS está 100% estável:

1. Acessar: https://replit.com
2. Abrir projeto Buscador PXT
3. Parar deployment
4. Cancelar assinatura (se houver)
5. **Economizar $681/ano!** 🎉

---

## 🆘 COMANDOS ÚTEIS

### Ver Status

```bash
pm2 status          # Status dos processos
pm2 monit           # Monitor em tempo real
systemctl status nginx  # Status do Nginx
ufw status          # Status do firewall
```

### Ver Logs

```bash
pm2 logs buscadorpxt    # Logs da app
pm2 logs --err          # Apenas erros
tail -f /var/log/nginx/buscadorpxt-error.log  # Nginx erros
```

### Reiniciar

```bash
pm2 restart buscadorpxt  # Reiniciar app
pm2 reload buscadorpxt   # Reload (zero-downtime)
systemctl reload nginx   # Recarregar Nginx
```

### Parar/Deletar

```bash
pm2 stop buscadorpxt     # Parar
pm2 delete buscadorpxt   # Deletar processo
```

---

## 🚨 SE ALGO DER ERRADO

### Problema: npm install falha

```bash
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### Problema: PM2 status "errored"

```bash
pm2 logs buscadorpxt --err --lines 100
# Ver erro específico
```

### Problema: Nginx 502 Bad Gateway

```bash
pm2 status  # Verificar se app está online
pm2 restart buscadorpxt
```

### Problema: SSL não funciona

```bash
# Verificar DNS primeiro:
dig buscadorpxt.com.br +short
# Deve mostrar: 31.97.171.93

# Re-executar Certbot:
certbot --nginx -d buscadorpxt.com.br -d www.buscadorpxt.com.br --force-renewal
```

---

## ✅ CHECKLIST RÁPIDO

```
□ SSH conectado (31.97.171.93)
□ Sistema atualizado
□ vps-setup.sh executado
□ Node.js 20.x instalado
□ Projeto clonado
□ .env configurado
□ npm install ✅
□ npm run build ✅
□ Teste manual funcionou
□ PM2 rodando (status: online)
□ Teste via IP:5000 OK
□ Nginx configurado
□ Teste via IP OK
□ DNS atualizado
□ SSL obtido
□ Teste via HTTPS OK
□ Webhooks atualizados
□ Monitoramento OK
```

---

## 💡 PRÓXIMO PASSO AGORA:

**Execute o Passo 1:** Conectar via SSH

```bash
ssh root@31.97.171.93
```

Senha: `rMq;;K&Lodb.gnW+qF8,`

**Depois de conectar, me avise e vou guiar você passo a passo!**

---

*Guia criado especificamente para sua VPS Hostinger*
*IP: 31.97.171.93*
*Data: 14 de Novembro de 2025*
