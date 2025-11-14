import { Search, Sparkles, Clock } from 'lucide-react';
import { Link } from 'wouter';

export function AISearchPage() {
  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-3">
          <Sparkles className="w-8 h-8 text-blue-600" />
          Busca Inteligente
        </h1>
        <p className="text-gray-600 dark:text-gray-300">
          Busca avançada com IA para encontrar produtos com linguagem natural
        </p>
      </div>
      
      {/* Coming Soon Card */}
      <div className="max-w-2xl mx-auto">
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl border border-blue-200 dark:border-blue-800 p-8 text-center">
          <div className="mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 dark:bg-blue-900/40 rounded-full mb-4">
              <Search className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
              Em Desenvolvimento
            </h2>
            <p className="text-gray-600 dark:text-gray-300 text-lg leading-relaxed">
              Nossa busca inteligente com IA está sendo desenvolvida para oferecer uma experiência revolucionária de pesquisa de produtos.
            </p>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 mb-6 border border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Recursos que estão chegando:</h3>
            <ul className="text-left space-y-2 text-gray-600 dark:text-gray-300">
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                Pesquisa em linguagem natural
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                Sugestões inteligentes de produtos
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                Comparação automática de preços
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                Recomendações personalizadas
              </li>
            </ul>
          </div>
          
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <Clock className="w-4 h-4" />
            <span>Atualização planejada para próximas versões</span>
          </div>
        </div>
        
        {/* Quick Access to Regular Search */}
        <div className="mt-8 text-center">
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            Enquanto isso, você pode usar nossa busca tradicional:
          </p>
          <Link 
            href="/buscador" 
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            <Search className="w-4 h-4" />
            Ir para o Buscador
          </Link>
        </div>
      </div>
    </div>
  );
}