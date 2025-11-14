
-- Adicionar coluna delay_seconds à tabela feedback_alerts existente
ALTER TABLE feedback_alerts 
ADD COLUMN IF NOT EXISTS delay_seconds INTEGER DEFAULT 15;

-- Atualizar avisos existentes que não têm delay configurado
UPDATE feedback_alerts 
SET delay_seconds = 15 
WHERE delay_seconds IS NULL;
