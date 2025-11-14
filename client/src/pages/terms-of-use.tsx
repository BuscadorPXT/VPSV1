import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FileText, Shield, AlertTriangle, Database, Clock, Mail } from 'lucide-react';
import { useLocation } from 'wouter';

const TermsOfUsePage: React.FC = () => {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="outline"
            onClick={() => window.history.back()}
            className="mb-4 hover:bg-blue-50 dark:hover:bg-blue-900/20"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>

          <div className="text-center">
            <div className="flex items-center justify-center mb-4">
              <FileText className="h-8 w-8 text-blue-600 mr-3" />
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Termos de Uso
              </h1>
            </div>
            <p className="text-gray-600 dark:text-gray-300">
              Buscador PXT - Plataforma de Comparação de Preços
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              Última atualização: Janeiro de 2025
            </p>
          </div>
        </div>

        {/* Terms Content */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="h-5 w-5 mr-2 text-blue-600" />
              Termos e Condições de Uso
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 text-sm leading-relaxed">

            {/* Section 1: Definitions */}
            <section>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                <span className="bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mr-2">1</span>
                Definições
              </h3>
              <div className="space-y-2 pl-8">
                <p><strong>"Plataforma":</strong> O sistema Buscador PXT, incluindo website, aplicações e APIs.</p>
                <p><strong>"Usuário":</strong> Pessoa física ou jurídica que utiliza nossos serviços.</p>
                <p><strong>"Fornecedores":</strong> Empresas terceirizadas que fornecem informações de produtos e preços.</p>
                <p><strong>"Dados":</strong> Informações de produtos, preços e disponibilidade coletadas de fontes externas.</p>
              </div>
            </section>

            {/* Section 2: Supplier Disclaimer */}
            <section>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                <span className="bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mr-2">2</span>
                Isenção de Responsabilidade sobre Fornecedores
              </h3>
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-4 rounded-lg">
                <div className="flex items-start">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5 mr-2 flex-shrink-0" />
                  <div className="space-y-2">
                    <p><strong>Importante:</strong> O Buscador PXT é uma plataforma de comparação que agrega informações de diversos fornecedores externos.</p>
                    <ul className="list-disc list-inside space-y-1 ml-4">
                      <li>Não somos proprietários nem operadores das lojas listadas</li>
                      <li>Não controlamos os preços, estoque ou políticas dos fornecedores</li>
                      <li>Não intermediamos vendas ou transações comerciais</li>
                      <li>Cada fornecedor é responsável por suas próprias práticas comerciais</li>
                    </ul>
                  </div>
                </div>
              </div>
            </section>

            {/* Section 3: Price and Availability Information */}
            <section>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                <span className="bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mr-2">3</span>
                Informações de Preços e Disponibilidade
              </h3>
              <div className="space-y-3 pl-8">
                <p><strong>Atualizações:</strong> Os preços são atualizados periodicamente, mas podem não refletir valores em tempo real.</p>
                <p><strong>Verificação:</strong> Sempre confirme preços e disponibilidade diretamente com o fornecedor antes da compra.</p>
                <p><strong>Variações:</strong> Preços podem sofrer alterações sem aviso prévio pelos fornecedores.</p>
                <p><strong>Promoções:</strong> Ofertas especiais podem ter condições específicas não detalhadas na plataforma.</p>
              </div>
            </section>

            {/* Section 4: User Responsibilities */}
            <section>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                <span className="bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mr-2">4</span>
                Responsabilidades do Usuário
              </h3>
              <div className="space-y-2 pl-8">
                <p>• Usar a plataforma de forma ética e legal</p>
                <p>• Não realizar atividades que prejudiquem o sistema</p>
                <p>• Manter suas credenciais de acesso seguras</p>
                <p>• Respeitar os direitos de propriedade intelectual</p>
                <p>• Verificar informações antes de tomar decisões de compra</p>
              </div>
            </section>

            {/* Section 5: Data Policy */}
            <section>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                <span className="bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mr-2">5</span>
                Política de Dados
              </h3>
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4 rounded-lg">
                <div className="flex items-start">
                  <Database className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 mr-2 flex-shrink-0" />
                  <div className="space-y-2">
                    <p><strong>Coleta:</strong> Coletamos apenas dados necessários para o funcionamento da plataforma.</p>
                    <p><strong>Uso:</strong> Utilizamos informações para melhorar nossos serviços e personalizar a experiência.</p>
                    <p><strong>Compartilhamento:</strong> Não vendemos ou compartilhamos dados pessoais com terceiros para marketing.</p>
                    <p><strong>Segurança:</strong> Implementamos medidas de proteção adequadas para seus dados.</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Section 6: Service Availability */}
            <section>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                <span className="bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mr-2">6</span>
                Disponibilidade do Serviço
              </h3>
              <div className="space-y-2 pl-8">
                <p>• Buscamos manter alta disponibilidade da plataforma</p>
                <p>• Podem ocorrer manutenções programadas com aviso prévio</p>
                <p>• Não garantimos funcionamento ininterrupto do sistema</p>
                <p>• Reservamos o direito de fazer melhorias e atualizações</p>
              </div>
            </section>

            {/* Section 7: Intellectual Property */}
            <section>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                <span className="bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mr-2">7</span>
                Propriedade Intelectual
              </h3>
              <div className="space-y-2 pl-8">
                <p>• O Buscador PXT é protegido por direitos autorais e marcas registradas</p>
                <p>• É proibida a reprodução não autorizada de nosso conteúdo</p>
                <p>• Logotipos e nomes de fornecedores pertencem aos respectivos proprietários</p>
                <p>• Respeitamos os direitos de propriedade intelectual de terceiros</p>
              </div>
            </section>

            {/* Section 8: Modifications */}
            <section>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                <span className="bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mr-2">8</span>
                Modificações dos Termos
              </h3>
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border">
                <div className="flex items-start">
                  <Clock className="h-5 w-5 text-gray-600 dark:text-gray-400 mt-0.5 mr-2 flex-shrink-0" />
                  <div>
                    <p>Podemos atualizar estes termos periodicamente. Usuários serão notificados sobre mudanças significativas através da plataforma ou por e-mail.</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Section 9: Contact */}
            <section>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                <span className="bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mr-2">9</span>
                Contato e Suporte
              </h3>
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4 rounded-lg">
                <div className="flex items-start">
                  <Mail className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 mr-2 flex-shrink-0" />
                  <div className="space-y-2">
                    <p><strong>Dúvidas sobre estes termos?</strong></p>
                    <p>Entre em contato conosco:</p>
                    <p>• E-mail: <a href="mailto:suporte@buscadorpxt.com" className="text-blue-600 dark:text-blue-400 hover:underline">suporte@buscadorpxt.com</a></p>
                    <p>• Horário: Segunda a Sexta, 9h às 18h</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Acceptance Notice */}
            <div className="mt-8 p-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Aceitação dos Termos</h4>
              <p className="text-blue-800 dark:text-blue-200">
                Ao utilizar o Buscador PXT, você confirma que leu, compreendeu e aceita estes Termos de Uso em sua totalidade. 
                Se não concordar com algum ponto, recomendamos não utilizar nossa plataforma.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            onClick={() => setLocation('/buscador')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2"
          >
            Voltar ao Dashboard
          </Button>
          <Button
            variant="outline"
            onClick={() => window.print()}
            className="border-blue-200 text-blue-600 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-900/20 px-6 py-2"
          >
            Imprimir Termos
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TermsOfUsePage;