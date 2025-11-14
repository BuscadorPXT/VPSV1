
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/api-client';

interface BugReportData {
  title: string;
  description: string;
  steps: string;
  expected: string;
  actual: string;
  severity: 'baixa' | 'media' | 'alta' | 'critica';
  category: 'ui' | 'funcionalidade' | 'performance' | 'dados' | 'outro';
}

export function useBugReport() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const submitBugReport = async (data: BugReportData) => {
    setIsSubmitting(true);

    try {
      // Adicionar informações do navegador e URL atual
      const payload = {
        ...data,
        browserInfo: navigator.userAgent,
        url: window.location.href,
      };

      const response = await apiRequest('/api/bug-report/submit', 'POST', payload);
      
      if (response.ok) {
        const result = await response.json();
        
        toast({
          title: "Bug reportado com sucesso!",
          description: `Relatório ${result.reportId} foi enviado para nossa equipe.`,
        });

        return { success: true, reportId: result.reportId };
      } else {
        throw new Error('Falha ao enviar relatório');
      }
    } catch (error) {
      console.error('Erro ao enviar bug report:', error);
      toast({
        title: "Erro ao enviar relatório",
        description: "Tente novamente em alguns instantes.",
        variant: "destructive",
      });
      return { success: false, error };
    } finally {
      setIsSubmitting(false);
    }
  };

  const testWebhook = async () => {
    try {
      const response = await apiRequest('/api/bug-report/test-webhook', 'GET');
      
      if (response.ok) {
        toast({
          title: "Teste de webhook",
          description: "Mensagem de teste enviada para o Discord!",
        });
        return { success: true };
      } else {
        throw new Error('Falha no teste do webhook');
      }
    } catch (error) {
      console.error('Erro no teste do webhook:', error);
      toast({
        title: "Erro no teste",
        description: "Falha ao testar webhook do Discord.",
        variant: "destructive",
      });
      return { success: false, error };
    }
  };

  return {
    submitBugReport,
    testWebhook,
    isSubmitting,
  };
}
