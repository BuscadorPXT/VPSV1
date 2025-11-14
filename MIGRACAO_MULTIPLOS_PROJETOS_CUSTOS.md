# MIGRAÇÃO VPS: MÚLTIPLOS PROJETOS + MIGRAÇÃO TRANSPARENTE + ANÁLISE DE CUSTOS

**Data:** 14 de Novembro de 2025
**Complemento à:** ANALISE_MIGRACAO_VPS.md
**Baseado em:** CUSTOS.md (economia de 90% implementada)

---

## ÍNDICE

1. [Múltiplos Projetos na Mesma VPS](#1-múltiplos-projetos-na-mesma-vps)
2. [Migração Transparente (Zero Impacto)](#2-migração-transparente-zero-impacto)
3. [Análise de Custos: Replit vs VPS](#3-análise-de-custos-replit-vs-vps)
4. [Configuração Nginx para Múltiplos Domínios](#4-configuração-nginx-para-múltiplos-domínios)
5. [Estratégia de Migração Zero-Downtime](#5-estratégia-de-migração-zero-downtime)
6. [ROI e Break-Even](#6-roi-e-break-even)

---

## 1. MÚLTIPLOS PROJETOS NA MESMA VPS

### 1.1 Resposta Direta

✅ **SIM, você pode rodar MÚLTIPLOS projetos em domínios diferentes na mesma VPS!**

É uma das **maiores vantagens** da VPS vs Replit. Na prática:

```
Uma VPS (ex: Hostinger VPS 3 - $12.99/mês)
├── buscadorpxt.com.br (porta 5000)
├── outroprojeto.com.br (porta 5001)
├── maisumprojeto.com.br (porta 5002)
└── api.meuservico.com.br (porta 5003)

Nginx faz o roteamento por domínio
SSL (Let's Encrypt) para TODOS os domínios - GRÁTIS
```

### 1.2 Arquitetura Multi-Projeto

```
Internet (HTTPS)
    ↓
VPS (IP único: 123.45.67.89)
    ↓
Nginx (porta 80/443)
    ├─ buscadorpxt.com.br → localhost:5000 (Node.js + Express)
    ├─ projeto2.com → localhost:5001 (Node.js ou outro)
    ├─ projeto3.com → localhost:5002 (Python/Django, etc)
    └─ api.servico.com → localhost:5003 (API Node.js)

Cada projeto:
- Tem seu próprio processo (PM2)
- Tem sua própria porta
- Tem seu próprio certificado SSL
- Roda isoladamente
```

### 1.3 Limites de Recursos

#### **VPS Hostinger 2 ($8.99/mês)**
```
Especificações:
- 2 vCPUs
- 8 GB RAM
- 100 GB SSD
- 2 TB bandwidth

Capacidade Estimada:
✅ 2-3 projetos Node.js pequenos/médios
✅ 1 projeto pesado + 1-2 leves
✅ Buscador PXT + 1-2 outros projetos
```

#### **VPS Hostinger 3 ($12.99/mês)**
```
Especificações:
- 3 vCPUs
- 12 GB RAM
- 150 GB SSD
- 3 TB bandwidth

Capacidade Estimada:
✅ 3-5 projetos Node.js médios
✅ 2 projetos pesados + 2-3 leves
✅ Buscador PXT + 3-4 outros projetos
```

### 1.4 Cálculo de Recursos por Projeto

#### **Buscador PXT (baseado na análise)**
```
CPU: 0.5-1 vCPU (médio uso)
RAM: 1.5-2 GB (com 50 usuários simultâneos)
Disco: 500 MB (código + logs)
Bandwidth: 500 GB/mês (estimativa)
```

#### **Exemplo de Distribuição (VPS 3)**
```
Projeto                  | vCPU | RAM   | Disco  | Porta
-------------------------|------|-------|--------|------
Buscador PXT             | 1.0  | 2 GB  | 500 MB | 5000
Projeto 2 (Landing Page) | 0.2  | 0.5 GB| 200 MB | 5001
Projeto 3 (API)          | 0.5  | 1 GB  | 300 MB | 5002
Projeto 4 (Dashboard)    | 0.3  | 0.8 GB| 250 MB | 5003
-------------------------|------|-------|--------|------
TOTAL USADO              | 2.0  | 4.3 GB| 1.2 GB | -
DISPONÍVEL               | 1.0  | 7.7 GB| 148 GB | -
```

**Sobra de recursos:** ✅ Sim, ainda tem margem!

### 1.5 Quando Você Precisa de VPS Maior

```
Se tiver:
- 5+ projetos Node.js médios
- 100+ usuários simultâneos no Buscador PXT
- Projetos com processamento pesado (ML, video processing, etc)

Então: Upgrade para VPS 4 ($15.99/mês) ou considera VPS dedicada
```

---

## 2. MIGRAÇÃO TRANSPARENTE (ZERO IMPACTO)

### 2.1 Resposta Direta

✅ **NÃO, ninguém vai perceber a mudança se você:**

1. Mantiver o mesmo banco de dados (Neon PostgreSQL)
2. Apontar o DNS corretamente
3. Configurar SSL/HTTPS
4. Fazer migração zero-downtime

**Para o usuário final:** Será EXATAMENTE IGUAL. Mesma URL, mesma interface, mesma velocidade (ou até mais rápida).

### 2.2 O Que NÃO Muda

```
✅ URL: buscadorpxt.com.br (continua a mesma)
✅ Banco de Dados: Neon PostgreSQL (mesma connection string)
✅ Dados: TODOS os dados permanecem
✅ Usuários: Mesmos logins, mesmas senhas
✅ Sessões: Podem ser mantidas (se migrar em produção)
✅ Funcionalidades: 100% iguais
✅ Performance: Igual ou melhor
✅ SSL/HTTPS: Continua funcionando
✅ Integrações: Firebase, Stripe, Google Sheets - todas mantêm
```

### 2.3 O Que Muda (Apenas Infraestrutura)

```
ANTES (Replit):
Internet → Replit CDN → Replit Container → Neon DB
         (replit.dev)    (autoscale)

DEPOIS (VPS):
Internet → VPS → Nginx → Node.js (PM2) → Neon DB
         (sua-vps)       (processo)

Para o usuário: ZERO DIFERENÇA
Para você: CUSTO MENOR + CONTROLE TOTAL
```

### 2.4 Componentes que Mantêm Idênticos

#### **Banco de Dados (Neon PostgreSQL)**
```bash
# Connection string EXATAMENTE IGUAL:
DATABASE_URL=postgresql://neondb_owner:senha@ep-holy-rain-a67fpqrh.us-west-2.aws.neon.tech:5432/neondb?sslmode=require

ANTES (Replit): ✅ Usa essa string
DEPOIS (VPS):   ✅ Usa a MESMA string

Resultado: ZERO mudança nos dados, sessões, usuários
```

#### **Serviços Externos**
```
Firebase Authentication:    ✅ Mesmas credenciais
Google Sheets API:          ✅ Mesma integração (apenas atualizar webhook)
Stripe:                     ✅ Mesmas keys (apenas atualizar webhook)
ASAAS:                      ✅ Mesma API key (apenas atualizar webhook)
Google Drive/Dropbox:       ✅ Zero mudança
OpenAI API:                 ✅ Zero mudança
Discord Webhook:            ✅ Zero mudança
```

#### **Frontend**
```
React 18 build:             ✅ Exatamente o mesmo
Assets (CSS, JS, imagens):  ✅ Idênticos
WebSocket:                  ✅ Funciona igual (apenas trocar URL)
```

### 2.5 Pontos de Atenção (Atualizações Necessárias)

#### **Webhooks (Precisam Apontar para Novo Domínio)**

```bash
# Google Sheets Apps Script
ANTES: WEBHOOK_URL = "https://...-replit.dev/api/webhook/google-sheets"
DEPOIS: WEBHOOK_URL = "https://buscadorpxt.com.br/api/webhook/google-sheets"

# Stripe Dashboard
ANTES: https://...-replit.dev/api/webhooks/stripe
DEPOIS: https://buscadorpxt.com.br/api/webhooks/stripe

# ASAAS Dashboard
ANTES: https://...-replit.dev/api/webhooks/asaas
DEPOIS: https://buscadorpxt.com.br/api/webhooks/asaas
```

**Impacto:** Se você atualizar ANTES de migrar, zero downtime. Se esquecer, webhooks param temporariamente.

#### **CORS Origins**

```typescript
// Atualizar no .env da VPS
CORS_ORIGIN=https://buscadorpxt.com.br,https://www.buscadorpxt.com.br

// Remover URL do Replit se não for usar mais
```

#### **WebSocket URL (Frontend)**

```bash
# .env da VPS
VITE_WSS_URL=wss://buscadorpxt.com.br/

# Rebuild frontend
npm run build
```

---

## 3. ANÁLISE DE CUSTOS: REPLIT VS VPS

### 3.1 Situação Atual no Replit (Baseado em CUSTOS.md)

#### **ANTES das Otimizações (Outubro 2025)**
```
Compute Units: 218 milhões/mês
Custo: $697.79/mês
Polling: A cada 30 segundos (2.880/dia)
Frontend Polling: 28.800 requests/dia
Google Sheets Reads: 2.880/dia
```

#### **DEPOIS das Otimizações (Implementado)**
```
Compute Units: 21.8 milhões/mês (redução de 90%)
Custo Estimado: $69.78/mês
Polling: A cada 1 hora (24/dia) - horário comercial
Frontend Polling: 0 (event-driven via WebSocket)
Google Sheets Reads: 96/dia
```

**Economia Implementada:** ~$628/mês (90% de redução)

### 3.2 Projeção de Custos em VPS

#### **Opção 1: Hostinger VPS 2**
```
Custo Fixo: $8.99/mês ($107.88/ano)
Recursos:
- 2 vCPUs
- 8 GB RAM
- 100 GB SSD
- 2 TB bandwidth

Custos Adicionais:
- Domínio .com.br: $15/ano (renovação)
- SSL: $0 (Let's Encrypt)
- Backup (opcional): $0 (fazer manual)

TOTAL: ~$9/mês ($123/ano)
```

#### **Opção 2: Hostinger VPS 3 (Recomendado para múltiplos projetos)**
```
Custo Fixo: $12.99/mês ($155.88/ano)
Recursos:
- 3 vCPUs
- 12 GB RAM
- 150 GB SSD
- 3 TB bandwidth

Custos Adicionais:
- Domínio .com.br: $15/ano
- SSL: $0 (Let's Encrypt para TODOS os domínios)
- Backup (opcional): $0

TOTAL: ~$13/mês ($171/ano)
```

#### **Opção 3: DigitalOcean (2 vCPU, 4 GB RAM)**
```
Custo Fixo: $24/mês ($288/ano)
Recursos:
- 2 vCPUs
- 4 GB RAM
- 80 GB SSD
- 4 TB bandwidth

Custos Adicionais:
- Domínio: $15/ano
- SSL: $0
- Backup automático: $4.80/mês (20% do droplet)

TOTAL: ~$29/mês ($363/ano)
```

### 3.3 Comparação Completa

| Provedor | Custo/Mês | Custo/Ano | Recursos | Múltiplos Projetos |
|----------|-----------|-----------|----------|-------------------|
| **Replit (Atual Otimizado)** | $69.78 | $837 | Autoscale | ❌ Difícil (caro) |
| **Hostinger VPS 2** | $8.99 | $108 | 2 vCPU, 8GB | ✅ 2-3 projetos |
| **Hostinger VPS 3** | $12.99 | $156 | 3 vCPU, 12GB | ✅ 3-5 projetos |
| **DigitalOcean** | $24 | $288 | 2 vCPU, 4GB | ✅ 2-3 projetos |
| **Linode** | $24 | $288 | 2 vCPU, 4GB | ✅ 2-3 projetos |
| **Railway.app** | $20-40 | $240-480 | Autoscale | ⚠️ Possível (caro) |

### 3.4 Economia Anual

#### **Cenário 1: Migrar para Hostinger VPS 2**
```
Custo Atual (Replit otimizado): $837/ano
Custo VPS 2: $108/ano
Economia: $729/ano (87% de redução)
```

#### **Cenário 2: Migrar para Hostinger VPS 3 + 3 Projetos**
```
Custo Atual (Replit otimizado): $837/ano (1 projeto)
Se hospedar 3 projetos no Replit: ~$2.511/ano ($837 × 3)

Custo VPS 3: $156/ano (3 projetos)
Economia: $2.355/ano (94% de redução)

Custo por Projeto: $52/ano (vs $837/ano no Replit)
```

#### **Cenário 3: Comparação com Custo Antigo (Antes da Otimização)**
```
Custo Antigo (Replit sem otimização): $8.373/ano ($697.79/mês)
Custo VPS 3: $156/ano
Economia: $8.217/ano (98% de redução!)
```

### 3.5 Gráfico de Custos (Anual)

```
Replit (Antes Otimização):    ████████████████████ $8.373
Replit (Depois Otimização):   ████ $837
DigitalOcean:                 ██ $288
Hostinger VPS 3:              █ $156
Hostinger VPS 2:              █ $108
                              0   2K   4K   6K   8K

ECONOMIA: 87-98% dependendo do cenário
```

### 3.6 Cálculo de ROI (Return on Investment)

#### **Setup da VPS (Custo de Tempo)**

```
Seu tempo de setup: 8-12 horas (estimativa)
Valor da sua hora: $X (você decide)

Exemplo: Se sua hora vale $50
Custo setup: 10h × $50 = $500 (investimento único)

Break-even (Hostinger VPS 3):
Economia mensal: $69.78 - $12.99 = $56.79/mês
Tempo para recuperar investimento: 8,8 meses

Após 1 ano:
- Investimento: $500 (setup) + $156 (VPS) = $656
- Custo Replit: $837
- Economia: $181 no primeiro ano
- Economia a partir do 2º ano: $681/ano (sem custo de setup)
```

#### **Se Usar Hostinger VPS 2**

```
Economia mensal: $69.78 - $8.99 = $60.79/mês
Break-even: 8,2 meses

Após 1 ano:
- Total investido: $500 + $108 = $608
- Custo Replit: $837
- Economia: $229 no primeiro ano
- Economia a partir do 2º ano: $729/ano
```

### 3.7 Vantagens Financeiras Adicionais da VPS

```
✅ Custo FIXO e previsível (não escala com tráfego)
✅ Múltiplos projetos SEM custo adicional
✅ Sem limite de compute units
✅ Sem surpresas na fatura
✅ Escalabilidade vertical simples (upgrade de plano)
✅ Pode cancelar a qualquer momento (sem lock-in)
✅ SSL grátis para TODOS os domínios
```

### 3.8 Quando Replit Ainda Faz Sentido

```
✅ Você não tem tempo para DevOps
✅ Está validando MVP rapidamente
✅ Não quer lidar com infraestrutura
✅ Tráfego MUITO baixo (<10 usuários/dia)
✅ Projeto temporário/prototipagem
```

**Para seu caso (Buscador PXT em produção):** VPS faz MUITO mais sentido financeiramente.

---

## 4. CONFIGURAÇÃO NGINX PARA MÚLTIPLOS DOMÍNIOS

### 4.1 Estrutura de Diretórios

```
/home/buscadorpxt/
├── buscadorpxt/          # Projeto 1
│   ├── dist/
│   ├── .env
│   └── ecosystem.config.js (porta 5000)
├── projeto2/             # Projeto 2
│   ├── dist/
│   ├── .env
│   └── ecosystem.config.js (porta 5001)
└── projeto3/             # Projeto 3
    ├── dist/
    ├── .env
    └── ecosystem.config.js (porta 5002)
```

### 4.2 PM2 Ecosystem para Múltiplos Projetos

```javascript
// /home/buscadorpxt/ecosystem.config.js (MASTER)
module.exports = {
  apps: [
    // Projeto 1: Buscador PXT
    {
      name: 'buscadorpxt',
      cwd: '/home/buscadorpxt/buscadorpxt',
      script: './dist/index.js',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 5000
      },
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      max_memory_restart: '1G'
    },

    // Projeto 2: Outro Projeto
    {
      name: 'projeto2',
      cwd: '/home/buscadorpxt/projeto2',
      script: './dist/index.js',
      instances: 1,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 5001
      },
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      max_memory_restart: '512M'
    },

    // Projeto 3: API
    {
      name: 'projeto3-api',
      cwd: '/home/buscadorpxt/projeto3',
      script: './dist/server.js',
      instances: 1,
      env: {
        NODE_ENV: 'production',
        PORT: 5002
      },
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      max_memory_restart: '512M'
    }
  ]
};
```

```bash
# Iniciar todos os projetos de uma vez
pm2 start ecosystem.config.js

# Ver status
pm2 status

# Resultado:
# ┌─────┬──────────────┬─────────┬─────────┬──────────┐
# │ id  │ name         │ status  │ cpu     │ memory   │
# ├─────┼──────────────┼─────────┼─────────┼──────────┤
# │ 0   │ buscadorpxt  │ online  │ 15%     │ 180 MB   │
# │ 1   │ buscadorpxt  │ online  │ 12%     │ 175 MB   │
# │ 2   │ projeto2     │ online  │ 5%      │ 80 MB    │
# │ 3   │ projeto3-api │ online  │ 3%      │ 60 MB    │
# └─────┴──────────────┴─────────┴─────────┴──────────┘
```

### 4.3 Nginx - Configuração Completa Multi-Domínio

#### **Arquivo 1: Buscador PXT**
```nginx
# /etc/nginx/sites-available/buscadorpxt.com.br

# Redirecionar HTTP → HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name buscadorpxt.com.br www.buscadorpxt.com.br;
    return 301 https://$server_name$request_uri;
}

# HTTPS - Buscador PXT
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name buscadorpxt.com.br www.buscadorpxt.com.br;

    # SSL (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/buscadorpxt.com.br/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/buscadorpxt.com.br/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Security Headers
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Logs
    access_log /var/log/nginx/buscadorpxt-access.log;
    error_log /var/log/nginx/buscadorpxt-error.log;

    # Proxy para Node.js (porta 5000)
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket
    location /ws {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_read_timeout 7d;
    }
}
```

#### **Arquivo 2: Projeto 2**
```nginx
# /etc/nginx/sites-available/projeto2.com

server {
    listen 80;
    server_name projeto2.com www.projeto2.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name projeto2.com www.projeto2.com;

    ssl_certificate /etc/letsencrypt/live/projeto2.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/projeto2.com/privkey.pem;

    access_log /var/log/nginx/projeto2-access.log;
    error_log /var/log/nginx/projeto2-error.log;

    # Proxy para porta 5001
    location / {
        proxy_pass http://localhost:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

#### **Arquivo 3: API (Projeto 3)**
```nginx
# /etc/nginx/sites-available/api.meuservico.com

server {
    listen 80;
    server_name api.meuservico.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.meuservico.com;

    ssl_certificate /etc/letsencrypt/live/api.meuservico.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.meuservico.com/privkey.pem;

    access_log /var/log/nginx/api-meuservico-access.log;
    error_log /var/log/nginx/api-meuservico-error.log;

    # Rate limiting para API
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
    limit_req zone=api_limit burst=20 nodelay;

    # Proxy para porta 5002
    location / {
        proxy_pass http://localhost:5002;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 4.4 Ativar Todos os Sites

```bash
# Criar symlinks
sudo ln -s /etc/nginx/sites-available/buscadorpxt.com.br /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/projeto2.com /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/api.meuservico.com /etc/nginx/sites-enabled/

# Testar configuração
sudo nginx -t

# Recarregar Nginx
sudo systemctl reload nginx
```

### 4.5 SSL para Todos os Domínios

```bash
# Instalar Certbot (se ainda não instalou)
sudo apt install -y certbot python3-certbot-nginx

# Obter SSL para CADA domínio
sudo certbot --nginx -d buscadorpxt.com.br -d www.buscadorpxt.com.br
sudo certbot --nginx -d projeto2.com -d www.projeto2.com
sudo certbot --nginx -d api.meuservico.com

# Certbot atualiza automaticamente a configuração do Nginx
# e configura renovação automática via cron

# Testar renovação
sudo certbot renew --dry-run
```

**Custo:** $0 (Let's Encrypt é grátis para TODOS os domínios!)

---

## 5. ESTRATÉGIA DE MIGRAÇÃO ZERO-DOWNTIME

### 5.1 Overview da Estratégia

```
Objetivo: Migrar sem que nenhum usuário perceba ou tenha downtime

Método: Blue-Green Deployment
- Blue: Replit (atual, em produção)
- Green: VPS (novo, em teste)
- Swap: Trocar DNS quando VPS estiver 100% testado
```

### 5.2 Passo a Passo Zero-Downtime

#### **FASE 1: Preparação (Sem Impacto)**

```bash
# 1. Comprar VPS
# 2. Configurar servidor (SSH, Node.js, PM2, Nginx, etc)
# 3. Clonar projeto na VPS
# 4. Configurar .env com MESMAS variáveis do Replit
# 5. Fazer build: npm run build
# 6. NÃO apontar DNS ainda (VPS está offline para usuários)
```

#### **FASE 2: Deploy na VPS (Paralelo ao Replit)**

```bash
# 1. Iniciar aplicação na VPS
pm2 start ecosystem.config.js

# 2. Testar via IP da VPS
curl http://123.45.67.89:5000
# Ou acessar pelo navegador: http://123.45.67.89:5000

# 3. Configurar Nginx (ainda sem domínio real)
# Criar config temporária para testar via IP

# 4. Obter SSL temporário (opcional)
# Ou testar sem SSL por enquanto
```

#### **FASE 3: Testes Completos na VPS**

```bash
# Checklist de Testes (VPS via IP):
✅ Login/Cadastro funciona
✅ Dashboard carrega
✅ Produtos aparecem corretamente
✅ WebSocket conecta (Network tab do Chrome)
✅ Sincronização Google Sheets funciona
✅ Banco de dados (Neon) conecta corretamente
✅ Firebase Auth funciona
✅ Stripe checkout funciona (usar modo teste)
✅ Performance é boa (Chrome DevTools)
✅ Logs do PM2 sem erros críticos

Se TUDO estiver OK, prosseguir para Fase 4
```

#### **FASE 4: Configurar Webhooks (Dual Mode)**

Atualizar webhooks para chamar AMBOS os servidores (Replit + VPS) temporariamente:

```javascript
// Google Apps Script (dual webhook)
function onEdit(e) {
  const webhookReplit = 'https://...-replit.dev/api/webhook/google-sheets';
  const webhookVPS = 'https://buscadorpxt.com.br/api/webhook/google-sheets'; // Já com domínio

  const payload = { /* ... */ };

  // Chamar ambos
  UrlFetchApp.fetch(webhookReplit, { method: 'POST', payload: JSON.stringify(payload) });
  UrlFetchApp.fetch(webhookVPS, { method: 'POST', payload: JSON.stringify(payload) });
}
```

**Propósito:** Durante a transição, ambos os servidores recebem eventos. Após confirmação que VPS funciona, remover Replit.

#### **FASE 5: Configurar DNS (Ainda Sem Impacto)**

```
# 1. Acessar painel do registro.br (ou onde seu domínio está registrado)

# 2. Adicionar registro A TEMPORÁRIO com nome diferente:
Nome: test
Tipo: A
Valor: 123.45.67.89 (IP da VPS)
TTL: 300 (5 minutos)

# Isso cria: test.buscadorpxt.com.br → VPS

# 3. Aguardar propagação DNS (5-15 minutos)

# 4. Testar: https://test.buscadorpxt.com.br
# Deve funcionar PERFEITAMENTE

# 5. Se OK, prosseguir. Se não, corrigir antes de mudar DNS principal.
```

#### **FASE 6: Swap DNS (MOMENTO DA MIGRAÇÃO)**

```
Horário Recomendado: Madrugada (3h-5h) ou domingo à noite
Motivo: Menos usuários online, menor impacto

1. Atualizar DNS:
   Nome: @ (raiz)
   Tipo: A
   Valor: 123.45.67.89 (IP da VPS)
   TTL: 300 (5 minutos para rollback rápido se necessário)

2. Atualizar DNS www:
   Nome: www
   Tipo: CNAME
   Valor: buscadorpxt.com.br
   TTL: 300

3. Aguardar propagação (5-30 minutos)

4. Testar:
   curl -I https://buscadorpxt.com.br
   # Deve retornar da VPS

5. Monitorar logs:
   pm2 logs buscadorpxt --lines 100
   # Verificar se requests estão chegando
```

#### **FASE 7: Monitoramento Pós-Migração**

```bash
# Primeiras 2 horas após swap:
- Verificar logs a cada 15 minutos
- Monitorar CPU/RAM: pm2 monit
- Testar funcionalidades críticas
- Verificar se webhooks funcionam
- Checar se WebSocket conecta
- Responder a qualquer erro imediatamente

# Primeiras 24 horas:
- Monitorar a cada 2-4 horas
- Verificar métricas de uso
- Garantir que SSL está funcionando
- Confirmar que cache funciona

# Primeiros 7 dias:
- Monitoramento diário
- Backup de dados (se relevante)
- Ajustar recursos se necessário (CPU, RAM)
```

#### **FASE 8: Rollback (Se Necessário)**

```
Se algo der MUITO errado:

1. Reverter DNS:
   Nome: @
   Valor: [IP-ANTIGO-DO-REPLIT]
   TTL: 60 (1 minuto)

2. Aguardar 5-10 minutos

3. Usuários voltam para Replit

4. Corrigir problema na VPS

5. Tentar swap novamente
```

### 5.3 Checklist de Migração

```
PREPARAÇÃO:
□ VPS comprada e acessível via SSH
□ Node.js 20, PM2, Nginx instalados
□ Projeto clonado e build realizado
□ .env configurado com TODAS as variáveis
□ Testes via IP da VPS: TUDO funcionando
□ SSL configurado (Let's Encrypt)
□ Firewall configurado (UFW)

PRÉ-MIGRAÇÃO:
□ Backup completo do Replit (código + .env)
□ Documentação de rollback pronta
□ Horário de migração definido (baixa demanda)
□ Webhooks configurados em dual mode
□ DNS test subdomain testado e OK

MIGRAÇÃO:
□ Atualizar DNS @ para IP da VPS
□ Atualizar DNS www para CNAME
□ Aguardar propagação (15-30 min)
□ Testar domínio principal
□ Verificar logs da VPS

PÓS-MIGRAÇÃO:
□ Monitorar por 2 horas contínuas
□ Testar todas as funcionalidades críticas
□ Confirmar webhooks funcionando
□ Confirmar WebSocket conectando
□ Atualizar webhooks para modo single (remover Replit)
□ TTL do DNS aumentado para 3600 (1 hora)
□ Desligar Replit (economizar $)
□ Documentar qualquer problema encontrado
```

### 5.4 Tempo de Downtime Esperado

```
Cenário Ideal (Tudo funciona):
- Downtime DNS: 0-5 minutos (durante propagação)
- Downtime real para usuários: 0 segundos*

*Se você configurar dual webhooks e testar bem antes

Cenário Realista:
- Downtime: 5-15 minutos (durante ajustes finais)
- Alguns usuários podem ter cache DNS antigo por até 1 hora

Cenário Pior (Algo dá errado):
- Rollback: 10-20 minutos para reverter DNS
- Downtime total: 30-60 minutos (com rollback)
```

---

## 6. ROI E BREAK-EVEN

### 6.1 Análise Financeira Completa

#### **Cenário: Migrar 1 Projeto (Buscador PXT)**

```
Investimento Inicial:
- VPS Hostinger 3: $12.99/mês ($155.88/ano)
- Domínio .com.br: $15/ano (renovação)
- Seu tempo de setup: 10 horas × $50/hora = $500

TOTAL ANO 1: $670.88

Custo Atual (Replit otimizado):
- $69.78/mês × 12 = $837.36/ano

ECONOMIA ANO 1: $166.48
ECONOMIA A PARTIR DO ANO 2: $681.48/ano (sem custo de setup)
```

#### **Cenário: Migrar 3 Projetos (Buscador PXT + 2 Outros)**

```
Investimento Inicial:
- VPS Hostinger 3: $155.88/ano
- 3 Domínios: $45/ano
- Seu tempo de setup: 12 horas × $50/hora = $600

TOTAL ANO 1: $800.88

Custo Atual (3 projetos no Replit):
- $69.78 × 3 × 12 = $2.512.08/ano

ECONOMIA ANO 1: $1.711.20
ECONOMIA A PARTIR DO ANO 2: $2.311.20/ano
```

### 6.2 Break-Even Point

```
Projeto Único:
- Break-even: 8,8 meses
- Positivo a partir do mês 9

Múltiplos Projetos (3):
- Break-even: 4,2 meses
- Positivo a partir do mês 5
```

### 6.3 Projeção 5 Anos (3 Projetos)

```
Ano | Replit (3 proj) | VPS Hostinger 3 | Economia Acumulada
----|-----------------|-----------------|--------------------
1   | $2.512          | $801            | $1.711
2   | $2.512          | $201            | $3.622
3   | $2.512          | $201            | $5.533
4   | $2.512          | $201            | $7.444
5   | $2.512          | $201            | $9.355

ECONOMIA TOTAL 5 ANOS: $9.355
```

---

## 7. RECOMENDAÇÃO FINAL

### 7.1 Para Seu Caso Específico

Com base em:
- ✅ Você já tem domínio (buscadorpxt.com.br)
- ✅ Projeto em produção com usuários reais
- ✅ Custo atual de $69.78/mês (após otimização)
- ✅ Possibilidade de múltiplos projetos futuros
- ✅ Motivação principal: reduzir custos

**RECOMENDAÇÃO: Migrar para Hostinger VPS 3 ($12.99/mês)**

### 7.2 Razões

```
1. Economia de 81% ($69.78 → $12.99/mês)
2. Permite hospedar 3-5 projetos no futuro (sem custo adicional)
3. Recursos suficientes (3 vCPU, 12 GB RAM)
4. Custo fixo e previsível
5. Controle total da infraestrutura
6. ROI positivo em 9 meses
```

### 7.3 Plano de Ação

```
SEMANA 1:
- Comprar VPS Hostinger 3
- Configurar servidor (Node.js, PM2, Nginx, SSL)
- Clonar projeto
- Testes via IP

SEMANA 2:
- Testes completos
- Configurar webhooks dual mode
- DNS test subdomain
- Validação final

SEMANA 3:
- Escolher horário de migração (madrugada)
- Swap DNS
- Monitoramento intensivo
- Ajustes finais

SEMANA 4:
- Confirmar estabilidade
- Remover Replit da configuração
- Desligar Replit (economizar $)
- Documentar lições aprendidas
```

### 7.4 Respostas Diretas às Suas Perguntas

**1. Posso rodar dois projetos simultaneamente em domínios diferentes?**
✅ **SIM!** A VPS pode hospedar MÚLTIPLOS projetos com domínios diferentes. Basta configurar virtual hosts no Nginx e usar portas diferentes para cada projeto.

**2. Se eu apontar o domínio buscadorpxt.com.br para a VPS e manter o banco de dados (Neon), alguém vai perceber a mudança?**
✅ **NÃO!** Será 100% transparente. Mesmo banco de dados, mesma URL, mesmas funcionalidades. Apenas a infraestrutura muda (Replit → VPS).

**3. Migração vale a pena financeiramente?**
✅ **SIM!** Economia de 81% ($837/ano → $156/ano). ROI positivo em 9 meses. Se hospedar múltiplos projetos, economia chega a 94%.

---

## 8. PRÓXIMOS PASSOS IMEDIATOS

```
1. Decidir: Migrar agora ou esperar?
   → Se decidir migrar, escolher provedor (Hostinger VPS 3 recomendado)

2. Comprar VPS e domínio (se necessário)

3. Seguir o guia de migração zero-downtime (seção 5.2)

4. Executar checklist de migração (seção 5.3)

5. Monitorar e ajustar conforme necessário

6. Documentar lições aprendidas para futuros projetos
```

---

**Dúvidas? Precisa de ajuda com alguma etapa específica?**

Este guia cobre:
- ✅ Múltiplos projetos na VPS
- ✅ Migração transparente (zero impacto)
- ✅ Comparação detalhada de custos
- ✅ Configuração completa Nginx multi-domínio
- ✅ Estratégia zero-downtime
- ✅ ROI e break-even

Se precisar de mais detalhes em qualquer seção, é só pedir!

---

*Relatório criado por: Claude Code (Ultrathink Mode)*
*Data: 14 de Novembro de 2025*
*Complemento à: ANALISE_MIGRACAO_VPS.md*
