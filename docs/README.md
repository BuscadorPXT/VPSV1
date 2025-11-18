# Documentação do BuscadorPXT

Esta pasta contém toda a documentação técnica do projeto, organizada por categoria.

## 📂 Estrutura

### 📊 analysis/
Análises técnicas, diagnósticos e investigações de problemas.

**Conteúdo:**
- Análises de performance
- Diagnósticos de bugs
- Mapeamentos de sistemas
- Investigações de race conditions

**Principais:**
- `ANALISE_USUARIOS_ONLINE.md` - Sistema de usuários online
- `ANALISE_SINCRONIZACAO_GOOGLE_SHEETS.md` - Sincronização com Sheets
- `DIAGNOSTICO_USUARIOS_ONLINE.md` - Diagnóstico completo

---

### 📖 guides/
Guias passo a passo, tutoriais e checklists.

**Conteúdo:**
- Guias de deploy
- Tutoriais de configuração
- Checklists de procedimentos
- Como fazer (how-to)

**Principais:**
- `GUIA_ZERO_DOWNTIME_DEPLOY.md` - Deploy sem interrupção
- `GUIA_COMPLETO_APPS_SCRIPT.md` - Google Apps Script
- `PERFORMANCE_OPTIMIZATION_GUIDE.md` - Otimização de performance
- `GUIA_TESTE_USUARIOS_PENDENTES.md` - Teste de aprovação

---

### 🔧 fixes/
Documentação de correções de bugs e problemas resolvidos.

**Conteúdo:**
- Fixes aplicados
- Correções de bugs
- Soluções implementadas
- Mudanças de comportamento

**Principais:**
- `FIX_USUARIOS_ONLINE_CORRECAO_FINAL.md` - Fix definitivo usuários online
- `FIX_TOKEN_EXPIRADO.md` - Correção token expirado
- `FIX_COMPLETO_APROVACAO_USUARIOS.md` - Fix aprovação de usuários
- `SOLUCAO_METRICAS_FINAL.md` - Solução métricas admin

---

### 📄 reports/
Relatórios de implementação, deploys e otimizações.

**Conteúdo:**
- Relatórios de deploy
- Relatórios de otimização
- Logs de execução
- Métricas de implementação

**Principais:**
- `OTIMIZACAO_PERFORMANCE_APLICADA.md` - Otimizações de performance
- `RELATORIO_COMPLETO_15_11_2025.md` - Relatório completo
- `DEPLOY_USUARIOS_ONLINE_SUCCESS.md` - Deploy bem-sucedido
- `OTIMIZACOES_IMPLEMENTADAS.md` - Otimizações aplicadas

---

### 🚀 migration/
Documentação de migração do sistema para VPS.

**Conteúdo:**
- Planos de migração
- Checklists de migração
- Análises de custos
- READMEs de migração

**Principais:**
- `PLANO_MIGRACAO_HOSTINGER.md` - Plano completo de migração
- `README_MIGRACAO.md` - Guia de migração
- `MIGRACAO_MULTIPLOS_PROJETOS_CUSTOS.md` - Análise de custos

---

### 📝 Outros Documentos

**Na raiz de docs/:**
- `CUSTOS.md` - Análise de custos operacionais
- `LAYOUTMOBILE.md` - Layout mobile
- `CONSOLEADMIN.md` - Console admin
- `CODIGO_PARA_COPIAR.md` - Snippets úteis
- `secrets.md` - Gerenciamento de secrets
- `replit.md` - Configuração Replit

---

## 🔍 Como Encontrar Documentação

### Por Tipo de Problema:
- **Bug/Erro**: Procure em `fixes/` ou `analysis/`
- **Como fazer X**: Procure em `guides/`
- **Histórico de mudanças**: Procure em `reports/`
- **Migração/Deploy**: Procure em `migration/` ou `guides/`

### Por Data:
Muitos arquivos têm datas nos nomes (`RELATORIO_15_11_2025.md`)

### Por Palavra-chave:
```bash
# Buscar em toda a documentação
grep -r "palavra-chave" docs/

# Buscar apenas títulos
grep -r "^#.*palavra-chave" docs/
```

---

## 📌 Convenções

- **ANALISE_**: Documento de análise técnica
- **DIAGNOSTICO_**: Diagnóstico de problema
- **GUIA_**: Guia passo a passo
- **FIX_**: Correção aplicada
- **CORRECAO_**: Correção de bug
- **RELATORIO_**: Relatório de implementação
- **OTIMIZACAO_**: Otimização aplicada
- **PLANO_**: Plano de ação

---

**Última Atualização**: 18/11/2025
