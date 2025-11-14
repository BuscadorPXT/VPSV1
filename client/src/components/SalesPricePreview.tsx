
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Eye, EyeOff, Copy, Download } from 'lucide-react';

interface SalesPricePreviewProps {
  items: Array<{
    id: number;
    supplierPrice: number;
    quantity: number;
    marginValue?: number;
    marginType?: 'percentage' | 'fixed';
    salesPrice?: number;
  }>;
  className?: string;
}

export function SalesPricePreview({ items, className }: SalesPricePreviewProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const formatPrice = (price: number) => `R$ ${price.toFixed(2).replace('.', ',')}`;

  const generateSalesText = () => {
    const itemsWithMargin = items.filter(item => item.marginValue && item.marginValue > 0);
    
    if (itemsWithMargin.length === 0) {
      return "Defina margens de lucro nos produtos para gerar a lista de vendas.";
    }

    let salesText = "🏷️ LISTA DE PREÇOS - EQUIPE DE VENDAS\n\n";
    salesText += `📅 Data: ${new Date().toLocaleDateString('pt-BR')}\n`;
    salesText += `📦 Produtos: ${itemsWithMargin.length} itens\n\n`;

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

      salesText += `${index + 1}️⃣ ITEM #${item.id}\n`;
      salesText += `💰 VENDER POR: ${formatPrice(salesPrice)}\n`;
      salesText += `📊 Quantidade: ${item.quantity}\n`;
      salesText += `💡 Margem: ${item.marginType === 'percentage' ? `${item.marginValue}%` : formatPrice(item.marginValue || 0)}\n\n`;
    });

    const totals = itemsWithMargin.reduce((acc, item) => {
      const itemCost = item.supplierPrice * item.quantity;
      let itemSalesPrice = itemCost;

      if (item.marginValue && item.marginValue > 0) {
        if (item.marginType === 'percentage') {
          itemSalesPrice = itemCost * (1 + item.marginValue / 100);
        } else {
          itemSalesPrice = itemCost + (item.marginValue * item.quantity);
        }
      }

      return {
        totalSales: acc.totalSales + itemSalesPrice,
      };
    }, { totalSales: 0 });

    salesText += "💼 TOTAL GERAL: " + formatPrice(totals.totalSales) + "\n\n";
    salesText += "⚠️ IMPORTANTE:\n";
    salesText += "• Preços já incluem margem de lucro\n";
    salesText += "• Não vender abaixo dos valores listados\n";
    salesText += "• Para descontos, consultar gerência\n\n";
    salesText += `🕐 Gerado em: ${new Date().toLocaleString('pt-BR')}`;

    return salesText;
  };

  const copyToClipboard = async () => {
    const text = generateSalesText();
    try {
      await navigator.clipboard.writeText(text);
      console.log('Lista copiada para área de transferência');
    } catch (err) {
      console.error('Erro ao copiar:', err);
    }
  };

  const downloadAsFile = () => {
    const text = generateSalesText();
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `precos-vendas-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const itemsWithMargin = items.filter(item => item.marginValue && item.marginValue > 0);

  if (itemsWithMargin.length === 0) {
    return null;
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Eye className="h-5 w-5" />
            Prévia da Lista de Vendas
          </CardTitle>
          
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setIsExpanded(!isExpanded)}
              variant="ghost"
              size="sm"
            >
              {isExpanded ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {isExpanded ? 'Ocultar' : 'Mostrar'}
            </Button>
            
            <Button
              onClick={copyToClipboard}
              variant="outline"
              size="sm"
              className="text-blue-600 border-blue-200 hover:bg-blue-50"
            >
              <Copy className="h-4 w-4 mr-1" />
              Copiar
            </Button>
            
            <Button
              onClick={downloadAsFile}
              variant="outline"
              size="sm"
              className="text-green-600 border-green-200 hover:bg-green-50"
            >
              <Download className="h-4 w-4 mr-1" />
              Baixar
            </Button>
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent>
          <div className="space-y-3">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Lista formatada para WhatsApp, email ou impressão:
            </div>
            
            <Textarea
              value={generateSalesText()}
              readOnly
              className="min-h-[400px] font-mono text-sm"
              placeholder="Defina margens nos produtos para ver a prévia..."
            />
            
            <div className="text-xs text-gray-500 dark:text-gray-400">
              💡 Esta lista pode ser copiada e enviada diretamente para sua equipe de vendas
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
