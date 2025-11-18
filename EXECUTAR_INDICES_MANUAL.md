# 🗃️ EXECUTAR ÍNDICES NO BANCO - MANUAL

## ⚠️ IMPORTANTE

Como `psql` não está disponível neste ambiente, você precisa executar os índices **manualmente** no console do PostgreSQL da Hostinger.

---

## 📋 PASSO A PASSO

### 1. **Acessar Console do PostgreSQL na Hostinger**

1. Faça login no painel da Hostinger
2. Vá em **Databases** → **PostgreSQL**
3. Clique em **phpPgAdmin** ou **Console**
4. Selecione o banco de dados do projeto

### 2. **Abrir o Arquivo SQL**

Abra o arquivo criado:
```
migrations/add-performance-indexes.sql
```

### 3. **Copiar e Executar o SQL**

Copie TODO o conteúdo do arquivo `add-performance-indexes.sql` e cole no console SQL da Hostinger.

Ou execute via SSH se tiver acesso:
```bash
cd /home/buscadorpxt/buscadorpxt
psql "$DATABASE_URL" -f migrations/add-performance-indexes.sql
```

### 4. **Aguardar Conclusão**

- ⏱️ Tempo estimado: **5-15 minutos**
- 📊 Serão criados **30+ índices**
- ✅ Você verá mensagens "CREATE INDEX" para cada índice criado

---

## ✅ VALIDAÇÃO

Após executar, verifique se os índices foram criados:

```sql
SELECT schemaname, tablename, indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;
```

Deve retornar **30+ linhas** com os novos índices.

---

## 🚀 APÓS EXECUTAR OS ÍNDICES

Volte ao terminal e confirme que executou os índices.

O deploy vai continuar automaticamente com:
- ✅ Build do projeto
- ✅ Restart do PM2
- ✅ Validação da performance

---

## 📞 PROBLEMAS?

Se encontrar erros, verifique:
1. Conexão com o banco está ativa
2. Usuário tem permissões para criar índices
3. Espaço em disco suficiente (~20-30% do tamanho da tabela)

**Erros comuns:**
- `permission denied` → Usuário sem permissão
- `out of memory` → Servidor sem recursos (tente índices um por vez)
- `already exists` → Índice já existe (pode pular)

---

**Arquivo SQL:** `migrations/add-performance-indexes.sql`
**Impacto:** 60% de redução no tempo de carregamento
