import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Bell } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { formatPrice } from "@/lib/formatters";

interface PriceAlertDialogProps {
  productModel: string;
  currentPrice: string;
}

export function PriceAlertDialog({ productModel, currentPrice }: PriceAlertDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [thresholdPrice, setThresholdPrice] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createAlertMutation = useMutation({
    mutationFn: async (data: { model: string; thresholdPrice: string }) => {
      const response = await fetch("/api/alerts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create alert");
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Alerta criado!",
        description: `Você será notificado quando o preço do ${productModel} estiver abaixo de R$${thresholdPrice}`,
      });
      setIsOpen(false);
      setThresholdPrice("");
      queryClient.invalidateQueries({ queryKey: ["/api/alerts"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar alerta",
        description: error.message || "Não foi possível criar o alerta de preço",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!thresholdPrice || parseFloat(thresholdPrice) <= 0) {
      toast({
        title: "Preço inválido",
        description: "Digite um preço válido para o alerta",
        variant: "destructive",
      });
      return;
    }

    createAlertMutation.mutate({
      model: productModel,
      thresholdPrice,
    });
  };

;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Bell className="h-4 w-4" />
          Criar Alerta
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Criar Alerta de Preço</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="model">Produto</Label>
            <Input
              id="model"
              value={productModel}
              disabled
              className="bg-gray-50"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="currentPrice">Preço Atual</Label>
            <Input
              id="currentPrice"
              value={`R$ ${formatPrice(currentPrice)}`}
              disabled
              className="bg-gray-50"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="thresholdPrice">
              Preço de Alerta (você será notificado quando o preço estiver igual ou abaixo)
            </Label>
            <Input
              id="thresholdPrice"
              type="number"
              step="0.01"
              min="0"
              placeholder="Digite o preço limite"
              value={thresholdPrice}
              onChange={(e) => setThresholdPrice(e.target.value)}
              required
            />
          </div>
          
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={createAlertMutation.isPending}
            >
              {createAlertMutation.isPending ? "Criando..." : "Criar Alerta"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}