# 🌐 Guia: Configurar Domínio buscadorpxt.com.br

**IP da VPS:** 31.97.171.93
**Sistema:** Ubuntu
**Porta da aplicação:** 5000

---

## 📋 CHECKLIST COMPLETO

### ✅ Etapa 1: Configurar DNS (VOCÊ PRECISA FAZER MANUALMENTE)

Acesse o painel do registrador do domínio (Registro.br) e adicione:

```
Tipo: A
Nome: @
Valor: 31.97.171.93
TTL: 3600

Tipo: A
Nome: www
Valor: 31.97.171.93
TTL: 3600
```

**Como verificar se propagou:**
```bash
dig buscadorpxt.com.br +short
# Deve retornar: 31.97.171.93
```

**Aguarde 5min a 4h para propagação completa.**

---

### ✅ Etapa 2: Configurar Nginx (AUTOMÁTICO)

```bash
cd /home/buscadorpxt/buscadorpxt
sudo bash setup-nginx.sh
```

**O que este script faz:**
- Instala Nginx
- Configura reverse proxy da porta 5000
- Suporte a WebSocket
- Ativa o site

**Verificar se funcionou:**
```bash
sudo systemctl status nginx
curl -I http://31.97.171.93  # Deve retornar 200 OK
```

---

### ✅ Etapa 3: Configurar SSL/HTTPS (AUTOMÁTICO)

⚠️ **IMPORTANTE:** Só execute após DNS propagado!

```bash
cd /home/buscadorpxt/buscadorpxt
sudo bash setup-ssl.sh
```

**O que este script faz:**
- Verifica se DNS propagou
- Instala Certbot
- Obtém certificado SSL gratuito
- Configura renovação automática
- Força redirecionamento HTTP → HTTPS

**Email necessário:** Será solicitado durante a execução (use admin@buscadorpxt.com.br)

---

### ✅ Etapa 4: Configurar Firewall (AUTOMÁTICO)

```bash
cd /home/buscadorpxt/buscadorpxt
sudo bash setup-firewall.sh
```

**O que este script faz:**
- Configura UFW (firewall)
- Abre portas: 22 (SSH), 80 (HTTP), 443 (HTTPS)
- Bloqueia todo resto

---

### ✅ Etapa 5: Atualizar Configurações da Aplicação

Edite o arquivo `.env`:

```bash
nano /home/buscadorpxt/buscadorpxt/.env
```

Adicione/atualize estas linhas:

```env
# Domínio
VITE_FIREBASE_AUTH_DOMAIN=buscadorpxt.com.br

# CORS (adicionar se não existir)
ALLOWED_ORIGINS=https://buscadorpxt.com.br,https://www.buscadorpxt.com.br

# URL base (se usar)
VITE_API_URL=https://buscadorpxt.com.br
```

Rebuild e restart:

```bash
cd /home/buscadorpxt/buscadorpxt
./build-production.sh
pm2 restart buscadorpxt
pm2 save
```

---

### ✅ Etapa 6: Testar Tudo

```bash
# 1. DNS
dig buscadorpxt.com.br +short
# Esperado: 31.97.171.93

# 2. HTTP → HTTPS redirect
curl -I http://buscadorpxt.com.br
# Esperado: 301 Moved Permanently

# 3. HTTPS funcional
curl -I https://buscadorpxt.com.br
# Esperado: 200 OK

# 4. WWW → não-WWW redirect
curl -I https://www.buscadorpxt.com.br
# Esperado: 301 redirect para https://buscadorpxt.com.br

# 5. Serviços ativos
sudo systemctl status nginx
pm2 status
```

---

## 🚨 TROUBLESHOOTING

### Problema: DNS não propaga

```bash
# Verificar em múltiplos servidores DNS
dig @8.8.8.8 buscadorpxt.com.br +short
dig @1.1.1.1 buscadorpxt.com.br +short

# Verificar propagação mundial
# Acesse: https://dnschecker.org
```

### Problema: Nginx retorna 502 Bad Gateway

```bash
# Verificar se app está rodando
pm2 status
curl http://localhost:5000  # Deve funcionar

# Ver logs do Nginx
sudo tail -f /var/log/nginx/buscadorpxt_error.log

# Reiniciar serviços
pm2 restart buscadorpxt
sudo systemctl restart nginx
```

### Problema: SSL não funciona

```bash
# Verificar DNS antes
dig buscadorpxt.com.br +short

# Tentar manualmente
sudo certbot --nginx -d buscadorpxt.com.br -d www.buscadorpxt.com.br

# Ver logs
sudo journalctl -u certbot -n 50
```

### Problema: Firewall bloqueou SSH

```bash
# Se ainda tiver acesso, executar:
sudo ufw allow 22/tcp
sudo ufw reload

# Se perdeu acesso, use console do provedor VPS
```

---

## 📊 ORDEM DE EXECUÇÃO RECOMENDADA

1. **Configure DNS no registrador** → Aguarde propagação (30min a 4h)
2. **Execute `setup-nginx.sh`** → Teste acesso via IP
3. **Execute `setup-ssl.sh`** → Após DNS propagado
4. **Execute `setup-firewall.sh`** → Proteger servidor
5. **Atualize `.env` e rebuild** → Configurar aplicação
6. **Teste tudo** → Verificar funcionamento completo

---

## 🎯 EXECUÇÃO RÁPIDA (APÓS DNS CONFIGURADO)

```bash
cd /home/buscadorpxt/buscadorpxt

# Executar tudo em sequência
sudo bash setup-nginx.sh && \
sudo bash setup-ssl.sh && \
sudo bash setup-firewall.sh && \
./build-production.sh && \
pm2 restart buscadorpxt

# Verificar status
pm2 status
sudo systemctl status nginx
```

---

## ✅ CHECKLIST FINAL

- [ ] DNS configurado no registrador
- [ ] DNS propagado (dig retorna 31.97.171.93)
- [ ] Nginx instalado e funcionando
- [ ] SSL/HTTPS configurado
- [ ] Firewall ativado
- [ ] .env atualizado
- [ ] App rebuilded e restartado
- [ ] Site acessível em https://buscadorpxt.com.br
- [ ] Redirecionamentos funcionando (HTTP→HTTPS, WWW→não-WWW)
- [ ] WebSockets funcionando

---

**Pronto! Seu domínio estará 100% configurado e seguro.** 🚀
