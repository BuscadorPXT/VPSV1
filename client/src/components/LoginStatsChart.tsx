// NOVA IMPLEMENTAÇÃO - 31/05/2025 - Gráfico de logins dos últimos 7 dias
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, Users, Calendar } from "lucide-react";

interface LoginStatData {
  date: string;
  count: number;
  dayName: string;
}

export function LoginStatsChart() {
  const { data: loginStats = [], isLoading, error } = useQuery<LoginStatData[]>({
    queryKey: ['/api/admin/login-stats'],
    refetchInterval: 300000, // Atualiza a cada 5 minutos
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Logins dos Últimos 7 Dias
          </CardTitle>
          <CardDescription>
            Análise de atividade de login por dia
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Logins dos Últimos 7 Dias
          </CardTitle>
          <CardDescription>
            Erro ao carregar dados de login
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            <p>Não foi possível carregar os dados</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalLogins = loginStats.reduce((sum, day) => sum + day.count, 0);
  const averageLogins = totalLogins / 7;
  const maxLogins = Math.max(...loginStats.map(day => day.count));

  const formatTooltipLabel = (label: string) => {
    const date = new Date(label);
    return date.toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: '2-digit',
      month: '2-digit'
    });
  };

  const formatChartData = loginStats.map(item => ({
    ...item,
    displayDate: new Date(item.date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit'
    })
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-blue-600" />
          Logins dos Últimos 7 Dias
        </CardTitle>
        <CardDescription>
          Análise de atividade de login por dia
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Resumo estatístico */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                Total
              </span>
            </div>
            <p className="text-xl font-bold text-blue-900 dark:text-blue-100">
              {totalLogins}
            </p>
          </div>

          <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-700 dark:text-green-300">
                Média diária
              </span>
            </div>
            <p className="text-xl font-bold text-green-900 dark:text-green-100">
              {averageLogins.toFixed(1)}
            </p>
          </div>

          <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium text-purple-700 dark:text-purple-300">
                Pico máximo
              </span>
            </div>
            <p className="text-xl font-bold text-purple-900 dark:text-purple-100">
              {maxLogins}
            </p>
          </div>
        </div>

        {/* Gráfico de barras */}
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={formatChartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey="displayDate"
                tick={{ fontSize: 12 }}
                tickLine={{ stroke: '#6b7280' }}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                tickLine={{ stroke: '#6b7280' }}
                allowDecimals={false}
              />
              <Tooltip
                labelFormatter={formatTooltipLabel}
                formatter={(value: number) => [value, 'Logins']}
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px',
                  color: 'hsl(var(--foreground))'
                }}
              />
              <Bar 
                dataKey="count" 
                fill="#3b82f6"
                radius={[4, 4, 0, 0]}
                maxBarSize={50}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Detalhes por dia */}
        <div className="mt-4">
          <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
            Detalhes por dia:
          </h4>
          <div className="grid grid-cols-7 gap-2">
            {loginStats.map((day, index) => (
              <div 
                key={day.date}
                className="text-center p-2 bg-slate-50 dark:bg-slate-800 rounded"
              >
                <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                  {day.dayName}
                </div>
                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {day.count}
                </div>
                <div className="text-xs text-slate-400 dark:text-slate-500">
                  {new Date(day.date).getDate()}/{new Date(day.date).getMonth() + 1}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}