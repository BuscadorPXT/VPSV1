# 🧪 Guia de Teste - Fluxo de Usuários Pendentes

## 📋 Pré-requisitos

Antes de começar, verificar se a aplicação está rodando:

```bash
# 1. Verificar status do PM2
pm2 status

# 2. Verificar logs (opcional)
pm2 logs buscadorpxt --lines 50

# 3. Verificar se porta 5000 está respondendo
curl http://localhost:5000/api/health || echo "Precisa iniciar a aplicação"
```

**Se a aplicação NÃO estiver rodando:**
```bash
# Iniciar a aplicação
pm2 start buscadorpxt
# ou
npm run dev
```

---

## 🌐 Acessar a Aplicação

### Opção 1: Via Port Forwarding (Recomendado)
Claude Code já fez o port forwarding automático. Você pode acessar:
- **http://localhost:5000** (direto na aplicação)
- **Ou clicar na porta 5000 no painel do VS Code** → Abre no navegador

### Opção 2: Via Domínio (se configurado)
Se você tem domínio configurado no nginx:
- **https://seu-dominio.com**

---

## 📝 Teste 1: Criar Usuário Novo

### Passo a Passo:

1. **Abrir a aplicação no navegador**
   ```
   http://localhost:5000/login
   ```

2. **Clicar em "Cadastre-se"**
   - Ou navegar para: `http://localhost:5000/login` e clicar no link

3. **Preencher o formulário:**
   ```
   Nome: Teste Usuario
   Empresa: Empresa Teste
   WhatsApp: (11) 99999-9999
   Email: teste@exemplo.com
   Senha: teste123
   Confirmar Senha: teste123
   ```

4. **Clicar em "Criar conta"**

### ✅ Resultado Esperado:

**No navegador:**
- ✅ Mensagem toast: "Cadastro realizado! Sua conta foi criada. Aguardando aprovação..."
- ✅ Após 2 segundos, redireciona para `/pending-approval`
- ✅ Mostra página com status "Em análise"

**No console do navegador (F12 → Console):**
```
📝 Criando novo usuário: { email: "teste@exemplo.com", isApproved: false, status: "pending_approval" }
```

**No log do servidor (terminal com PM2 logs):**
```bash
pm2 logs buscadorpxt --lines 20
```
Você deve ver:
```
📝 Criando novo usuário: {...}
✅ Novo usuário registrado com sucesso: teste@exemplo.com (ID: X)
📋 Status de aprovação: isApproved=false, status=pending_approval, role=user
```

---

## 🔐 Teste 2: Fazer Login com Conta Pendente

### Passo a Passo:

1. **Ir para a página de login**
   ```
   http://localhost:5000/login
   ```
   *(Ou fazer logout se ainda estiver logado)*

2. **Inserir credenciais da conta criada:**
   ```
   Email: teste@exemplo.com
   Senha: teste123
   ```

3. **Clicar em "Entrar"**

### ✅ Resultado Esperado:

**No navegador:**
- ✅ Firebase autentica (mensagem "Sucesso - Redirecionando...")
- ✅ Toast aparece: "Aguardando Aprovação - Sua conta está sendo analisada por nossa equipe."
- ✅ **Redireciona para `/pending-approval`** (NÃO fica em loop!)
- ✅ Página mostra:
  - Email: teste@exemplo.com
  - Status: "Em análise"
  - Indicador WebSocket verde (se conectado)
  - Botão "Falar no WhatsApp"
  - Botão "Atualizar Status"

**No console do navegador (F12 → Console):**
```javascript
🔐 Attempting Firebase login...
✅ Firebase login successful
⚠️ Profile fetch failed, status: 403
📋 Error data: { code: "PENDING_APPROVAL", message: "..." }
⏳ User pending approval, redirecting to /pending-approval
```

**No log do servidor:**
```bash
pm2 logs buscadorpxt --lines 30
```
Você deve ver:
```
✅ Firebase user authenticated: teste@exemplo.com
🔍 [Auth] Approval check for teste@exemplo.com: { isApproved: false, status: "pending_approval" }
❌ User not approved: teste@exemplo.com (Status: pending_approval)
```

### ❌ O que NÃO deve acontecer:
- ❌ Ficar em loop entre login e dashboard
- ❌ Mostrar "Redirecionando..." sem redirecionar
- ❌ Ir para `/dashboard` e ser bloqueado
- ❌ Dar erro 500 ou crash

---

## 👨‍💼 Teste 3: Admin Aprovar o Usuário

### Passo a Passo:

1. **Fazer login com conta admin**
   - Se não tiver conta admin, criar uma via script
   ```bash
   # No terminal do servidor
   node server/create-admin-user.js
   # Ou usar psql para atualizar manualmente
   ```

2. **Acessar painel admin:**
   ```
   http://localhost:5000/admin
   ```

3. **Ir para seção "Pending Approval"** (ou "Usuários Pendentes")

4. **Encontrar o usuário "teste@exemplo.com"**

5. **Clicar em "Aprovar como PRO"** (ou "Aprovar como Tester")

### ✅ Resultado Esperado:

**No painel admin:**
- ✅ Usuário desaparece da lista de pendentes
- ✅ Mensagem de sucesso: "Usuário aprovado com sucesso como PRO"

**No log do servidor:**
```bash
pm2 logs buscadorpxt --lines 20
```
Você deve ver:
```
🔄 Approving user X as PRO...
✅ User approved successfully: teste@exemplo.com - Plan: pro - Type: PRO
📡 Sent approval notification via WebSocket to user X
```

**No banco de dados (opcional - verificar):**
```bash
# Conectar ao PostgreSQL
psql -U seu_usuario -d seu_banco

# Verificar status do usuário
SELECT email, "isApproved", status, role, "subscriptionPlan"
FROM users
WHERE email = 'teste@exemplo.com';
```
Resultado esperado:
```
       email        | isApproved |   status   | role |  subscriptionPlan
--------------------+------------+------------+------+-------------------
 teste@exemplo.com  |     t      | approved   | pro  | pro
```

---

## 🚀 Teste 4: Redirecionamento Automático

### Passo a Passo:

**IMPORTANTE**: O usuário deve estar na página `/pending-approval` quando admin aprovar.

1. **Manter a aba do usuário `teste@exemplo.com` aberta em `/pending-approval`**

2. **Em outra aba/janela, admin aprova o usuário** (como no Teste 3)

3. **Voltar para a aba do usuário pendente**

### ✅ Resultado Esperado:

**Cenário 1: WebSocket funcionando (ideal)**
- ✅ **Imediatamente** (em menos de 2 segundos):
  - Toast aparece: "🎉 Conta Aprovada!"
  - Redireciona automaticamente para `/dashboard`
  - Usuário tem acesso completo

**No console do navegador:**
```javascript
🎉 [PendingApproval] User approved event received
🔄 User profile refreshed successfully
🚀 USER APPROVED - redirect to dashboard
```

**Cenário 2: WebSocket desconectado (fallback via polling)**
- ✅ **Após até 30 segundos** (polling interval):
  - Polling detecta mudança
  - Toast aparece: "🎉 Conta Aprovada!"
  - Redireciona automaticamente para `/dashboard`

**No console do navegador:**
```javascript
🔍 Checking approval status...
✅ User approved via polling - redirecting...
```

### ❌ O que NÃO deve acontecer:
- ❌ Ficar preso na página `/pending-approval` mesmo depois de aprovado
- ❌ Precisar fazer logout/login para acessar
- ❌ Ser redirecionado de volta para `/pending-approval` após aprovação

---

## 🔍 Verificação de Logs Detalhados

### Console do Navegador (F12 → Console)

**Filtrar logs relevantes:**
```javascript
// No console do navegador, filtrar por:
- "Firebase"
- "Profile"
- "PENDING_APPROVAL"
- "User approved"
```

### Logs do Servidor

```bash
# Ver logs em tempo real
pm2 logs buscadorpxt --lines 50

# Filtrar logs de aprovação
pm2 logs buscadorpxt | grep -i "approv"

# Filtrar logs de WebSocket
pm2 logs buscadorpxt | grep -i "websocket"
```

---

## 📊 Checklist de Validação Completa

### Teste 1: Registro
- [ ] Formulário de registro aceita dados
- [ ] Mostra mensagem "Aguardando aprovação"
- [ ] Redireciona para `/pending-approval` após 2s
- [ ] Usuário criado no banco com `isApproved: false`
- [ ] Log no servidor confirma criação

### Teste 2: Login Pendente
- [ ] Firebase autentica com sucesso
- [ ] Backend retorna 403 + PENDING_APPROVAL
- [ ] Frontend mostra toast "Aguardando Aprovação"
- [ ] Redireciona para `/pending-approval`
- [ ] **NÃO fica em loop de redirecionamento**
- [ ] Logs mostram tratamento correto do erro 403

### Teste 3: Página Pending Approval
- [ ] Mostra email correto
- [ ] Status: "Em análise"
- [ ] Indicador WebSocket (verde ou reconectando)
- [ ] Botão WhatsApp funciona
- [ ] Botão "Atualizar Status" funciona
- [ ] Polling ativo (logs a cada 30s)

### Teste 4: Aprovação Admin
- [ ] Admin consegue acessar `/admin`
- [ ] Lista de usuários pendentes aparece
- [ ] Botão "Aprovar" funciona
- [ ] Usuário é atualizado no banco
- [ ] Log confirma envio de WebSocket

### Teste 5: Redirecionamento Automático
- [ ] WebSocket envia notificação
- [ ] Usuário recebe evento na página `/pending-approval`
- [ ] Toast "🎉 Conta Aprovada!" aparece
- [ ] Redireciona automaticamente para `/dashboard`
- [ ] Dashboard carrega com sucesso
- [ ] Usuário tem acesso completo
- [ ] **NÃO precisa fazer logout/login**

---

## 🐛 Troubleshooting

### Problema: Aplicação não responde na porta 5000

**Solução:**
```bash
# Verificar se PM2 está rodando
pm2 status

# Reiniciar aplicação
pm2 restart buscadorpxt

# Ver logs de erro
pm2 logs buscadorpxt --err --lines 50

# Se necessário, matar processo e iniciar novamente
pm2 delete buscadorpxt
pm2 start npm --name "buscadorpxt" -- start
```

### Problema: Port forwarding não funciona

**Solução:**
```bash
# Acessar diretamente via localhost
http://localhost:5000

# Ou via IP do servidor (se estiver remoto)
http://<IP-DO-SERVIDOR>:5000
```

### Problema: WebSocket não conecta

**Solução:**
```bash
# Verificar logs do WebSocket
pm2 logs buscadorpxt | grep -i websocket

# Verificar se porta WebSocket está aberta (geralmente usa mesma porta)
curl http://localhost:5000/health

# No console do navegador, verificar:
console.log(isConnected); // Deve ser true
```

### Problema: Usuário não redireciona após aprovação

**Solução:**
1. Verificar se WebSocket está conectado (indicador verde)
2. Se não, polling deve funcionar (aguardar 30s)
3. Forçar refresh manual clicando em "Atualizar Status"
4. Verificar logs do servidor para confirmar envio de notificação

### Problema: Continua ficando em loop

**Solução:**
```bash
# Verificar se as correções foram aplicadas
git log --oneline -1
# Deve mostrar: "Fix: Corrigir fluxo de usuários pendentes de aprovação"

# Reconstruir frontend (se necessário)
npm run build

# Reiniciar aplicação
pm2 restart buscadorpxt

# Limpar cache do navegador
# F12 → Application → Clear Storage → Clear site data
```

---

## 📸 Capturas de Tela Esperadas

### 1. Página de Login
- Formulário com campos email/senha
- Link "Cadastre-se"

### 2. Página de Registro
- Formulário completo
- Botão "Criar conta"

### 3. Página Pending Approval
```
┌─────────────────────────────────────┐
│         🕐 (ícone pulsando)         │
│    Aguardando Aprovação             │
│    Sua conta está sendo analisada   │
├─────────────────────────────────────┤
│ Status: 🟡 Em análise               │
│ Email: teste@exemplo.com            │
│ 🟢 Monitoramento ativo              │
├─────────────────────────────────────┤
│ [💬 Falar no WhatsApp]              │
│ [ℹ️ Ver Detalhes do Processo]      │
│ [🔄 Atualizar Status]               │
│ [🚪 Sair da Conta]                  │
└─────────────────────────────────────┘
```

### 4. Toast de Aprovação
```
╔════════════════════════════╗
║ 🎉 Conta Aprovada!         ║
║ Redirecionando...          ║
╚════════════════════════════╝
```

---

## ✅ Teste Completo Passou?

Se todos os testes acima passaram:
- ✅ **SUCESSO!** As correções funcionam corretamente
- ✅ Pode fazer deploy para produção
- ✅ Sistema de aprovação está 100% funcional

Se algum teste falhou:
- ❌ Verificar logs detalhados
- ❌ Consultar seção de Troubleshooting
- ❌ Verificar se commit foi aplicado corretamente
- ❌ Limpar cache do navegador e tentar novamente

---

**Última atualização**: 2025-11-17
**Versão**: 1.0
