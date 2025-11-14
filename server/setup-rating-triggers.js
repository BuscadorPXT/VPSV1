
// server/setup-rating-triggers.js

import { db } from './db.ts';
import { sql } from 'drizzle-orm';

async function setupTriggers() {
  console.log('🔧 Configurando gatilhos (triggers) para o sistema de avaliações...');

  try {
    // ETAPA 1: Garantir que a função de atualização existe (do script anterior)
    console.log('🔄 Verificando/Criando a função de agregação...');
    await db.execute(sql`
      CREATE OR REPLACE FUNCTION update_supplier_rating_aggregates(supplier_id_param INTEGER)
      RETURNS VOID AS $$
      BEGIN
        -- Usamos um Common Table Expression (CTE) para calcular os agregados uma única vez
        WITH stats AS (
          SELECT
            ROUND(AVG(rating)::numeric, 2) as avg_r,
            COUNT(id) as count_r
          FROM supplier_ratings
          WHERE supplier_id = supplier_id_param AND is_approved = true
        )
        UPDATE suppliers
        SET
          average_rating = COALESCE((SELECT avg_r FROM stats), 0.00),
          rating_count = COALESCE((SELECT count_r FROM stats), 0)
        WHERE id = supplier_id_param;
      END;
      $$ LANGUAGE plpgsql;
    `);
    console.log('✅ Função de agregação pronta.');

    // ETAPA 2: Criar a função que será chamada pelo gatilho
    console.log('🔨 Criando a função do gatilho...');
    await db.execute(sql`
      CREATE OR REPLACE FUNCTION trigger_update_supplier_stats()
      RETURNS TRIGGER AS $$
      BEGIN
        -- Se uma avaliação for INSERIDA e já vier aprovada (caso raro)
        IF (TG_OP = 'INSERT' AND NEW.is_approved = true) THEN
          PERFORM update_supplier_rating_aggregates(NEW.supplier_id);
        -- Se uma avaliação for ATUALIZADA
        ELSIF (TG_OP = 'UPDATE') THEN
          -- Recalcula se a avaliação foi APROVADA ou DESAPROVADA
          IF (NEW.is_approved IS DISTINCT FROM OLD.is_approved) THEN
            PERFORM update_supplier_rating_aggregates(NEW.supplier_id);
          END IF;
        -- Se uma avaliação APROVADA for DELETADA
        ELSIF (TG_OP = 'DELETE' AND OLD.is_approved = true) THEN
           PERFORM update_supplier_rating_aggregates(OLD.supplier_id);
        END IF;
        
        -- Importante: retornar o registro apropriado baseado na operação
        IF TG_OP = 'DELETE' THEN
          RETURN OLD;
        ELSE
          RETURN NEW;
        END IF;
      END;
      $$ LANGUAGE plpgsql;
    `);
    console.log('✅ Função do gatilho criada.');

    // ETAPA 3: Criar o gatilho que conecta o evento à função
    console.log('🔗 Criando e conectando o gatilho à tabela supplier_ratings...');
    // Primeiro, remove o gatilho antigo se ele existir, para evitar duplicatas
    await db.execute(sql`DROP TRIGGER IF EXISTS ratings_update_trigger ON supplier_ratings;`);
    await db.execute(sql`
      CREATE TRIGGER ratings_update_trigger
      AFTER INSERT OR UPDATE OR DELETE ON supplier_ratings
      FOR EACH ROW
      EXECUTE FUNCTION trigger_update_supplier_stats();
    `);
    console.log('✅ Gatilho conectado com sucesso.');

    // ETAPA 4: Verificar se o gatilho foi criado corretamente
    console.log('🔍 Verificando a instalação do gatilho...');
    const triggerCheck = await db.execute(sql`
      SELECT trigger_name, event_manipulation, event_object_table
      FROM information_schema.triggers
      WHERE trigger_name = 'ratings_update_trigger';
    `);

    if (triggerCheck.length > 0) {
      console.log('✅ Gatilho instalado e funcionando:');
      triggerCheck.forEach(trigger => {
        console.log(`   - ${trigger.trigger_name} em ${trigger.event_object_table} para ${trigger.event_manipulation}`);
      });
    } else {
      console.log('⚠️ Gatilho não encontrado - possível erro na instalação');
    }

    console.log('\n🎉 Sistema de atualização automática de avaliações está ATIVO!');
    console.log('📋 O que acontece agora:');
    console.log('   ✅ Quando um admin aprovar uma avaliação → estatísticas atualizadas automaticamente');
    console.log('   ✅ Quando uma avaliação for rejeitada/deletada → estatísticas recalculadas');
    console.log('   ✅ Quando uma nova avaliação aprovada for inserida → estatísticas atualizadas');
    
    process.exit(0);

  } catch (error) {
    console.error('❌ Erro fatal durante a configuração dos gatilhos:', error);
    process.exit(1);
  }
}

// Corrigir: chamar setupTriggers ao invés de main
setupTriggers();
