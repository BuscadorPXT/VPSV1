import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, AlertTriangle, Mail, Shield } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

interface ApprovalBlockingModalProps {
  user: {
    email: string;
    name?: string;
    createdAt: string;
    isApproved?: boolean;
    rejectedAt?: string;
    rejectionReason?: string;
  };
}

export const ApprovalBlockingModal = ({ user }: ApprovalBlockingModalProps) => {
  const { logout } = useAuth();

  const isRejected = user.rejectedAt && user.rejectionReason;

  return (
    <Dialog open={true}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isRejected ? (
              <>
                <AlertTriangle className="h-5 w-5 text-red-500" />
                Acesso Negado
              </>
            ) : (
              <>
                <Clock className="h-5 w-5 text-yellow-500" />
                Aguardando Aprovação
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {isRejected 
              ? "Sua solicitação de acesso foi rejeitada"
              : "Seu cadastro está sendo analisado pela equipe administrativa"
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Informações da Conta
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium">Email:</span> {user.email}
                </div>
                {user.name && (
                  <div>
                    <span className="font-medium">Nome:</span> {user.name}
                  </div>
                )}
                <div>
                  <span className="font-medium">Cadastro:</span>{" "}
                  {new Date(user.createdAt).toLocaleDateString('pt-BR')}
                </div>
              </div>
            </CardContent>
          </Card>

          {isRejected ? (
            <Card className="border-red-200 dark:border-red-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-red-700 dark:text-red-300 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Motivo da Rejeição
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-red-600 dark:text-red-400">
                  {user.rejectionReason}
                </p>
                <p className="text-xs text-red-500 dark:text-red-500 mt-2">
                  Rejeitado em: {new Date(user.rejectedAt!).toLocaleDateString('pt-BR')}
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20">
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <Shield className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                  <div className="space-y-2 text-sm">
                    <p className="text-yellow-800 dark:text-yellow-200 font-medium">
                      Processo de Aprovação
                    </p>
                    <p className="text-yellow-700 dark:text-yellow-300">
                      Nossa equipe está analisando sua solicitação de acesso. Você receberá uma 
                      notificação por email assim que sua conta for aprovada.
                    </p>
                    <p className="text-yellow-600 dark:text-yellow-400 text-xs">
                      Tempo estimado: 24-48 horas úteis
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="flex justify-center pt-4">
          <Button onClick={() => logout()} variant="outline" className="w-full">
            Voltar ao Login
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};