# Arquivos de Configuração

Esta pasta contém arquivos de configuração do sistema.

## 📄 Arquivos

### `nginx-buscadorpxt.conf`
Configuração do nginx para o BuscadorPXT.

**Localização em produção**: `/etc/nginx/sites-available/buscadorpxt`

**Aplicar configuração**:
```bash
# Copiar para sites-available
sudo cp config/nginx-buscadorpxt.conf /etc/nginx/sites-available/buscadorpxt

# Criar link simbólico
sudo ln -s /etc/nginx/sites-available/buscadorpxt /etc/nginx/sites-enabled/

# Testar configuração
sudo nginx -t

# Recarregar nginx
sudo systemctl reload nginx
```

---

## 🔧 Outras Configurações

Configurações na raiz do projeto:

- **`ecosystem.config.cjs`** - Configuração PM2 (cluster mode)
- **`drizzle.config.ts`** - Configuração Drizzle ORM
- **`vite.config.ts`** - Configuração Vite (build)
- **`tsconfig.json`** - Configuração TypeScript
- **`tailwind.config.ts`** - Configuração Tailwind CSS
- **`postcss.config.js`** - Configuração PostCSS
- **`components.json`** - Configuração shadcn/ui

---

## 📝 Notas

- Arquivos de configuração sensíveis (`.env`) não estão versionados
- Sempre faça backup antes de modificar configurações de produção
- Teste configurações nginx antes de aplicar: `sudo nginx -t`

---

**Última Atualização**: 18/11/2025
