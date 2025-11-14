
-- Script para alinhar o schema do banco com o código
-- Executa verificações e correções necessárias

-- 1. Verificar se a coluna 'status' existe (deve existir)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'status'
    ) THEN
        ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'pending_approval';
        RAISE NOTICE 'Coluna status adicionada';
    ELSE
        RAISE NOTICE 'Coluna status já existe';
    END IF;
END $$;

-- 2. Verificar se a coluna 'account_status' existe (NÃO deve existir)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'account_status'
    ) THEN
        -- Migrar dados se necessário
        UPDATE users SET status = account_status WHERE status IS NULL;
        
        -- Remover coluna duplicada
        ALTER TABLE users DROP COLUMN account_status;
        RAISE NOTICE 'Coluna account_status removida';
    ELSE
        RAISE NOTICE 'Coluna account_status não existe (correto)';
    END IF;
END $$;

-- 3. Garantir que todos os usuários tenham um status válido
UPDATE users 
SET status = 'approved' 
WHERE status IS NULL OR status = '';

-- 4. Verificar estrutura final
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('status', 'account_status')
ORDER BY column_name;
