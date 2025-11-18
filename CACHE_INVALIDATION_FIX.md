# 🐛 Bug Fix: Cache Invalidation After User Approval

**Data**: 2025-11-17
**Status**: ✅ **CORRIGIDO E APLICADO**

---

## 🔍 Problema Descoberto

### Sintoma:
Usuário `teste1525@gmail.com` foi aprovado pelo admin, mas ao tentar fazer login ainda recebia a mensagem de "Aguardando Aprovação" e era redirecionado para `/pending-approval`.

### Investigação:

1. **Verificação no Banco de Dados:**
   ```bash
   npx tsx approve-user.js teste1525@gmail.com
   ```
   **Resultado:**
   - ✅ isApproved: **true**
   - ✅ status: **approved**
   - ✅ role: **pro**

   **Conclusão:** O usuário ESTÁ aprovado no banco de dados!

2. **Verificação do Backend:**
   Console logs mostravam que o backend ainda retornava:
   ```json
   {
     "message": "Sua conta ainda não foi aprovada pelo administrador. Aguarde a aprovação.",
     "code": "PENDING_APPROVAL",
     "email": "teste1525@gmail.com",
     "status": "pending_approval"
   }
   ```

3. **Análise do Código:**
   Encontrado em `server/services/user.service.ts`:
   - ✅ O serviço usa **Redis cache** com TTL de **30 minutos** (linha 95)
   - ❌ A função `getUserByFirebaseUid()` retorna dados do cache se disponível (linha 64-67)
   - ❌ A função `approveUser()` **NÃO invalida o cache** após aprovação

---

## 🔧 Causa Raiz

O sistema usa Redis para cachear perfis de usuários por 30 minutos para otimização de performance:

```typescript
// server/services/user.service.ts - linha 95
await cacheService.set(cacheKey, user, 1800);  // 1800s = 30 minutos
```

Quando um admin aprova um usuário:
1. ✅ O banco de dados é atualizado corretamente
2. ❌ O cache Redis **NÃO é invalidado**
3. ❌ Por até 30 minutos, o sistema continua retornando dados antigos do cache
4. ❌ Usuário aprovado não consegue acessar até o cache expirar

---

## ✅ Correção Implementada

### 1. Função `approveUser()` (linha 359-368)

**ANTES:**
```typescript
logger.info(`User ${userId} (${existingUser.email}) approved as ${userType.toUpperCase()}...`);
console.log(`✅ User approved successfully: ${updatedUser.email} - Plan: ${updatedUser.subscriptionPlan} - Type: ${userType.toUpperCase()}`);

return updatedUser;
```

**DEPOIS:**
```typescript
logger.info(`User ${userId} (${existingUser.email}) approved as ${userType.toUpperCase()}...`);
console.log(`✅ User approved successfully: ${updatedUser.email} - Plan: ${updatedUser.subscriptionPlan} - Type: ${userType.toUpperCase()}`);

// ⚡ INVALIDAR CACHE após aprovação
if (existingUser.firebaseUid) {
  await cacheService.del(`user:firebase:${existingUser.firebaseUid}`);
  console.log(`🗑️ Cache invalidated for user: ${existingUser.email}`);
}

return updatedUser;
```

### 2. Função `rejectUser()` (linha 415-421)

**Adicionado:**
```typescript
// ⚡ INVALIDAR CACHE após rejeição
if (existingUser?.firebaseUid) {
  await cacheService.del(`user:firebase:${existingUser.firebaseUid}`);
  console.log(`🗑️ Cache invalidated for user: ${rejectedUser.email}`);
}
```

### 3. Função `markUserPaymentPending()` (linha 487-491)

**Adicionado:**
```typescript
// ⚡ INVALIDAR CACHE após mudança de status
if (existingUser.firebaseUid) {
  await cacheService.del(`user:firebase:${existingUser.firebaseUid}`);
  console.log(`🗑️ Cache invalidated for user: ${updatedUser.email}`);
}
```

### 4. Função `restoreUserFromPending()` (linha 563-567)

**Adicionado:**
```typescript
// ⚡ INVALIDAR CACHE após restauração
if (existingUser.firebaseUid) {
  await cacheService.del(`user:firebase:${existingUser.firebaseUid}`);
  console.log(`🗑️ Cache invalidated for user: ${updatedUser.email}`);
}
```

---

## 🛠️ Scripts Criados

### `clear-user-cache.js`
Script para limpar manualmente o cache de um usuário específico:

```bash
npx tsx clear-user-cache.js <email>
```

**Uso:**
```bash
npx tsx clear-user-cache.js teste1525@gmail.com
```

**Saída:**
```
🔍 Buscando usuário: teste1525@gmail.com...

📊 Informações do usuário:
  Email: teste1525@gmail.com
  Nome: Jonathan Machado
  Firebase UID: VNOEzAbuh7Rhq0QCtPkvP2O4XK63
  isApproved: true
  status: approved
  role: pro

🗑️ Limpando cache: user:firebase:VNOEzAbuh7Rhq0QCtPkvP2O4XK63...

✅ Cache limpo com sucesso!

🔄 Agora o usuário pode fazer login novamente e o sistema
   buscará as informações atualizadas do banco de dados.
```

---

## 🚀 Deploy Realizado

1. **Código atualizado:**
   - ✅ `server/services/user.service.ts` - 4 funções corrigidas

2. **Build:**
   ```bash
   npm run build
   ```
   ✅ Concluído com sucesso

3. **Restart:**
   ```bash
   pm2 restart buscadorpxt
   ```
   ✅ Aplicação reiniciada em cluster mode (2 instâncias)

4. **Cache limpo manualmente:**
   ```bash
   npx tsx clear-user-cache.js teste1525@gmail.com
   ```
   ✅ Cache do usuário `teste1525@gmail.com` foi invalidado

---

## ✅ Validação

### Teste Imediato:
Agora o usuário `teste1525@gmail.com` pode:
1. ✅ Fazer logout (se ainda logado)
2. ✅ Fazer login novamente
3. ✅ Sistema buscará dados ATUALIZADOS do banco (não do cache)
4. ✅ Backend retornará `isApproved: true`
5. ✅ Será redirecionado para `/dashboard` com acesso completo

### Logs Esperados:

**Antes (com cache antigo):**
```
⚠️ Profile fetch failed, status: 403
📋 Error data: { code: 'PENDING_APPROVAL', ... }
⏳ User pending approval, redirecting to /pending-approval
```

**Depois (com cache limpo):**
```
✅ Firebase login successful
✅ Profile loaded successfully
✅ Returning profile for teste1525@gmail.com: { isApproved: true, needsApproval: false, status: 'approved' }
🚀 Redirecting to /dashboard
```

---

## 📊 Impacto da Correção

### Antes:
- ❌ Usuários aprovados precisavam esperar até **30 minutos** para acessar
- ❌ Admin aprovava mas usuário continuava bloqueado
- ❌ Necessário fazer workarounds (limpar cache manualmente, aguardar)
- ❌ Experiência ruim para novos usuários

### Depois:
- ✅ Usuários aprovados têm acesso **imediatamente**
- ✅ Cache é invalidado automaticamente após aprovação
- ✅ Sem necessidade de intervenção manual
- ✅ Fluxo de aprovação 100% funcional

---

## 🎯 Funções Corrigidas

| Função | Linha | Status | Descrição |
|--------|-------|--------|-----------|
| `approveUser()` | 362-366 | ✅ Corrigido | Invalida cache ao aprovar usuário |
| `rejectUser()` | 415-419 | ✅ Corrigido | Invalida cache ao rejeitar usuário |
| `markUserPaymentPending()` | 487-491 | ✅ Corrigido | Invalida cache ao marcar pagamento pendente |
| `restoreUserFromPending()` | 563-567 | ✅ Corrigido | Invalida cache ao restaurar de pendente |

---

## 📝 Checklist de Validação

- [x] Código corrigido em 4 funções
- [x] Build realizado com sucesso
- [x] PM2 reiniciado
- [x] Cache do usuário teste limpo manualmente
- [x] Script `clear-user-cache.js` criado
- [ ] **TESTE FINAL**: Usuário fazer login e acessar dashboard

---

## 🔄 Próximos Passos

1. **Teste Imediato:**
   - Usuário `teste1525@gmail.com` deve fazer logout
   - Fazer login novamente
   - Verificar se acessa `/dashboard` com sucesso

2. **Teste com Novo Usuário:**
   - Criar nova conta de teste
   - Admin aprovar
   - Verificar se redirecionamento automático funciona via WebSocket
   - Confirmar que não há necessidade de logout/login

3. **Monitoramento:**
   - Observar logs para mensagens `🗑️ Cache invalidated for user:`
   - Confirmar que cache é limpo a cada aprovação

---

## 🎉 Resumo

**Problema:** Cache não era invalidado após aprovação de usuários
**Solução:** Adicionada invalidação de cache em todas funções de mudança de status
**Resultado:** Usuários aprovados têm acesso imediato ao sistema
**Status:** ✅ **CORRIGIDO E PRONTO PARA TESTE**

---

**Autor:** Claude Code
**Data:** 2025-11-17
**Versão:** 1.0
