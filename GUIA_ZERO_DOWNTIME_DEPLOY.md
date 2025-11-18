# 🚀 Guia de Deploy com Zero-Downtime

## Por que tinha downtime antes?

O comando `pm2 restart` **mata todas as instâncias** de uma vez antes de iniciar as novas, causando indisponibilidade de 30-60 segundos.

## Como funciona agora?

O **`pm2 reload`** faz o seguinte:
1. Mantém a **Instância 1** rodando
2. Para e reinicia a **Instância 2** com o código novo
3. Espera a Instância 2 estar pronta
4. Agora para e reinicia a **Instância 1**
5. Resultado: **sempre tem pelo menos 1 instância respondendo!**

---

## 🎯 Como fazer deploy agora

### Método 1: Script automatizado (RECOMENDADO)

```bash
./deploy.sh
```

Pronto! O script faz tudo:
- Build do frontend e backend
- Reload com zero-downtime
- Verificação de status

### Método 2: Manual

```bash
# 1. Build
./build-production.sh

# 2. Reload (zero-downtime)
pm2 reload ecosystem.config.js --env production
```

---

## 📋 Primeira vez usando o ecosystem.config.js

Se você ainda não migrou para o ecosystem.config.js, faça uma vez:

```bash
# 1. Parar instâncias antigas
pm2 stop buscadorpxt
pm2 delete buscadorpxt

# 2. Iniciar com o novo arquivo
pm2 start ecosystem.config.js --env production

# 3. Salvar configuração
pm2 save

# 4. Configurar PM2 para iniciar no boot
pm2 startup
# (copie e execute o comando que aparecer)
```

---

## 🔍 Comandos úteis

```bash
# Ver status das instâncias
pm2 status

# Ver logs em tempo real
pm2 logs buscadorpxt

# Ver logs dos últimos 100 eventos
pm2 logs buscadorpxt --lines 100

# Monitorar CPU e memória
pm2 monit

# Ver detalhes de uma instância
pm2 show buscadorpxt

# Recarregar configuração do ecosystem.config.js
pm2 reload ecosystem.config.js --env production

# Reiniciar (com downtime - evite usar)
pm2 restart buscadorpxt
```

---

## 🎛️ Configuração do Cluster

O arquivo `ecosystem.config.js` está configurado com:
- **2 instâncias** em cluster mode
- **500MB** de limite de memória por instância
- **Graceful shutdown** configurado
- **Logs** em `./logs/`

Para aumentar o número de instâncias:

```javascript
// ecosystem.config.js
instances: 4,  // ou 'max' para usar todos os CPUs
```

---

## 🆘 Troubleshooting

### Deploy falha com erro de "not ready"

Aumente o timeout no `ecosystem.config.js`:
```javascript
listen_timeout: 15000,  // 15 segundos
```

### Instância reiniciando em loop

Verifique os logs:
```bash
pm2 logs buscadorpxt --err --lines 50
```

Possíveis causas:
- Erro no código
- Variável de ambiente faltando
- Porta já em uso

### Verificar se está usando reload corretamente

```bash
# Bom (zero-downtime)
pm2 reload buscadorpxt

# Ruim (com downtime)
pm2 restart buscadorpxt
```

---

## 📊 Comparação

| Comando | Downtime | Uso |
|---------|----------|-----|
| `pm2 restart` | ❌ SIM (30-60s) | Evitar |
| `pm2 reload` | ✅ NÃO (0s) | Usar sempre |
| `./deploy.sh` | ✅ NÃO (0s) | Recomendado |

---

## ✅ Checklist de Deploy

- [ ] Código testado localmente
- [ ] Commit e push no git
- [ ] Execute `./deploy.sh`
- [ ] Verifique logs: `pm2 logs buscadorpxt --lines 20`
- [ ] Teste o site em produção
- [ ] Monitore por alguns minutos: `pm2 monit`

---

## 🔐 Segurança

O `ecosystem.config.js` **não deve** conter variáveis sensíveis (senhas, tokens).
Essas devem estar no arquivo `.env` que é carregado automaticamente pela aplicação.

As variáveis do Firebase no script de build são públicas (usadas no frontend).

---

## 💡 Dica Extra: Health Check

Para garantir ainda mais confiabilidade, você pode adicionar um health check:

```bash
# Verificar se a aplicação está respondendo
curl -f http://localhost:5000/api/health || echo "Aplicação não está respondendo!"
```

Se quiser, posso criar um endpoint `/api/health` no backend.
