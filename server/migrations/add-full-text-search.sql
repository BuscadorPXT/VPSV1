
-- Migração para implementar Full-Text Search na tabela products
-- Adiciona coluna search_vector e índice GIN para otimizar buscas

-- 1. Adicionar coluna search_vector do tipo tsvector
ALTER TABLE products ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- 2. Criar índice GIN para otimizar consultas FTS
CREATE INDEX IF NOT EXISTS idx_products_search_vector ON products USING GIN(search_vector);

-- 3. Função para atualizar o search_vector
CREATE OR REPLACE FUNCTION update_products_search_vector() 
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector := 
        setweight(to_tsvector('portuguese', COALESCE(NEW.model, '')), 'A') ||
        setweight(to_tsvector('portuguese', COALESCE(NEW.brand, '')), 'B') ||
        setweight(to_tsvector('portuguese', COALESCE(NEW.category, '')), 'C') ||
        setweight(to_tsvector('portuguese', COALESCE(NEW.color, '')), 'D') ||
        setweight(to_tsvector('portuguese', COALESCE(NEW.capacity, '')), 'D');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Criar trigger para atualizar automaticamente o search_vector
DROP TRIGGER IF EXISTS trigger_update_products_search_vector ON products;
CREATE TRIGGER trigger_update_products_search_vector
    BEFORE INSERT OR UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_products_search_vector();

-- 5. Atualizar todos os registros existentes
UPDATE products SET search_vector = 
    setweight(to_tsvector('portuguese', COALESCE(model, '')), 'A') ||
    setweight(to_tsvector('portuguese', COALESCE(brand, '')), 'B') ||
    setweight(to_tsvector('portuguese', COALESCE(category, '')), 'C') ||
    setweight(to_tsvector('portuguese', COALESCE(color, '')), 'D') ||
    setweight(to_tsvector('portuguese', COALESCE(capacity, '')), 'D')
WHERE search_vector IS NULL;

-- 6. Tornar a coluna NOT NULL após popular os dados
ALTER TABLE products ALTER COLUMN search_vector SET NOT NULL;

-- Comentários sobre os pesos:
-- A: Peso máximo - modelo do produto (mais relevante)
-- B: Peso alto - marca
-- C: Peso médio - categoria
-- D: Peso baixo - cor e capacidade
