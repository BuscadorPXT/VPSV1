import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { TrendingUp, DollarSign, Calculator, Target, Download, Copy } from 'lucide-react';

interface InterestListItem {
  id: number;
  supplierPrice: number;
  quantity: number;
  marginValue?: number;
  marginType?: 'percentage' | 'fixed';
  salesPrice?: number;
}

interface InterestListSummaryProps {
  items: InterestListItem[];
  className?: string;
}

export function InterestListSummary({ items, className }: InterestListSummaryProps) {
  const formatPrice = (price: number) => `R$ ${price.toFixed(2).replace('.', ',')}`;

  // Function to generate export text
  const generateExportText = () => {
    const itemsWithMargin = items.filter(item => item.marginValue && item.marginValue > 0);
    
    if (itemsWithMargin.length === 0) {
      return "Nenhum item com margem definida para exportar.";
    }

    let exportText = "=== LISTA DE PREÇOS PARA VENDAS ===\n\n";
    exportText += `Data: ${new Date().toLocaleDateString('pt-BR')}\n`;
    exportText += `Produtos com margem definida: ${itemsWithMargin.length}\n\n`;

    itemsWithMargin.forEach((item, index) => {
      const costPrice = item.supplierPrice * item.quantity;
      let salesPrice = costPrice;
      let marginAmount = 0;

      if (item.marginValue && item.marginValue > 0) {
        if (item.marginType === 'percentage') {
          salesPrice = costPrice * (1 + item.marginValue / 100);
          marginAmount = salesPrice - costPrice;
        } else {
          marginAmount = item.marginValue * item.quantity;
          salesPrice = costPrice + marginAmount;
        }
      }

      exportText += `${index + 1}. PRODUTO: Item ID ${item.id}\n`;
      exportText += `   Custo: ${formatPrice(costPrice)}\n`;
      exportText += `   Margem: ${item.marginType === 'percentage' ? `${item.marginValue}%` : formatPrice(item.marginValue || 0)} (${formatPrice(marginAmount)})\n`;
      exportText += `   PREÇO DE VENDA: ${formatPrice(salesPrice)}\n`;
      exportText += `   Quantidade: ${item.quantity}\n\n`;
    });

    const totals = itemsWithMargin.reduce((acc, item) => {
      const itemCost = item.supplierPrice * item.quantity;
      let itemSalesPrice = itemCost;
      let itemMargin = 0;

      if (item.marginValue && item.marginValue > 0) {
        if (item.marginType === 'percentage') {
          itemSalesPrice = itemCost * (1 + item.marginValue / 100);
          itemMargin = itemSalesPrice - itemCost;
        } else {
          itemMargin = item.marginValue * item.quantity;
          itemSalesPrice = itemCost + itemMargin;
        }
      }

      return {
        totalCost: acc.totalCost + itemCost,
        totalMargin: acc.totalMargin + itemMargin,
        totalSales: acc.totalSales + itemSalesPrice,
      };
    }, { totalCost: 0, totalMargin: 0, totalSales: 0 });

    exportText += "=== RESUMO FINANCEIRO ===\n";
    exportText += `Custo Total: ${formatPrice(totals.totalCost)}\n`;
    exportText += `Lucro Total: ${formatPrice(totals.totalMargin)}\n`;
    exportText += `VALOR TOTAL DE VENDA: ${formatPrice(totals.totalSales)}\n\n`;
    exportText += "=== INSTRUÇÕES PARA VENDAS ===\n";
    exportText += "- Os preços acima já incluem a margem de lucro\n";
    exportText += "- Não aceitar valores abaixo dos preços listados\n";
    exportText += "- Para negociações, consultar gerência\n";
    exportText += `- Lista gerada em: ${new Date().toLocaleString('pt-BR')}\n`;

    return exportText;
  };

  // Function to copy text to clipboard
  const copyToClipboard = async () => {
    const text = generateExportText();
    try {
      await navigator.clipboard.writeText(text);
      // You might want to add a toast notification here
      console.log('Lista copiada para área de transferência');
    } catch (err) {
      console.error('Erro ao copiar:', err);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
  };

  // Function to download as text file
  const downloadAsFile = () => {
    const text = generateExportText();
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `lista-precos-vendas-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Calculate totals
  const totals = items.reduce((acc, item) => {
    const itemCost = item.supplierPrice * item.quantity;
    let itemSalesPrice = itemCost;
    let itemMargin = 0;

    if (item.marginValue && item.marginValue > 0) {
      if (item.marginType === 'percentage') {
        itemSalesPrice = itemCost * (1 + item.marginValue / 100);
        itemMargin = itemSalesPrice - itemCost;
      } else {
        itemMargin = item.marginValue * item.quantity;
        itemSalesPrice = itemCost + itemMargin;
      }
    }

    return {
      totalCost: acc.totalCost + itemCost,
      totalMargin: acc.totalMargin + itemMargin,
      totalSales: acc.totalSales + itemSalesPrice,
      itemsWithMargin: acc.itemsWithMargin + (item.marginValue && item.marginValue > 0 ? 1 : 0),
      totalItems: acc.totalItems + 1
    };
  }, {
    totalCost: 0,
    totalMargin: 0,
    totalSales: 0,
    itemsWithMargin: 0,
    totalItems: 0
  });

  const profitPercentage = totals.totalCost > 0 ? (totals.totalMargin / totals.totalCost) * 100 : 0;

  if (totals.totalItems === 0) {
    return null;
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calculator className="h-5 w-5" />
            Resumo Financeiro
          </CardTitle>
          
          {totals.itemsWithMargin > 0 && (
            <div className="flex items-center gap-2">
              <Button
                onClick={copyToClipboard}
                variant="outline"
                size="sm"
                className="text-blue-600 border-blue-200 hover:bg-blue-50 dark:text-blue-400 dark:border-blue-800 dark:hover:bg-blue-950"
              >
                <Copy className="h-4 w-4 mr-2" />
                Copiar Lista
              </Button>
              
              <Button
                onClick={downloadAsFile}
                variant="outline"
                size="sm"
                className="text-green-600 border-green-200 hover:bg-green-50 dark:text-green-400 dark:border-green-800 dark:hover:bg-green-950"
              >
                <Download className="h-4 w-4 mr-2" />
                Baixar TXT
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Total Cost */}
          <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="flex items-center justify-center mb-2">
              <DollarSign className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-medium text-blue-600 dark:text-blue-400 ml-1">
                Custo Total
              </span>
            </div>
            <div className="text-xl font-bold text-blue-700 dark:text-blue-300">
              {formatPrice(totals.totalCost)}
            </div>
            <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
              {totals.totalItems} {totals.totalItems === 1 ? 'item' : 'itens'}
            </div>
          </div>

          {/* Total Margin */}
          <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <div className="flex items-center justify-center mb-2">
              <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
              <span className="text-sm font-medium text-green-600 dark:text-green-400 ml-1">
                Lucro Total
              </span>
            </div>
            <div className="text-xl font-bold text-green-700 dark:text-green-300">
              {formatPrice(totals.totalMargin)}
            </div>
            <div className="text-xs text-green-600 dark:text-green-400 mt-1">
              {profitPercentage.toFixed(1)}% de margem
            </div>
          </div>

          {/* Total Sales */}
          <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <div className="flex items-center justify-center mb-2">
              <Target className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              <span className="text-sm font-medium text-purple-600 dark:text-purple-400 ml-1">
                Venda Total
              </span>
            </div>
            <div className="text-xl font-bold text-purple-700 dark:text-purple-300">
              {formatPrice(totals.totalSales)}
            </div>
            <div className="text-xs text-purple-600 dark:text-purple-400 mt-1">
              Preço final
            </div>
          </div>

          {/* Progress */}
          <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex items-center justify-center mb-2">
              <Calculator className="h-4 w-4 text-gray-600 dark:text-gray-400" />
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400 ml-1">
                Progresso
              </span>
            </div>
            <div className="text-xl font-bold text-gray-700 dark:text-gray-300">
              {totals.itemsWithMargin}/{totals.totalItems}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              com margem definida
            </div>
          </div>
        </div>

        {/* Export Instructions and Insights */}
        {totals.itemsWithMargin > 0 && (
          <div className="mt-4 space-y-3">
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="text-sm text-blue-800 dark:text-blue-200">
                <strong>📋 Exportação para Vendas:</strong>
                <ul className="mt-1 ml-4 space-y-1">
                  <li>• <strong>Copiar Lista:</strong> Copia texto formatado para WhatsApp/Email</li>
                  <li>• <strong>Baixar TXT:</strong> Salva arquivo com preços finais de venda</li>
                  <li>• Lista inclui custos + margens já calculadas</li>
                  <li>• Ideal para enviar à equipe de vendas</li>
                </ul>
              </div>
            </div>

            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
              <div className="text-sm text-amber-800 dark:text-amber-200">
                <strong>📊 Insights:</strong>
                <ul className="mt-1 ml-4 space-y-1">
                  <li>• Margem média por item: {formatPrice(totals.totalMargin / totals.itemsWithMargin)}</li>
                  <li>• ROI projetado: {profitPercentage.toFixed(1)}%</li>
                  {totals.itemsWithMargin < totals.totalItems && (
                    <li>• {totals.totalItems - totals.itemsWithMargin} {totals.totalItems - totals.itemsWithMargin === 1 ? 'item precisa' : 'itens precisam'} de margem definida</li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        )}

        {totals.itemsWithMargin === 0 && (
          <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="text-sm text-gray-600 dark:text-gray-400 text-center">
              <strong>ℹ️ Para usar a exportação:</strong>
              <p className="mt-1">Defina margens de lucro nos produtos acima para gerar lista de preços de venda</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}