# 🚀 MIGRAÇÃO REPLIT → HOSTINGER VPS
## Buscador PXT - Guia Rápido

---

## 📦 ARQUIVOS CRIADOS PARA MIGRAÇÃO

Todos os arquivos necessários já foram criados e estão prontos:

### ✅ Configuração
```
.env.production            - Variáveis de ambiente (copiar para .env na VPS)
ecosystem.config.js        - Configuração PM2 (gerenciador de processos)
nginx-buscadorpxt.conf     - Configuração Nginx (proxy reverso + SSL)
```

### ✅ Scripts de Automação
```
vps-setup.sh              - Setup automático da VPS (Node, PM2, Nginx, etc)
```

### ✅ Documentação
```
PLANO_MIGRACAO_HOSTINGER.md  - Plano completo passo a passo (detalhado)
CHECKLIST_MIGRACAO.md        - Checklist visual (imprimir e marcar)
README_MIGRACAO.md           - Este arquivo (resumo rápido)
```

### ✅ Análises Prévias
```
ANALISE_MIGRACAO_VPS.md                  - Análise técnica completa
MIGRACAO_MULTIPLOS_PROJETOS_CUSTOS.md   - Análise de custos e múltiplos projetos
CUSTOS.md                                - Situação atual de custos
```

---

## ⚡ INÍCIO RÁPIDO (5 Passos)

### 1. Comprar VPS Hostinger

```
URL: https://www.hostinger.com.br/servidor-vps
Plano Recomendado: VPS 3 ($12.99/mês)
- 3 vCPUs
- 12 GB RAM
- 150 GB SSD
- Ubuntu 22.04 LTS

Anotar:
- IP da VPS: _______________
- Senha root: _______________
```

### 2. Conectar e Configurar VPS

```bash
# Do seu Mac, conectar via SSH:
ssh root@SEU-IP-VPS

# Upload do script de setup:
scp vps-setup.sh root@SEU-IP-VPS:/root/

# Executar setup automático (na VPS):
chmod +x /root/vps-setup.sh
sudo ./vps-setup.sh

# Aguardar 5-10 minutos (instala tudo automaticamente)
```

### 3. Deploy do Projeto

```bash
# Trocar para usuário buscadorpxt (na VPS):
su - buscadorpxt

# Clonar projeto:
git clone https://github.com/seu-usuario/buscadorpxt.git buscadorpxt
cd buscadorpxt

# Configurar .env:
cp .env.production .env
nano .env  # Atualizar VITE_WSS_URL e CORS_ORIGIN

# Instalar e buildar:
npm install
npm run build

# Iniciar com PM2:
mkdir logs
pm2 start ecosystem.config.js
pm2 save

# Testar:
curl http://localhost:5000  # Deve retornar HTML
```

### 4. Configurar Nginx + SSL

```bash
# Voltar para root:
exit

# Copiar config Nginx:
sudo cp /home/buscadorpxt/buscadorpxt/nginx-buscadorpxt.conf /etc/nginx/sites-available/buscadorpxt.com.br
sudo ln -s /etc/nginx/sites-available/buscadorpxt.com.br /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Obter SSL (Let's Encrypt):
sudo certbot --nginx -d buscadorpxt.com.br -d www.buscadorpxt.com.br

# Testar:
curl https://SEU-IP-VPS  # Deve funcionar via HTTPS
```

### 5. Migrar DNS

```bash
# Acessar painel DNS do domínio
# Atualizar registro A:
Tipo: A
Nome: @
Valor: SEU-IP-VPS
TTL: 300

# Aguardar 5-30 minutos
# Testar:
https://buscadorpxt.com.br

# Atualizar webhooks (Google Sheets, Stripe, ASAAS)
# Ver detalhes em PLANO_MIGRACAO_HOSTINGER.md
```

---

## 💰 ECONOMIA ESPERADA

```
Custo Atual (Replit):     $69.78/mês  ($837/ano)
Custo VPS Hostinger 3:    $12.99/mês  ($156/ano)

Economia Anual:           $681/ano (81% de redução!)
```

Se hospedar 3 projetos na mesma VPS:
```
Replit (3 projetos):      $2.512/ano
VPS (3 projetos):         $156/ano

Economia Anual:           $2.356/ano (94% de redução!)
```

---

## ⏱️ TEMPO ESTIMADO

```
Preparação:          2-3 horas
Setup VPS:           1-2 horas
Deploy:              2-3 horas
Nginx + SSL:         1 hora
Migração DNS:        30 minutos
Monitoramento:       2 horas

TOTAL:               6-9 horas (pode ser dividido em dias)
```

---

## 🔍 O QUE MUDA? (Para Usuários: NADA)

### ✅ Mantém EXATAMENTE Igual
- URL: buscadorpxt.com.br (mesma)
- Banco de Dados: Neon PostgreSQL (mesma conexão)
- TODOS os dados, usuários, senhas
- Funcionalidades 100% iguais
- Firebase, Stripe, Google Sheets
- Performance igual ou melhor

### ⚙️ Muda Apenas Infraestrutura (Backend)
- Servidor: Replit → Hostinger VPS
- Você gerencia o servidor
- Custo muito menor
- Controle total

**Para o usuário final:** Totalmente transparente! ✅

---

## 📚 DOCUMENTAÇÃO COMPLETA

Para entender cada passo em detalhes:

### 1. **PLANO_MIGRACAO_HOSTINGER.md**
- Guia completo passo a passo
- Troubleshooting
- Plano de rollback
- **Leia ANTES de migrar**

### 2. **CHECKLIST_MIGRACAO.md**
- Checklist visual
- Marcar conforme avança
- **Imprima e use durante migração**

### 3. **ANALISE_MIGRACAO_VPS.md**
- Análise técnica completa
- Requisitos de hardware
- Comparação de provedores
- **Para entender a viabilidade**

### 4. **MIGRACAO_MULTIPLOS_PROJETOS_CUSTOS.md**
- Hospedar múltiplos projetos
- Análise de custos detalhada
- Migração transparente
- **Para planejar futuro**

---

## 🆘 AJUDA RÁPIDA

### Testes Básicos

```bash
# VPS acessível?
ping SEU-IP-VPS

# SSH funcionando?
ssh root@SEU-IP-VPS

# App rodando?
pm2 status

# Nginx funcionando?
sudo systemctl status nginx

# Logs da aplicação:
pm2 logs buscadorpxt

# Logs do Nginx:
sudo tail -f /var/log/nginx/buscadorpxt-error.log
```

### Comandos Úteis PM2

```bash
pm2 status            # Ver status
pm2 logs buscadorpxt  # Ver logs
pm2 monit            # Monitorar CPU/RAM
pm2 restart buscadorpxt  # Reiniciar
pm2 reload buscadorpxt   # Reload (zero-downtime)
```

### Rollback Rápido

Se algo der muito errado:

```bash
1. Acessar painel DNS
2. Trocar IP de volta para Replit
3. Aguardar 5-15 minutos
4. Verificar: https://buscadorpxt.com.br
5. Analisar problema na VPS
6. Tentar novamente
```

---

## ✅ CHECKLIST ULTRA-RÁPIDO

```
□ VPS comprada
□ SSH acessível
□ vps-setup.sh executado
□ Projeto clonado
□ .env configurado
□ npm install + build
□ PM2 rodando (status: online)
□ Nginx configurado
□ SSL obtido (Certbot)
□ DNS atualizado
□ Webhooks atualizados
□ Tudo testado
□ Replit desligado (após 7 dias)
```

---

## 🎯 PRÓXIMOS PASSOS

### Agora (Preparação)
1. Ler **PLANO_MIGRACAO_HOSTINGER.md** completo
2. Imprimir **CHECKLIST_MIGRACAO.md**
3. Fazer backup do código
4. Escolher data/horário de migração

### Dia da Migração
1. Comprar VPS Hostinger
2. Seguir **PLANO_MIGRACAO_HOSTINGER.md**
3. Marcar **CHECKLIST_MIGRACAO.md**
4. Monitorar 2 horas após migração

### Pós-Migração (7 dias)
1. Verificar estabilidade
2. Configurar backup automático
3. Configurar monitoramento
4. Desligar Replit
5. **Economizar $681/ano!** 🎉

---

## 💡 DICAS IMPORTANTES

1. **Não tenha pressa** - Pode dividir em dias
2. **Teste TUDO via IP** antes de migrar DNS
3. **Escolha horário de baixa demanda** (madrugada/domingo)
4. **Mantenha Replit ativo** durante transição
5. **Rollback é fácil** - Não tenha medo

---

## 📞 SUPORTE

```
Hostinger: https://www.hostinger.com.br/contato
Firebase: https://console.firebase.google.com
Stripe: https://dashboard.stripe.com
Neon (DB): https://status.neon.tech
```

---

## 🎉 RESULTADO FINAL

Após migração bem-sucedida:

- ✅ Mesmo site, mesma URL
- ✅ Zero impacto para usuários
- ✅ Economia de $681/ano
- ✅ Controle total da infraestrutura
- ✅ Pode hospedar mais projetos na mesma VPS
- ✅ Performance igual ou melhor
- ✅ Custo fixo e previsível

**Boa sorte! Você consegue! 🚀**

---

*Criado por: Claude Code*
*Data: 14 de Novembro de 2025*
*Versão: 1.0*
