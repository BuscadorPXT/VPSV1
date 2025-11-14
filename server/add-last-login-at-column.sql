
-- Adicionar coluna last_login_at se não existir
DO $$ 
BEGIN
    -- Verificar se a coluna last_login_at existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'last_login_at'
    ) THEN
        -- Adicionar a coluna
        ALTER TABLE users ADD COLUMN last_login_at TIMESTAMP;
        RAISE NOTICE 'Coluna last_login_at adicionada com sucesso';
        
        -- Atualizar registros existentes com a data de criação
        UPDATE users 
        SET last_login_at = created_at 
        WHERE last_login_at IS NULL;
        
        RAISE NOTICE 'Registros existentes atualizados com data de criação';
    ELSE
        RAISE NOTICE 'Coluna last_login_at já existe';
    END IF;
END $$;

-- Verificar se há sessões para atualizar a última atividade
DO $$
BEGIN
    -- Atualizar last_login_at com a última atividade das sessões
    UPDATE users 
    SET last_login_at = (
        SELECT MAX(last_activity) 
        FROM user_sessions 
        WHERE user_sessions.user_id = users.id
    )
    WHERE EXISTS (
        SELECT 1 FROM user_sessions 
        WHERE user_sessions.user_id = users.id
    );
    
    RAISE NOTICE 'Última atividade atualizada baseada nas sessões';
END $$;
