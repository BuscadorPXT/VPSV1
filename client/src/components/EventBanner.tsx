import { useState, useEffect } from 'react';
import { X, PartyPopper } from 'lucide-react';
import { Link } from 'wouter';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function EventBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if banner was already dismissed
    const dismissed = localStorage.getItem('eventBannerDismissed');
    if (!dismissed) {
      setIsVisible(true);
    }
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem('eventBannerDismissed', 'true');
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-md animate-in slide-in-from-bottom-5 duration-500">
      <Card className="border-0 shadow-2xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 p-1">
        <div className="bg-white dark:bg-gray-900 rounded-lg p-4 relative">
          <button
            onClick={handleDismiss}
            className="absolute top-2 right-2 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Fechar"
            data-testid="button-dismiss-banner"
          >
            <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          </button>

          <div className="flex items-start gap-3 pr-6">
            <div className="flex-shrink-0 p-2 bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/50 dark:to-pink-900/50 rounded-lg">
              <PartyPopper className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            
            <div className="flex-1">
              <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-1">
                🎉 Primeiro Encontro de Networking!
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                Participe do nosso evento exclusivo. Conecte-se com profissionais do setor Apple!
              </p>
              <Link href="/encontro">
                <Button 
                  size="sm" 
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                  data-testid="button-go-to-event"
                >
                  Inscrever-se Agora
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
