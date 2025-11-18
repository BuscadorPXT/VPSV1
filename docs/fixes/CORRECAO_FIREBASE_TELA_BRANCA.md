# Correção: Tela Branca - Firebase Missing Variables
**Data:** 15/11/2025
**Severidade:** 🔴 CRÍTICO
**Status:** ✅ RESOLVIDO

---

## 🚨 Problema Identificado

### Sintomas
```
❌ Tela branca no dashboard
❌ Console error: "Missing Firebase environment variables"
❌ Firebase Error: auth/invalid-api-key
❌ Aplicação não carrega
```

### Erro no Console
```javascript
Missing Firebase environment variables: (6) [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_APP_ID',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID'
]

Uncaught FirebaseError: Firebase: Error (auth/invalid-api-key).
```

---

## 🔍 Causa Raiz

### Por que aconteceu?

**Build anterior executado SEM variáveis de ambiente:**
```bash
npm run build  # ❌ ERRADO - Vite não carrega .env automaticamente
```

**Problema com Vite:**
- Vite substitui `import.meta.env.VITE_*` em **tempo de build**
- Se variáveis não estão exportadas, Vite substitui por `undefined`
- Bundle gerado não contém as configurações do Firebase
- Runtime não consegue inicializar Firebase → tela branca

**Diferença Build vs Runtime:**
```typescript
// Durante build (Vite substitui)
const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
// Se variável NÃO exportada → const apiKey = undefined;
// Se variável exportada → const apiKey = "AIzaSy...";

// Em runtime, não tem como mudar!
```

---

## ✅ Solução Aplicada

### 1. Verificado Variáveis no .env
```bash
✅ VITE_FIREBASE_AUTH_DOMAIN=mvp1precos.firebaseapp.com
✅ VITE_FIREBASE_MESSAGING_SENDER_ID=288807210289
✅ VITE_FIREBASE_STORAGE_BUCKET=mvp1precos.firebasestorage.app
✅ VITE_FIREBASE_API_KEY=AIzaSyBg_EFchQ75sbbegkJtIdlyflZxuZki2DU
✅ VITE_FIREBASE_PROJECT_ID=mvp1precos
✅ VITE_FIREBASE_APP_ID=1:288807210289:web:c5d7e8f9a0b1c2d3e4f5g6
```

### 2. Executado Script Correto
```bash
./build-production.sh
```

**O que o script faz:**
```bash
#!/bin/bash
# 1. Exporta variáveis Firebase para o ambiente
export VITE_FIREBASE_API_KEY="AIzaSy..."
export VITE_FIREBASE_PROJECT_ID="mvp1precos"
export VITE_FIREBASE_APP_ID="1:288807..."
export VITE_FIREBASE_AUTH_DOMAIN="mvp1precos.firebaseapp.com"
export VITE_FIREBASE_STORAGE_BUCKET="mvp1precos.firebasestorage.app"
export VITE_FIREBASE_MESSAGING_SENDER_ID="288807210289"

# 2. Limpa build anterior
rm -rf dist/public

# 3. Faz build com variáveis disponíveis
npm run build
```

### 3. Reiniciado PM2
```bash
pm2 restart buscadorpxt
```

### 4. Validado Bundle
```bash
✅ API Key encontrada no bundle: AIzaSyBg_EFchQ75sbbegkJtIdlyflZxuZki2DU
✅ Build incluiu todas variáveis corretamente
✅ Firebase inicializa sem erros
```

---

## 📊 Validação Pós-Correção

### Checklist ✅
- [x] ✅ Build executado com script correto
- [x] ✅ Variáveis Firebase incluídas no bundle
- [x] ✅ PM2 reiniciado com sucesso
- [x] ✅ Dashboard carrega sem tela branca
- [x] ✅ Firebase auth funciona
- [x] ✅ Sem erros no console

### Status PM2
```
Instance 0: 204.3mb - ✅ ONLINE
Instance 1: 203.8mb - ✅ ONLINE
Status: ✅ FUNCIONANDO CORRETAMENTE
```

---

## 🛠️ Procedimento Correto para Builds Futuros

### ❌ NUNCA FAZER
```bash
npm run build  # Sem exportar variáveis = tela branca!
```

### ✅ SEMPRE FAZER
```bash
# Opção 1: Usar script (RECOMENDADO)
./build-production.sh

# Opção 2: Exportar manualmente
export VITE_FIREBASE_API_KEY="AIzaSy..."
export VITE_FIREBASE_PROJECT_ID="mvp1precos"
export VITE_FIREBASE_APP_ID="1:288807..."
export VITE_FIREBASE_AUTH_DOMAIN="mvp1precos.firebaseapp.com"
export VITE_FIREBASE_STORAGE_BUCKET="mvp1precos.firebasestorage.app"
export VITE_FIREBASE_MESSAGING_SENDER_ID="288807210289"
npm run build
```

---

## 🔒 Segurança

### Variáveis no Bundle são Seguras?

**SIM**, variáveis `VITE_*` são **públicas por design**:
- ✅ Firebase API Key é **pública** (para frontend)
- ✅ Segurança via **Firebase Security Rules**
- ✅ Autenticação via **Firebase Auth**
- ✅ Domínios autorizados configurados no Firebase Console

**Não expor:**
- ❌ `FIREBASE_ADMIN_SDK_KEY` (backend only)
- ❌ `DATABASE_URL` (backend only)
- ❌ Secrets do servidor

---

## 📝 Lições Aprendidas

### 1. Vite Build-Time Variables
```typescript
// Vite substitui em TEMPO DE BUILD
const key = import.meta.env.VITE_API_KEY;

// Runtime não pode mudar isso!
// Se não exportar antes do build = undefined forever
```

### 2. Sempre Usar Script de Build
```bash
✅ ./build-production.sh  # Garantido funcionar
❌ npm run build          # Pode falhar
```

### 3. Validar Bundle Após Build
```bash
# Verificar se variáveis estão no bundle
grep -o "AIzaSy[A-Za-z0-9_-]*" dist/public/assets/index-*.js

# Se retornar vazio = problema!
# Se retornar a API key = sucesso!
```

---

## 🚨 Troubleshooting Futuro

### Se tela branca aparecer novamente:

**1. Verificar Console do Navegador**
```javascript
// Se ver "Missing Firebase environment variables":
// → Build foi feito sem exportar variáveis
```

**2. Verificar Bundle**
```bash
grep "VITE_FIREBASE_API_KEY" dist/public/assets/index-*.js
# Se NÃO encontrar = rebuild necessário
```

**3. Rebuild Correto**
```bash
./build-production.sh
pm2 restart buscadorpxt
```

**4. Limpar Cache do Navegador**
```
Ctrl + Shift + Delete
Ou hard reload: Ctrl + Shift + R
```

---

## 📊 Impacto da Correção

### Antes
- 🔴 Tela branca
- ❌ Firebase não inicializa
- ❌ Aplicação inacessível
- ❌ Usuários não conseguem logar

### Depois
- ✅ Dashboard carrega corretamente
- ✅ Firebase inicializa sem erros
- ✅ Autenticação funciona
- ✅ Aplicação 100% funcional
- ✅ Otimizações anteriores mantidas

---

## 🎯 Resumo Executivo

**Problema:** Build executado sem variáveis Firebase → tela branca
**Solução:** Rebuild com `./build-production.sh` → variáveis incluídas
**Tempo de Correção:** ~3 minutos
**Downtime:** ~5 minutos
**Status:** ✅ RESOLVIDO E VALIDADO

### Correções Aplicadas
1. ✅ Rebuild com script correto
2. ✅ Variáveis Firebase incluídas no bundle
3. ✅ PM2 reiniciado
4. ✅ Sistema validado e funcional
5. ✅ Documentação criada para prevenir recorrência

---

## 📋 Checklist para Futuras Otimizações

Antes de fazer qualquer build em produção:

- [ ] ✅ Verificar se `.env` tem todas variáveis `VITE_*`
- [ ] ✅ Usar `./build-production.sh` (NUNCA `npm run build` direto)
- [ ] ✅ Validar bundle após build: `grep "AIzaSy" dist/public/assets/*.js`
- [ ] ✅ Testar localmente antes de deploy
- [ ] ✅ Reiniciar PM2 após build
- [ ] ✅ Verificar console do navegador após deploy
- [ ] ✅ Confirmar login funciona

---

**Documento criado para evitar recorrência do problema.**
**Sempre usar `./build-production.sh` para builds de produção!**

---

**Status:** 🟢 SISTEMA TOTALMENTE FUNCIONAL
**Última Atualização:** 15/11/2025 14:20 BRT
