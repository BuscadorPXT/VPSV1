import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  BarChart3,
  UserPlus,
  Users,
  Globe,
  AlertTriangle,
  Key,
  MessageSquare,
  Bell,
  MessageCircle,
  Star,
  Building2,
  CreditCard,
  DollarSign,
  Settings,
  User,
  ChevronLeft,
  X,
  Calendar,
  Home
} from 'lucide-react';

interface MenuItem {
  value: string;
  label: string;
  icon: React.ReactNode;
  path: string;
  badge?: string;
  disabled?: boolean;
}

const menuItems: MenuItem[] = [
  { value: 'dashboard', label: 'Dashboard', icon: <Home className="h-5 w-5" />, path: '/admin' },
  { value: 'users', label: 'Usuários', icon: <Users className="h-5 w-5" />, path: '/admin' },
  { value: 'diagnostic', label: 'Diagnóstico', icon: <User className="h-5 w-5" />, path: '/admin/user-diagnostic' },
  { value: 'sessions', label: 'Sessões', icon: <Globe className="h-5 w-5" />, path: '/admin' },
  { value: 'cobrancas', label: 'Cobranças', icon: <DollarSign className="h-5 w-5" />, path: '/admin/cobrancas' },
  { value: 'feedback', label: 'Feedback', icon: <MessageSquare className="h-5 w-5" />, path: '/admin/feedback-alerts' },
  { value: 'encontro', label: 'Evento', icon: <Calendar className="h-5 w-5" />, path: '/admin/encontro' },
  { value: 'ratings', label: 'Avaliações', icon: <Star className="h-5 w-5" />, path: '/admin/ratings', disabled: true },
];

interface AdminSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  className?: string;
}

export function AdminSidebar({ isOpen = true, onClose, className }: AdminSidebarProps) {
  const [location, setLocation] = useLocation();

  const isActive = (path: string) => {
    if (path === '/admin') {
      return location === '/admin';
    }
    return location.startsWith(path);
  };

  const handleNavigation = (path: string) => {
    setLocation(path);
    if (onClose) {
      onClose();
    }
  };

  return (
    <aside
      className={cn(
        'fixed top-0 left-0 z-50 h-screen w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700 transform transition-transform duration-200 ease-in-out',
        isOpen ? 'translate-x-0' : '-translate-x-full',
        'lg:translate-x-0',
        className
      )}
    >
      <div className="flex flex-col h-full">
        {/* Sidebar Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Admin Panel</h2>
            {onClose && (
              <Button
                variant="ghost"
                size="sm"
                className="lg:hidden"
                onClick={onClose}
              >
                <X className="h-5 w-5" />
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            Sistema Online
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 overflow-y-auto p-2 space-y-1">
            {menuItems.map((item) => (
              <button
                key={item.value}
                onClick={() => !item.disabled && handleNavigation(item.path)}
                disabled={item.disabled}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors',
                  isActive(item.path)
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 font-medium'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800',
                  item.disabled && 'opacity-50 cursor-not-allowed'
                )}
              >
                {item.icon}
                <span className="flex-1 text-left">{item.label}</span>
                {item.badge && (
                  <Badge variant="secondary" className="text-xs">
                    {item.badge}
                  </Badge>
                )}
                {item.disabled && (
                  <Badge variant="outline" className="text-xs">
                    Em breve
                  </Badge>
                )}
              </button>
            ))}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-700">
          <Button
            variant="outline"
            onClick={() => setLocation('/buscador')}
            className="w-full flex items-center justify-center gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Voltar ao Dashboard
          </Button>
        </div>
      </div>
    </aside>
  );
}
