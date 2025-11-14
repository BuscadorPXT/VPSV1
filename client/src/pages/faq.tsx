import React from 'react';
import { Link } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Search, Clock, Shield, Phone, Filter, MessageSquare, Users, Smartphone, Calendar, RefreshCw, ShoppingCart } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

const faqData = [
  {
    id: 1,
    question: "Como faço para buscar um produto específico?",
    answer: "Digite o nome genérico do produto no campo \"Buscar Produtos\" (ex: MacBook Pro M4). Em seguida, use os filtros para refinar por armazenamento, memória RAM, cor e região.",
    icon: Search,
    category: "Busca"
  },
  {
    id: 2,
    question: "Os preços mostrados são atualizados com que frequência?",
    answer: "As listas são integradas minutos após o envio pelos fornecedores, garantindo alta velocidade na atualização. Recomendamos sempre clicar em \"Atualizar Página\" para garantir que esteja visualizando a versão mais recente.",
    icon: Clock,
    category: "Preços"
  },
  {
    id: 3,
    question: "Os fornecedores são confiáveis?",
    answer: "Sim. Todos os fornecedores presentes foram validados previamente e só permanecem se forem confiáveis. Se você tiver qualquer problema grave com algum, relate diretamente (via WhatsApp ou suporte interno) e, se necessário, ele será removido da plataforma.",
    icon: Shield,
    category: "Confiabilidade"
  },
  {
    id: 4,
    question: "A plataforma intermedia as vendas?",
    answer: "Não. O Buscador PXT não intermedia pagamentos ou entregas. A compra acontece diretamente entre você e o fornecedor.",
    icon: ShoppingCart,
    category: "Vendas"
  },
  {
    id: 5,
    question: "Como entrar em contato com o fornecedor?",
    answer: "Clique sobre o nome do fornecedor, que é um link direto para o WhatsApp. Além disso, os quatro últimos dígitos do número do fornecedor são exibidos ao lado do nome, para facilitar a busca nos seus contatos.",
    icon: Phone,
    category: "Contato"
  },
  {
    id: 6,
    question: "O que significa a cor verde com \"Menor preço\"?",
    answer: "É o menor preço encontrado para aquele produto entre os fornecedores listados no dia. A plataforma faz essa comparação automaticamente.",
    icon: Badge,
    category: "Preços"
  },
  {
    id: 7,
    question: "É possível filtrar produtos por capacidade ou região?",
    answer: "Sim. Use os filtros superiores como Capacidade/MM, Região/GB-RAM, Cor, Categoria e Fornecedor.",
    icon: Filter,
    category: "Filtros"
  },
  {
    id: 8,
    question: "Há suporte técnico da plataforma?",
    answer: "Sim. Use o botão \"🛠 Bug\" no topo da tela para reportar erros ou chame diretamente o suporte via WhatsApp.",
    icon: MessageSquare,
    category: "Suporte"
  },
  {
    id: 9,
    question: "Posso indicar um fornecedor que costumo comprar?",
    answer: "Sim! Caso conheça algum fornecedor confiável que ainda não esteja na plataforma, envie o contato e a equipe fará a verificação. Se aprovado, ele será incluído na base.",
    icon: Users,
    category: "Fornecedores"
  },
  {
    id: 10,
    question: "A plataforma funciona no celular?",
    answer: "Sim. A interface é adaptada para dispositivos móveis e pode ser acessada pelo navegador normalmente.",
    icon: Smartphone,
    category: "Mobile"
  },
  {
    id: 11,
    question: "O que fazer se vejo poucos fornecedores pela manhã?",
    answer: "Se acessar logo cedo e a base estiver com apenas 3 ou 4 fornecedores, você pode ir até o filtro de DATA e selecionar o dia anterior para ter uma referência de preços e disponibilidade.",
    icon: Calendar,
    category: "Disponibilidade"
  },
  {
    id: 12,
    question: "Como vejo a data da última sincronização?",
    answer: "No canto superior direito, próximo ao botão \"Bug\", você verá \"Última sync\" com o horário da última atualização dos dados.",
    icon: RefreshCw,
    category: "Sincronização"
  },
  {
    id: 13,
    question: "A plataforma vende produtos diretamente?",
    answer: "Não. O Buscador PXT não vende nem armazena nenhum produto. Apenas organiza e compara os preços dos fornecedores parceiros.",
    icon: ShoppingCart,
    category: "Vendas"
  }
];

const categories = Array.from(new Set(faqData.map(item => item.category)));

const getCategoryColor = (category: string) => {
  const colors: Record<string, string> = {
    "Busca": "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
    "Preços": "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    "Confiabilidade": "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
    "Vendas": "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
    "Contato": "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300",
    "Filtros": "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300",
    "Suporte": "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
    "Fornecedores": "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
    "Mobile": "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-300",
    "Disponibilidade": "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300",
    "Sincronização": "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300"
  };
  return colors[category] || "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
};

export default function FAQPage() {
  const [selectedCategory, setSelectedCategory] = React.useState<string | null>(null);
  const [searchTerm, setSearchTerm] = React.useState('');

  const filteredFAQ = faqData.filter(item => {
    const matchesCategory = !selectedCategory || item.category === selectedCategory;
    const matchesSearch = !searchTerm || 
      item.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-6">
            <Link href="/buscador">
              <Button variant="outline" size="sm" className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Voltar ao Buscador
              </Button>
            </Link>
          </div>
          
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Perguntas Frequentes
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 mb-6">
              Buscador PXT - Encontre todas as respostas que você precisa
            </p>
          </div>

          {/* Search Bar */}
          <div className="relative max-w-md mx-auto mb-6">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Buscar perguntas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-600 dark:text-white"
            />
          </div>

          {/* Category Filters */}
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            <Button
              variant={selectedCategory === null ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(null)}
              className="rounded-full"
            >
              Todas
            </Button>
            {categories.map(category => (
              <Button
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(category)}
                className="rounded-full"
              >
                {category}
              </Button>
            ))}
          </div>
        </div>

        {/* FAQ Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredFAQ.map((item) => {
            const IconComponent = item.icon;
            return (
              <Card key={item.id} className="hover:shadow-lg transition-shadow duration-200 h-full">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                        <IconComponent className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                    </div>
                    <Badge 
                      variant="secondary" 
                      className={`${getCategoryColor(item.category)} text-xs font-medium`}
                    >
                      {item.category}
                    </Badge>
                  </div>
                  <CardTitle className="text-lg leading-tight">
                    {item.question}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                    {item.answer}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* No Results */}
        {filteredFAQ.length === 0 && (
          <div className="text-center py-12">
            <Search className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-300 mb-2">
              Nenhuma pergunta encontrada
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              Tente usar outros termos de busca ou remover os filtros.
            </p>
          </div>
        )}

        {/* Footer */}
        <Separator className="my-12" />
        <div className="text-center">
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6 max-w-2xl mx-auto">
            <MessageSquare className="w-8 h-8 text-blue-600 dark:text-blue-400 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Não encontrou sua resposta?
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Entre em contato conosco através do suporte ou reporte um problema usando o botão "🛠 Bug" na plataforma.
            </p>
            <Link href="/buscador">
              <Button className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Voltar ao Buscador
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}