# BuscadorPXT - Sistema de Busca de Preços

Plataforma full-stack para busca e monitoramento de preços de fornecedores, construída com React, Express e PostgreSQL.

## 📁 Estrutura do Projeto

```
buscadorpxt/
├── client/                 # Frontend React + TypeScript
│   ├── src/
│   │   ├── components/    # Componentes reutilizáveis (Radix UI)
│   │   ├── features/      # Componentes específicos de features
│   │   ├── pages/         # Páginas/rotas da aplicação
│   │   ├── hooks/         # Custom React hooks
│   │   └── lib/           # Utilitários do frontend
│
├── server/                # Backend Express + TypeScript
│   ├── routes/           # Rotas da API (modular)
│   ├── services/         # Lógica de negócio
│   ├── middleware/       # Middlewares Express
│   ├── controllers/      # Handlers de requisições
│   └── utils/            # Utilitários do servidor
│
├── shared/               # Código compartilhado
│   └── schema.ts         # Schema Drizzle ORM (source of truth)
│
├── prisma/               # Prisma ORM (compatibilidade)
├── migrations/           # Migrações do banco de dados
│
├── docs/                 # 📚 Documentação do projeto
│   ├── analysis/         # Análises técnicas e diagnósticos
│   ├── guides/           # Guias e tutoriais
│   ├── fixes/            # Documentação de correções
│   ├── reports/          # Relatórios de deploy e otimizações
│   └── migration/        # Documentação de migração
│
├── scripts/              # 🔧 Scripts utilitários
│   ├── build-production.sh
│   ├── deploy.sh
│   ├── setup-*.sh        # Scripts de configuração
│   ├── test-*.sh         # Scripts de teste
│   └── *.js              # Scripts Node.js utilitários
│
├── config/               # ⚙️ Arquivos de configuração
│   └── nginx-*.conf      # Configurações nginx
│
├── codigossheets/        # Códigos Google Apps Script
│
└── [arquivos de config na raiz]
    ├── package.json      # Dependências npm
    ├── tsconfig.json     # Config TypeScript
    ├── vite.config.ts    # Config Vite
    ├── drizzle.config.ts # Config Drizzle ORM
    ├── tailwind.config.ts # Config Tailwind CSS
    ├── ecosystem.config.cjs # Config PM2
    ├── CLAUDE.md         # Instruções para Claude Code
    └── .env              # Variáveis de ambiente
```

## 🚀 Comandos Principais

### Desenvolvimento
```bash
npm run dev           # Iniciar servidor de desenvolvimento (porta 5000)
npm run check        # Verificação de tipos TypeScript
```

### Build e Deploy
```bash
./scripts/build-production.sh    # Build com variáveis Firebase
npm run build                    # Build frontend + backend
npm start                        # Iniciar servidor produção
pm2 restart buscadorpxt          # Restart PM2
```

### Utilitários
```bash
./scripts/check-online-users.js  # Verificar usuários online
./scripts/execute-indexes.js     # Criar índices do banco
./scripts/test-pending-approval.sh # Testar aprovação de usuários
```

### Banco de Dados
```bash
npm run db:push      # Push schema Drizzle para banco
npx prisma generate  # Gerar Prisma client
```

## 📚 Documentação

### Análises Técnicas
- `docs/analysis/` - Diagnósticos e análises de problemas
- `docs/analysis/ANALISE_USUARIOS_ONLINE.md` - Análise do sistema de usuários online
- `docs/analysis/ANALISE_SINCRONIZACAO_GOOGLE_SHEETS.md` - Análise de sincronização

### Guias
- `docs/guides/` - Guias passo a passo
- `docs/guides/GUIA_ZERO_DOWNTIME_DEPLOY.md` - Deploy sem downtime
- `docs/guides/GUIA_COMPLETO_APPS_SCRIPT.md` - Google Apps Script
- `docs/guides/PERFORMANCE_OPTIMIZATION_GUIDE.md` - Otimização

### Correções
- `docs/fixes/` - Documentação de bugs corrigidos
- `docs/fixes/FIX_USUARIOS_ONLINE_CORRECAO_FINAL.md` - Fix usuários online
- `docs/fixes/FIX_TOKEN_EXPIRADO.md` - Fix token expirado

### Relatórios
- `docs/reports/` - Relatórios de implementação
- `docs/reports/OTIMIZACAO_PERFORMANCE_APLICADA.md` - Otimizações aplicadas
- `docs/reports/RELATORIO_COMPLETO_*.md` - Relatórios completos

### Migração
- `docs/migration/` - Documentação de migração VPS
- `docs/migration/PLANO_MIGRACAO_HOSTINGER.md` - Plano de migração

## 🛠️ Stack Tecnológica

**Frontend:**
- React 18 + TypeScript
- Wouter (routing)
- TanStack Query
- Radix UI
- Tailwind CSS

**Backend:**
- Express.js + TypeScript
- PostgreSQL (Drizzle ORM)
- Firebase Authentication
- WebSocket (ws library)
- Redis (cache)

**DevOps:**
- PM2 (cluster mode)
- Nginx (reverse proxy)
- SSL/TLS (certbot)

**Integrações:**
- Google Sheets API
- Stripe (pagamentos)
- OpenAI API

## 🔒 Segurança

- Autenticação Firebase + sessões HTTP
- Middleware de autenticação em rotas protegidas
- Rate limiting para updates de sessão
- Validação de variáveis de ambiente

## 📊 Performance

- Cache em memória (usuários + sessões)
- Lazy loading de páginas admin
- Compressão gzip/brotli
- WebSocket para updates em tempo real
- Query optimization com índices

## 🌐 Deploy

**Produção**: Hostinger VPS
- IP: 179.43.186.178
- Domínio: buscadorpxt.com.br
- PM2 Cluster: 2 instâncias
- Zero-downtime deployments

## 📝 Notas Importantes

- **CLAUDE.md**: Instruções específicas para Claude Code - manter na raiz
- **Environment**: Arquivo `.env` necessário para build Vite
- **Firebase**: Variáveis devem ser exportadas antes do build
- **PM2**: Config em `ecosystem.config.cjs`

## 🤝 Contribuindo

1. Documentar mudanças em `docs/`
2. Usar scripts em `scripts/` para tarefas comuns
3. Seguir padrões do `CLAUDE.md`
4. Testar antes de deploy

## 📞 Suporte

- Issues: Documentar em `docs/fixes/`
- Análises: Criar em `docs/analysis/`
- Guias: Adicionar em `docs/guides/`

---

**Status**: ✅ Produção Estável
**Última Atualização**: 18/11/2025
