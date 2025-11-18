# 🔧 FIX: Token do Firebase Expirado - Problema de Login

**Data:** 17/11/2025 - 21:18
**Status:** 🔍 PROBLEMA IDENTIFICADO
**Prioridade:** 🔴 CRÍTICA

---

## 🐛 PROBLEMA

**Sintoma:** Usuários não conseguem fazer login - erro 403/401 em `/api/user/profile`

**Causa Raiz:** Token do Firebase armazenado no navegador está **expirado** e não está sendo renovado automaticamente.

**Evidência dos Logs:**
```
Firebase token verification failed: Error: Invalid or expired token
GET /api/user/profile 401 - {"message":"Invalid Firebase token","code":"FIREBASE_TOKEN_INVALID"}
```

---

## 🔍 ANÁLISE TÉCNICA

### **Fluxo Problemático:**

1. ✅ Usuário já está autenticado (token no localStorage)
2. ✅ Frontend carrega e detecta usuário autenticado
3. ❌ Frontend envia token EXPIRADO para /api/user/profile
4. ❌ Backend rejeita: "Invalid or expired token"
5. ❌ Navegador mostra 403 Forbidden (pode ser proxy convertendo 401→403)

### **Por que não renova automaticamente?**

O Firebase SDK deveria renovar o token automaticamente, MAS:
- Token pode estar corrompido no localStorage
- Processo de renovação pode estar falhando silenciosamente
- Deploy pode ter invalidado tokens antigos

---

## ✅ SOLUÇÃO IMEDIATA (USUÁRIO)

### **Opção 1: Limpar Cache do Navegador**

1. Pressione `Ctrl + Shift + Del` (Windows) ou `Cmd + Shift + Del` (Mac)
2. Selecione:
   - ✅ Cookies e dados de sites
   - ✅ Imagens e arquivos em cache
   - ✅ Dados hospedados de aplicativos
3. Período: "Últimas 24 horas"
4. Clique em "Limpar dados"
5. Recarregue a página (F5)

### **Opção 2: Modo Anônimo (Teste Rápido)**

1. Abra janela anônima (`Ctrl + Shift + N`)
2. Acesse https://buscadorpxt.com.br/login
3. Faça login normalmente
4. **Se funcionar:** O problema é cache local

### **Opção 3: Console do Navegador (Avançado)**

1. Pressione `F12` para abrir DevTools
2. Vá na aba **Console**
3. Digite e execute:
```javascript
localStorage.clear();
sessionStorage.clear();
location.reload();
```

---

## 🔧 SOLUÇÃO TÉCNICA (BACKEND)

### **O que precisa ser feito:**

Adicionar lógica de renovação de token mais robusta ou forçar renovação quando token falha.

### **Opções:**

#### **Opção 1: Invalidar cache de autenticação (mais rápido)**

Limpar o cache de usuários no servidor para forçar revalidação:

```bash
# No servidor
pm2 restart buscadorpxt
```

Isso limpa o cache em memória (userCache no middleware).

#### **Opção 2: Melhorar tratamento de erro no frontend**

O frontend deveria detectar erro 401 e fazer refresh do token automaticamente.

**Arquivo:** `client/src/lib/api-client.ts` ou `client/src/hooks/use-auth.ts`

Adicionar interceptor:
```typescript
if (response.status === 401 && error.code === 'FIREBASE_TOKEN_INVALID') {
  // Forçar renovação de token
  const user = auth.currentUser;
  if (user) {
    await user.getIdToken(true); // force refresh
    // Retry request
  }
}
```

#### **Opção 3: Reduzir TTL do token (preventivo)**

Firebase tokens geralmente expiram em 1 hora. Podemos forçar renovação mais cedo.

---

## 📊 VERIFICAÇÃO

### **Como confirmar que o problema é token expirado:**

```bash
# Ver logs em tempo real
pm2 logs buscadorpxt | grep "Firebase token verification failed"

# Se aparecer "Invalid or expired token", confirma o problema
```

### **Teste após fix:**

1. Limpar cache do navegador
2. Fazer login
3. Deixar aberto por 65 minutos
4. Verificar se token é renovado automaticamente
5. Não deve dar erro 401/403

---

## 🚨 IMPACTO

### **Usuários Afetados:**
- ❌ Usuários com token antigo (pré-deploy)
- ❌ Usuários que ficaram muito tempo sem usar (~1 hora+)
- ✅ Novos logins funcionam normalmente

### **Workaround Temporário:**
Usuários devem limpar cache ou fazer logout/login.

---

## 💡 SOLUÇÃO DEFINITIVA

### **Implementar Token Refresh Automático**

**Arquivo:** `client/src/hooks/use-auth.ts` ou criar novo `client/src/lib/token-refresh.ts`

```typescript
// Renovar token automaticamente a cada 50 minutos
useEffect(() => {
  const refreshInterval = setInterval(async () => {
    const user = auth.currentUser;
    if (user) {
      try {
        await user.getIdToken(true); // force refresh
        console.log('🔄 Token refreshed successfully');
      } catch (error) {
        console.error('❌ Failed to refresh token:', error);
      }
    }
  }, 50 * 60 * 1000); // 50 minutos

  return () => clearInterval(refreshInterval);
}, []);
```

---

## 🎯 AÇÃO IMEDIATA RECOMENDADA

### **Para Resolver AGORA:**

1. **Reiniciar PM2** para limpar cache:
```bash
pm2 restart buscadorpxt
```

2. **Informar usuários** para limpar cache do navegador:
   - Chrome: Ctrl+Shift+Del → Limpar dados
   - Ou fazer logout/login novamente

3. **Monitorar logs** por 30 minutos:
```bash
pm2 logs buscadorpxt | grep -E "Firebase token verification failed|Invalid Firebase token"
```

Se ainda aparecer muitos erros, implementar fix definitivo no frontend.

---

## 📝 CHECKLIST

### **Imediato:**
- [ ] Reiniciar PM2 (limpar cache)
- [ ] Testar login em modo anônimo
- [ ] Confirmar que funciona após limpar cache

### **Curto Prazo (24h):**
- [ ] Implementar token refresh automático no frontend
- [ ] Adicionar interceptor para retry em 401
- [ ] Testar com token expirado

### **Monitoramento:**
- [ ] Verificar logs de erro de token
- [ ] Confirmar que usuários conseguem logar
- [ ] Validar que não há mais 401/403

---

## 🔍 DEBUG

### **Ver todos os erros de token:**
```bash
pm2 logs buscadorpxt --err | grep -A 3 "Firebase token"
```

### **Ver requests de profile:**
```bash
pm2 logs buscadorpxt | grep "user/profile"
```

### **Monitorar em tempo real:**
```bash
pm2 logs buscadorpxt --lines 100
```

---

**Status:** ⏳ AGUARDANDO FIX
**Próximo Passo:** Reiniciar PM2 e informar usuários para limpar cache
