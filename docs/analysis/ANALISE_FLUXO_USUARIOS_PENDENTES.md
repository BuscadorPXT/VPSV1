# Análise Detalhada: Fluxo de Usuários Pendentes de Aprovação

## 📋 Sumário Executivo

Este relatório analisa o fluxo completo de usuários pendentes de aprovação no sistema BuscadorPXT, identificando o problema atual e propondo soluções.

### ❌ Problema Identificado

Quando um usuário cria uma conta e tenta fazer login:
1. Usuário cria conta → fica pendente de aprovação (`isApproved: false`)
2. Tenta fazer login → recebe sucesso do Firebase
3. Fica com mensagem "Redirecionando..." mas não acontece nada
4. Permanece preso na tela de login

### ✅ Comportamento Esperado

1. Usuário cria conta → fica pendente de aprovação
2. Ao tentar fazer login → deve ser redirecionado para `/pending-approval`
3. Na página de aprovação → aguarda admin aprovar
4. Quando admin aprova → redireciona automaticamente para `/dashboard` (via WebSocket)

---

## 🔍 Análise Detalhada do Fluxo

### 1. Fluxo de Registro (Criação de Conta)

**Arquivo**: `server/routes/auth.routes.ts` (linha 233-336)

#### Processo:
```
1. Frontend envia requisição POST para /api/auth/register
2. Backend verifica token Firebase
3. Cria usuário no banco com:
   - isApproved: false (SEMPRE)
   - status: 'pending_approval'
   - role: 'user'
   - subscriptionPlan: 'free'
```

#### Código Relevante:
```typescript
// Linha 262-278
const newUser = {
  firebaseUid: decodedToken.uid,
  email: decodedToken.email || '',
  name: name || decodedToken.name || '',
  company: company || null,
  whatsapp: whatsapp || null,
  phone: whatsapp || null,
  isApproved: false, // ✅ CRÍTICO: Sempre false para novos usuários
  status: 'pending_approval' as const,
  subscriptionPlan: 'free' as const,
  role: 'user' as const,
  isAdmin: false,
  isSubscriptionActive: false,
  createdAt: new Date(),
  lastActiveAt: new Date()
};
```

**✅ Status**: **Funcionando corretamente** - Usuários são criados com aprovação pendente.

---

### 2. Fluxo de Login (Autenticação)

**Arquivo**: `client/src/pages/login.tsx` (linha 55-142)

#### Processo:
```
1. Usuário insere email/senha
2. Firebase autentica (signInWithEmailAndPassword)
3. Firebase retorna sucesso ✅
4. Frontend tenta buscar perfil (/api/user/profile)
5. Backend valida token e perfil
6. PROBLEMA: Middleware retorna 403 mas frontend não trata adequadamente
```

#### Código do Login (Frontend):
```typescript
// Linha 77-104
const userCredential = await signInWithEmailAndPassword(auth, loginForm.email, loginForm.password);

toast({
  title: "Sucesso",
  description: "Redirecionando...", // ❌ Mostra "Redirecionando" mas pode não redirecionar
});

hasRedirected.current = true;

const response = await fetch('/api/user/profile', {
  headers: {
    'Authorization': `Bearer ${await userCredential.user.getIdToken()}`,
    'Content-Type': 'application/json'
  }
});

if (response.ok) {
  const data = await response.json();
  if (data.profile?.isApproved) {
    setLocation('/dashboard');
  } else {
    setLocation('/pending-approval'); // ✅ Deveria redirecionar aqui
  }
} else {
  setLocation('/dashboard'); // ❌ PROBLEMA: Redireciona para dashboard mesmo com erro
}
```

**❌ Problema Identificado**:
- Na linha 103, quando `response.ok` é `false`, o código redireciona para `/dashboard`
- Isso causa o loop: usuário vai para dashboard → middleware bloqueia → volta para login

---

### 3. Middleware de Autenticação (Backend)

**Arquivo**: `server/middleware/auth.ts` (linha 159-181)

#### Processo de Validação:
```
1. Verifica token Firebase ✅
2. Busca usuário no banco ✅
3. Verifica se isApproved = true ✅
4. Se NÃO aprovado → retorna 403 com código PENDING_APPROVAL ✅
```

#### Código do Middleware:
```typescript
// Linha 172-181
if (!userData.isApproved) {
  console.log(`❌ User not approved: ${userData.email} (Status: ${userData.status}, Mobile: ${isMobile})`);
  return res.status(403).json({
    message: 'Sua conta ainda não foi aprovada pelo administrador. Aguarde a aprovação.',
    code: 'PENDING_APPROVAL',
    email: userData.email,
    status: userData.status || 'pending_approval',
    isMobile: isMobile
  });
}
```

**✅ Status**: **Funcionando corretamente** - Middleware bloqueia usuários não aprovados.

---

### 4. Hook de Autenticação (Frontend)

**Arquivo**: `client/src/hooks/use-auth.ts` (linha 1-419)

#### Processo:
```
1. Firebase listener detecta mudança de estado
2. Busca token Firebase
3. Faz request para /api/user/profile
4. PROBLEMA: Quando recebe 403, não redireciona adequadamente
```

#### Código Problemático:
```typescript
// Linha 182-229
if (response.ok) {
  const data = await response.json();
  const profile = data.profile || data;

  setUser({
    uid: firebaseUser.uid,
    email: firebaseUser.email || '',
    name: profile.name,
    company: profile.company,
    id: profile.id,
    isAdmin: profile.isAdmin || false,
    role: profile.role || 'user',
    subscriptionPlan: profile.subscriptionPlan || 'free',
    isApproved: profile.isApproved === true,
    needsApproval: profile.isApproved !== true,
    status: profile.status,
    firebaseToken: freshToken,
  });
} else {
  // ❌ PROBLEMA: Quando recebe 401, tenta retry mas não trata 403 adequadamente
  if (response.status === 401) {
    // Retry logic...
  } else {
    console.error('❌ Failed to load user profile - status:', response.status);
    // ❌ PROBLEMA: Apenas retorna, não define estado de needsApproval
    return;
  }
}
```

**❌ Problema Identificado**:
- Quando recebe status 403 (PENDING_APPROVAL), o código apenas loga erro
- Não define o estado do usuário com `needsApproval: true`
- Não redireciona para `/pending-approval`

---

### 5. Página de Pending Approval

**Arquivo**: `client/src/pages/pending-approval.tsx`

#### Funcionalidades:
```
✅ Polling a cada 30 segundos para verificar aprovação
✅ WebSocket listener para notificação em tempo real
✅ Refresh automático do perfil
✅ Redirecionamento automático quando aprovado
```

#### Código de Verificação:
```typescript
// Linha 24-75
useEffect(() => {
  if (!loading && user) {
    const isUserApproved = user.isApproved === true ||
                          user.role === 'admin' ||
                          user.role === 'superadmin' ||
                          user.isAdmin === true ||
                          user.status === 'active';

    if (isUserApproved) {
      console.log('🚀 USER APPROVED - redirect to dashboard');
      localStorage.removeItem('pendingApprovalCache');
      setLocation('/buscador');
      return;
    }
  }
}, [user, loading, setLocation]);
```

**✅ Status**: **Funcionando corretamente** - Página aguarda aprovação adequadamente.

---

### 6. Dashboard (Proteção de Rota)

**Arquivo**: `client/src/pages/dashboard.tsx` (linha 68-81)

#### Código de Proteção:
```typescript
// Linha 68-81
if (user && user.needsApproval && !user.isApproved) {
  return (
    <ApprovalBlockingModal
      user={{
        email: user.email,
        name: user.name,
        createdAt: user.createdAt || new Date().toISOString(),
        isApproved: user.isApproved,
        rejectedAt: user.rejectedAt,
        rejectionReason: user.rejectionReason,
      }}
    />
  );
}
```

**✅ Status**: **Funcionando corretamente** - Dashboard bloqueia usuários não aprovados.

---

### 7. Sistema de Aprovação (Admin)

**Arquivo**: `server/routes/admin.routes.ts` (linha 880-944)

#### Processo de Aprovação:
```
1. Admin clica em "Aprovar" no painel admin
2. Backend atualiza usuário:
   - isApproved: true
   - status: 'approved'
   - subscriptionPlan: 'pro' ou 'tester'
   - role: 'pro' ou 'tester'
3. Envia notificação via WebSocket para o usuário
4. Usuário recebe evento e redireciona automaticamente
```

#### Código de Aprovação:
```typescript
// Linha 888-923
const updatedUser = await userService.approveUser(userIdNum, adminId, userType);

// ✅ NOTIFICAR USUÁRIO VIA WEBSOCKET SOBRE APROVAÇÃO
try {
  const { UnifiedWebSocketManager } = await import('../services/websocket-manager');
  const wsManager = UnifiedWebSocketManager.getInstance();

  wsManager.sendToUser(String(updatedUser.id), {
    type: 'USER_APPROVED',
    timestamp: new Date().toISOString(),
    data: {
      message: 'Sua conta foi aprovada! Você já pode acessar todas as funcionalidades.',
      userType,
      isApproved: true,
      role: updatedUser.role,
      subscriptionPlan: updatedUser.subscriptionPlan
    }
  });

  console.log(`📡 Sent approval notification via WebSocket to user ${updatedUser.id}`);
} catch (wsError) {
  console.warn('⚠️ Failed to send WebSocket notification:', wsError);
}
```

**✅ Status**: **Funcionando corretamente** - Aprovação funciona e notifica via WebSocket.

---

## 🔧 Soluções Propostas

### ✅ Solução 1: Corrigir Tratamento de Erro no Login (RECOMENDADA)

**Arquivo**: `client/src/pages/login.tsx`

**Problema**: Na linha 103, quando `response.ok` é `false`, redireciona para `/dashboard`

**Solução**: Verificar o código de erro e redirecionar apropriadamente

```typescript
// ANTES (linha 88-104):
const response = await fetch('/api/user/profile', {
  headers: {
    'Authorization': `Bearer ${await userCredential.user.getIdToken()}`,
    'Content-Type': 'application/json'
  }
});

if (response.ok) {
  const data = await response.json();
  if (data.profile?.isApproved) {
    setLocation('/dashboard');
  } else {
    setLocation('/pending-approval');
  }
} else {
  setLocation('/dashboard'); // ❌ PROBLEMA
}

// DEPOIS (CORRIGIDO):
const response = await fetch('/api/user/profile', {
  headers: {
    'Authorization': `Bearer ${await userCredential.user.getIdToken()}`,
    'Content-Type': 'application/json'
  }
});

if (response.ok) {
  const data = await response.json();
  if (data.profile?.isApproved) {
    setLocation('/dashboard');
  } else {
    setLocation('/pending-approval');
  }
} else {
  // ✅ SOLUÇÃO: Verificar código de erro
  const errorData = await response.json();

  if (response.status === 403 && errorData.code === 'PENDING_APPROVAL') {
    // Usuário pendente de aprovação
    setLocation('/pending-approval');
  } else {
    // Outro tipo de erro - tentar dashboard como fallback
    setLocation('/dashboard');
  }
}
```

---

### ✅ Solução 2: Melhorar Tratamento no useAuth

**Arquivo**: `client/src/hooks/use-auth.ts`

**Problema**: Quando recebe 403, não define estado do usuário adequadamente

**Solução**: Tratar status 403 explicitamente

```typescript
// ANTES (linha 182-229):
if (response.ok) {
  // ... código de sucesso
} else {
  if (response.status === 401) {
    // ... retry logic
  } else {
    console.error('❌ Failed to load user profile - status:', response.status);
    return; // ❌ PROBLEMA: Apenas retorna
  }
}

// DEPOIS (CORRIGIDO):
if (response.ok) {
  // ... código de sucesso
} else {
  // ✅ SOLUÇÃO: Tratar 403 (PENDING_APPROVAL)
  if (response.status === 403) {
    const errorData = await response.json();

    if (errorData.code === 'PENDING_APPROVAL') {
      console.log('⏳ User pending approval, setting user state accordingly');

      setUser({
        uid: firebaseUser.uid,
        email: firebaseUser.email || '',
        name: errorData.email || firebaseUser.email || '',
        isApproved: false,
        needsApproval: true,
        status: 'pending_approval',
        role: 'user',
      });

      setIsAuthReady(true);
      setLoading(false);
      return;
    }
  }

  if (response.status === 401) {
    // ... retry logic existente
  } else {
    console.error('❌ Failed to load user profile - status:', response.status);
    return;
  }
}
```

---

### ✅ Solução 3: Adicionar Popup de Notificação (OPCIONAL)

**Objetivo**: Mostrar um popup amigável informando o usuário sobre a aprovação pendente

**Implementação**: Criar componente de notificação

```typescript
// Novo componente: client/src/components/PendingApprovalNotification.tsx

import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';

interface Props {
  userEmail: string;
}

export function PendingApprovalNotification({ userEmail }: Props) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [hasShownNotification, setHasShownNotification] = useState(false);

  useEffect(() => {
    if (!hasShownNotification) {
      toast({
        title: "⏳ Aguardando Aprovação",
        description: `Sua conta (${userEmail}) está sendo analisada por nossa equipe. Você será notificado quando for aprovada!`,
        duration: 8000,
      });

      setHasShownNotification(true);

      // Redirecionar automaticamente para página de pending approval
      setTimeout(() => {
        setLocation('/pending-approval');
      }, 2000);
    }
  }, [hasShownNotification, userEmail, toast, setLocation]);

  return null;
}

// Uso no login.tsx:
// Adicionar após o login bem-sucedido, se usuário não aprovado
if (!data.profile?.isApproved) {
  return <PendingApprovalNotification userEmail={loginForm.email} />;
}
```

---

### ✅ Solução 4: Melhorar Roteamento no App.tsx (OPCIONAL)

**Objetivo**: Garantir que usuários não aprovados sempre vão para `/pending-approval`

**Arquivo**: `client/src/App.tsx`

```typescript
// Adicionar lógica de redirecionamento no componente ProtectedRoute

function ProtectedRoute({ component: Component }) {
  const { user, loading, isAuthReady } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!loading && isAuthReady && user) {
      // ✅ SOLUÇÃO: Verificar aprovação e redirecionar
      if (!user.isApproved && user.needsApproval) {
        console.log('🔒 User not approved, redirecting to pending-approval');
        setLocation('/pending-approval');
      }
    }
  }, [user, loading, isAuthReady, setLocation]);

  if (loading || !isAuthReady) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  // ✅ Bloquear acesso se não aprovado
  if (!user.isApproved && user.needsApproval) {
    return <Redirect to="/pending-approval" />;
  }

  return <Component />;
}
```

---

## 📊 Diagrama de Fluxo Corrigido

```
┌─────────────────────────────────────────────────────────────────┐
│                     1. REGISTRO (Criação de Conta)              │
├─────────────────────────────────────────────────────────────────┤
│  Usuário preenche formulário                                     │
│         ↓                                                        │
│  Firebase cria autenticação                                      │
│         ↓                                                        │
│  Backend cria usuário:                                           │
│    - isApproved: false                                           │
│    - status: 'pending_approval'                                  │
│         ↓                                                        │
│  Retorna: "Aguardando aprovação do administrador"                │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                     2. LOGIN (Usuário Pendente)                  │
├─────────────────────────────────────────────────────────────────┤
│  Usuário insere email/senha                                      │
│         ↓                                                        │
│  Firebase autentica ✅                                           │
│         ↓                                                        │
│  Frontend busca perfil (/api/user/profile)                       │
│         ↓                                                        │
│  Middleware verifica: isApproved = false                         │
│         ↓                                                        │
│  ✅ NOVO: Retorna 403 + código PENDING_APPROVAL                 │
│         ↓                                                        │
│  ✅ NOVO: Frontend detecta 403 e redireciona para:              │
│         /pending-approval                                        │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                  3. PÁGINA PENDING APPROVAL                      │
├─────────────────────────────────────────────────────────────────┤
│  Usuário vê:                                                     │
│    - Status: "Em análise"                                        │
│    - Email registrado                                            │
│    - Botão WhatsApp (contatar admin)                             │
│    - Botão Atualizar Status                                      │
│         ↓                                                        │
│  Sistema monitora:                                               │
│    ✅ WebSocket (notificação em tempo real)                     │
│    ✅ Polling a cada 30s (fallback)                             │
│         ↓                                                        │
│  Aguarda aprovação do admin...                                   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    4. ADMIN APROVA USUÁRIO                       │
├─────────────────────────────────────────────────────────────────┤
│  Admin acessa painel /admin                                      │
│         ↓                                                        │
│  Vê lista de usuários pendentes                                  │
│         ↓                                                        │
│  Clica em "Aprovar como PRO" ou "Aprovar como Tester"            │
│         ↓                                                        │
│  Backend atualiza:                                               │
│    - isApproved: true                                            │
│    - status: 'approved'                                          │
│    - role: 'pro' ou 'tester'                                     │
│    - subscriptionPlan: 'pro' ou 'tester'                         │
│         ↓                                                        │
│  ✅ Envia notificação via WebSocket:                            │
│     type: 'USER_APPROVED'                                        │
│         ↓                                                        │
│  Usuário recebe notificação instantaneamente                     │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│               5. REDIRECIONAMENTO AUTOMÁTICO                     │
├─────────────────────────────────────────────────────────────────┤
│  WebSocket dispara evento 'userApproved'                         │
│         ↓                                                        │
│  Página pending-approval detecta evento                          │
│         ↓                                                        │
│  refreshUser() atualiza perfil                                   │
│         ↓                                                        │
│  isApproved agora = true                                         │
│         ↓                                                        │
│  ✅ Redireciona automaticamente para /dashboard                 │
│         ↓                                                        │
│  Usuário tem acesso completo! 🎉                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Resumo das Mudanças Necessárias

### Mudanças Críticas (OBRIGATÓRIAS)

1. **`client/src/pages/login.tsx` (linha 88-105)**
   - ✅ Tratar status 403 e código PENDING_APPROVAL
   - ✅ Redirecionar para `/pending-approval` quando detectar aprovação pendente

2. **`client/src/hooks/use-auth.ts` (linha 182-229)**
   - ✅ Tratar status 403 explicitamente
   - ✅ Definir estado do usuário com `needsApproval: true`

### Mudanças Opcionais (RECOMENDADAS)

3. **Criar componente `PendingApprovalNotification.tsx`**
   - 🔔 Mostrar popup amigável informando aprovação pendente
   - ⏰ Redirecionar automaticamente após 2 segundos

4. **Melhorar `ProtectedRoute` no `App.tsx`**
   - 🔒 Garantir que usuários não aprovados sempre vão para `/pending-approval`
   - 🛡️ Camada extra de proteção

---

## ✅ Validação da Solução

### Teste 1: Fluxo Completo de Novo Usuário

```
1. ✅ Usuário cria conta
   - Verificar: isApproved = false no banco
   - Verificar: status = 'pending_approval'

2. ✅ Usuário tenta fazer login
   - Verificar: Firebase autentica com sucesso
   - Verificar: Backend retorna 403 + PENDING_APPROVAL
   - Verificar: Frontend redireciona para /pending-approval
   - Verificar: Não fica preso em loop

3. ✅ Usuário aguarda na página pending-approval
   - Verificar: Mostra email correto
   - Verificar: WebSocket conectado (indicador verde)
   - Verificar: Polling ativo (log a cada 30s)

4. ✅ Admin aprova usuário
   - Verificar: isApproved = true no banco
   - Verificar: status = 'approved'
   - Verificar: WebSocket envia notificação

5. ✅ Usuário é redirecionado automaticamente
   - Verificar: Recebe evento 'userApproved'
   - Verificar: refreshUser() é chamado
   - Verificar: Redireciona para /dashboard
   - Verificar: Acessa dashboard com sucesso
```

### Teste 2: Cenários de Edge Case

```
1. ✅ Usuário pendente tenta acessar /dashboard diretamente
   - Verificar: Middleware bloqueia (403)
   - Verificar: Redireciona para /pending-approval

2. ✅ WebSocket desconectado
   - Verificar: Polling continua funcionando
   - Verificar: Detecta aprovação em até 30 segundos

3. ✅ Admin aprova enquanto usuário está offline
   - Verificar: Ao fazer login novamente, vai direto para /dashboard
   - Verificar: Não fica preso em /pending-approval
```

---

## 📝 Checklist de Implementação

- [ ] 1. Atualizar `client/src/pages/login.tsx` (Solução 1)
- [ ] 2. Atualizar `client/src/hooks/use-auth.ts` (Solução 2)
- [ ] 3. Criar `client/src/components/PendingApprovalNotification.tsx` (Solução 3 - Opcional)
- [ ] 4. Atualizar `client/src/App.tsx` ProtectedRoute (Solução 4 - Opcional)
- [ ] 5. Testar fluxo completo de registro + login + aprovação
- [ ] 6. Testar cenários de edge case
- [ ] 7. Verificar logs do console em todas as etapas
- [ ] 8. Validar que não há loops ou travamentos

---

## 🔍 Arquivos Analisados

| Arquivo | Linha | Status | Descrição |
|---------|-------|--------|-----------|
| `server/routes/auth.routes.ts` | 233-336 | ✅ OK | Registro de usuário |
| `server/middleware/auth.ts` | 159-181 | ✅ OK | Validação de aprovação |
| `server/services/user.service.ts` | 275-367 | ✅ OK | Aprovação de usuário |
| `server/routes/admin.routes.ts` | 880-944 | ✅ OK | Endpoint de aprovação |
| `client/src/pages/login.tsx` | 88-105 | ❌ BUG | Tratamento de erro |
| `client/src/hooks/use-auth.ts` | 182-229 | ❌ BUG | Tratamento 403 |
| `client/src/pages/pending-approval.tsx` | 24-149 | ✅ OK | Página de aprovação |
| `client/src/pages/dashboard.tsx` | 68-81 | ✅ OK | Proteção de rota |

---

## 💡 Conclusão

O sistema de aprovação de usuários está **quase completo** e bem implementado, com:
- ✅ Backend robusto com validação correta
- ✅ WebSocket funcionando para notificações em tempo real
- ✅ Polling como fallback
- ✅ Página de pending-approval completa

**O problema está apenas no tratamento de erro no frontend** (`login.tsx` e `use-auth.ts`), que não redireciona adequadamente quando recebe status 403 + código PENDING_APPROVAL.

**Implementando as Soluções 1 e 2, o problema será completamente resolvido.**

---

**Autor**: Claude (Análise automática)
**Data**: 2025-11-17
**Versão**: 1.0
