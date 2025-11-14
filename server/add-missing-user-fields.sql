
-- Adicionar campos faltantes na tabela users
DO $$ 
BEGIN
  -- Adicionar campo whatsapp se não existir
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'users' AND column_name = 'whatsapp') THEN
    ALTER TABLE users ADD COLUMN whatsapp text;
  END IF;
  
  -- Adicionar campo phone se não existir
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'users' AND column_name = 'phone') THEN
    ALTER TABLE users ADD COLUMN phone text;
  END IF;
  
  -- Adicionar campo status se não existir
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'users' AND column_name = 'status') THEN
    ALTER TABLE users ADD COLUMN status text DEFAULT 'pending_approval';
  END IF;
  
  -- Adicionar campo role se não existir
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'users' AND column_name = 'role') THEN
    ALTER TABLE users ADD COLUMN role text DEFAULT 'user';
  END IF;
  
  -- Adicionar campo apiKey se não existir
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'users' AND column_name = 'apiKey') THEN
    ALTER TABLE users ADD COLUMN "apiKey" text;
  END IF;
  
  -- Adicionar campo apiKeyCreatedAt se não existir
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'users' AND column_name = 'apiKeyCreatedAt') THEN
    ALTER TABLE users ADD COLUMN "apiKeyCreatedAt" timestamp;
  END IF;
  
  -- Adicionar campo isSubscriptionActive se não existir
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'users' AND column_name = 'isSubscriptionActive') THEN
    ALTER TABLE users ADD COLUMN "isSubscriptionActive" boolean DEFAULT false;
  END IF;
  
  -- Adicionar campos de aprovação se não existirem
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'users' AND column_name = 'approvedBy') THEN
    ALTER TABLE users ADD COLUMN "approvedBy" integer;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'users' AND column_name = 'approvedAt') THEN
    ALTER TABLE users ADD COLUMN "approvedAt" timestamp;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'users' AND column_name = 'rejectedBy') THEN
    ALTER TABLE users ADD COLUMN "rejectedBy" integer;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'users' AND column_name = 'rejectedAt') THEN
    ALTER TABLE users ADD COLUMN "rejectedAt" timestamp;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'users' AND column_name = 'rejectionReason') THEN
    ALTER TABLE users ADD COLUMN "rejectionReason" text;
  END IF;
END $$;

-- Atualizar usuarios existentes sem role
UPDATE users SET role = 'user' WHERE role IS NULL;
UPDATE users SET status = 'pending_approval' WHERE status IS NULL AND "isApproved" = false;
UPDATE users SET status = 'approved' WHERE status IS NULL AND "isApproved" = true;
UPDATE users SET "isSubscriptionActive" = false WHERE "isSubscriptionActive" IS NULL;

-- Exibir resultado
SELECT 'Campos adicionados com sucesso!' as resultado;
