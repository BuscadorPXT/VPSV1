# 🚀 Como Fazer Deploy SEM Tirar o Sistema do Ar

## TL;DR (Muito Rápido)

**ANTES:**
```bash
pm2 restart buscadorpxt  # ❌ 30-60s de downtime
```

**AGORA:**
```bash
./deploy.sh  # ✅ ZERO downtime
```

---

## 📋 Setup Inicial (FAZER UMA VEZ)

```bash
# 1. Parar instâncias antigas
pm2 stop buscadorpxt
pm2 delete buscadorpxt

# 2. Fazer build
./build-production.sh

# 3. Iniciar com nova configuração
pm2 start ecosystem.config.js --env production

# 4. Salvar
pm2 save

# 5. Auto-start no reboot
pm2 startup
# Execute o comando que aparecer
```

✅ **Pronto! Setup completo.**

---

## 🔄 Deploy do Dia a Dia

### Depois de fazer alterações no código:

```bash
./deploy.sh
```

Só isso! O script:
1. Faz build do frontend e backend
2. Faz reload **uma instância por vez**
3. Garante **zero downtime**

---

## 🧪 Testar se Está Funcionando

```bash
# Terminal 1: Monitorar requests (deixe rodando)
while true; do curl -s -o /dev/null -w "%{http_code}\n" http://localhost:5000/api/health; sleep 1; done

# Terminal 2: Fazer deploy
./deploy.sh

# No Terminal 1 você deve ver apenas 200 - SEM ERROS!
```

Ou use o script de teste:
```bash
./test-zero-downtime.sh
```

---

## 📊 O Que Mudou?

### Arquivo: `ecosystem.config.js` (NOVO)
Configuração do PM2 com cluster mode e graceful shutdown

### Arquivo: `deploy.sh` (NOVO)
Script automatizado de deploy com zero-downtime

### Arquivo: `server/index.ts` (MODIFICADO)
Adicionado:
- Graceful shutdown (fecha conexões suavemente)
- Notificação "ready" para PM2
- Endpoint `/api/health` para monitoramento

---

## ⚠️ IMPORTANTE

**NUNCA MAIS USE:**
```bash
pm2 restart buscadorpxt  # ❌ Causa downtime!
```

**SEMPRE USE:**
```bash
./deploy.sh              # ✅ Zero downtime
# ou
pm2 reload buscadorpxt   # ✅ Zero downtime
```

---

## 🆘 Problemas?

### Erro: "bind EADDRINUSE"
```bash
pm2 delete all
pm2 start ecosystem.config.js --env production
```

### Ver logs
```bash
pm2 logs buscadorpxt --lines 50
```

### Ver status
```bash
pm2 status
# Você deve ver 2 instâncias em "cluster_mode"
```

---

## 📝 Checklist

- [ ] Setup inicial feito uma vez
- [ ] Testei com `./test-zero-downtime.sh`
- [ ] Consigo ver 2 instâncias em `pm2 status`
- [ ] Deploy com `./deploy.sh` funcionou sem erros
- [ ] Endpoint `http://localhost:5000/api/health` responde

---

## 🎯 Resultado

| Métrica | Antes | Depois |
|---------|-------|--------|
| Downtime | 30-60s | **0s** |
| Usuários afetados | Todos | **Nenhum** |
| Complexidade | Alta | **1 comando** |

🎉 **Parabéns! Agora você tem deploy profissional com zero-downtime!**

---

## 📚 Documentação Completa

- `ZERO_DOWNTIME_SETUP.md` - Setup detalhado e explicações técnicas
- `GUIA_ZERO_DOWNTIME_DEPLOY.md` - Guia completo de uso
- `ecosystem.config.js` - Configuração do PM2
- `deploy.sh` - Script de deploy
- `test-zero-downtime.sh` - Script de teste
