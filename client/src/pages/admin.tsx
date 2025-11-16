import { useState, useMemo, lazy, Suspense } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
// ⚡ OTIMIZAÇÃO: Lazy load XLSX (500KB) - carrega apenas quando necessário
// import * as XLSX from 'xlsx';

// ⚡ OTIMIZAÇÃO: Lazy load seções pesadas do dashboard
const DashboardOverviewSection = lazy(() => import('@/pages/admin/sections/DashboardOverviewSection').then(m => ({ default: m.DashboardOverviewSection })));
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ProfitMarginsTest } from '@/components/ProfitMarginsTest';
import { 
  Users, 
  UserCheck, 
  User,
  Settings, 
  Shield, 
  RefreshCw, 
  AlertTriangle,
  Siren,
  Megaphone,
  Search,
  Filter,
  ArrowUp,
  ArrowDown,
  LogOut,
  Trash2,
  MessageCircle,
  Bell,
  TrendingUp,
  Activity,
  Clock,
  CheckCircle,
  XCircle,
  Mail,
  UserX,
  Key,
  Download,
  Upload,
  BarChart3,
  Calendar,
  Globe,
  Smartphone,
  Monitor,
  Laptop,
  Tablet,
  Zap,
  AlertCircle,
  ExternalLink,
  DollarSign,
  Star,
  Heart,
  Bookmark,
  MessageSquare,
  UserPlus,
  Eye,
  Lock,
  Unlock,
  Ban,
  CheckSquare,
  X,
  Plus,
  Minus,
  Edit,
  MoreHorizontal,
  Copy,
  Share,
  Archive,
  Unarchive,
  Flag,
  Info,
  HelpCircle,
  FileText,
  Database,
  Building2,
  Server,
  CloudOff,
  Wifi,
  WifiOff,
  Signal,
  Cpu,
  HardDrive,
  MemoryStick,
  Network,
  Menu,
  ChevronLeft,
  Power,
  PowerOff,
  Pause,
  Play,
  SkipForward,
  SkipBack,
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  Camera,
  CameraOff,
  Video,
  VideoOff,
  Phone,
  PhoneOff,
  PhoneCall,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  Voicemail,
  Headphones,
  Speaker,
  Bluetooth,
  Usb,
  Zap as Lightning,
  Battery,
  BatteryCharging,
  BatteryFull,
  BatteryLow,
  BatteryMedium,
  Flashlight,
  FlashlightOff,
  Sun,
  Moon,
  SunMoon,
  Sunrise,
  Sunset,
  CloudRain,
  CloudSnow,
  CloudLightning,
  CloudDrizzle,
  CloudHail,
  Cloudy,
  PartlyCloudy,
  Wind,
  Tornado,
  Umbrella,
  Droplets,
  Thermometer,
  Gauge,
  Compass,
  MapPin,
  Map,
  Navigation,
  Route,
  Car,
  Bike,
  Bus,
  Train,
  Plane,
  Ship,
  Truck,
  Taxi,
  Motorcycle,
  Scooter,
  Walking,
  Running,
  Hiking,
  Skiing,
  Snowboarding,
  Swimming,
  Surfing,
  Sailing,
  Fishing,
  Camping,
  Tent,
  Backpack,
  Luggage,
  Suitcase,
  Briefcase,
  Handbag,
  Wallet,
  CreditCard,
  Banknote,
  Coins,
  PiggyBank,
  Receipt,
  Calculator,
  Abacus,
  Scale,
  Ruler,
  Scissors,
  Paperclip,
  Stapler,
  Printer,
  Scanner,
  Fax,
  Landline,
  Mobile,
  Tablet as TabletIcon,
  Laptop as LaptopIcon,
  Desktop,
  Keyboard,
  Mouse,
  Trackpad,
  Gamepad,
  Joystick,
  Dice,
  Puzzle,
  Trophy,
  Medal,
  Award,
  Gift,
  Cake,
  PartyPopper,
  Balloon,
  Confetti,
  FireWorks,
  Sparkles,
  Glitter,
  Rainbow,
  Flower,
  Tree,
  Leaf,
  Seedling,
  Herb,
  Mushroom,
  Cactus,
  PalmTree,
  Evergreen,
  Deciduous,
  Bonsai,
  Bouquet,
  Tulip,
  Rose,
  Sunflower,
  Daisy,
  Lotus,
  Cherry,
  Grape,
  Strawberry,
  Orange,
  Lemon,
  Banana,
  Apple,
  Peach,
  Pear,
  Pineapple,
  Mango,
  Avocado,
  Eggplant,
  Tomato,
  Corn,
  Carrot,
  Broccoli,
  Lettuce,
  Cucumber,
  Pepper,
  Onion,
  Garlic,
  Potato,
  SweetPotato,
  Mushroom as MushroomIcon,
  Bread,
  Cheese,
  Meat,
  Poultry,
  Fish as FishIcon,
  Egg,
  Milk,
  Butter,
  Yogurt,
  IceCream,
  Chocolate,
  Candy,
  Lollipop,
  Cookie,
  Donut,
  Cake as CakeIcon,
  Pie,
  Pizza,
  Burger,
  Fries,
  Hotdog,
  Taco,
  Burrito,
  Sushi,
  Ramen,
  Soup,
  Salad,
  Sandwich,
  Wrap,
  Pasta,
  Rice,
  Noodles,
  Dumplings,
  Pancakes,
  Waffles,
  Toast,
  Bagel,
  Croissant,
  Pretzel,
  Crackers,
  Popcorn,
  Nuts,
  Seeds,
  Honey,
  Syrup,
  Jam,
  Ketchup,
  Mustard,
  Mayo,
  Sauce,
  Spice,
  Salt,
  Pepper as PepperIcon,
  Oil,
  Vinegar,
  Soy,
  Worcestershire,
  Tabasco,
  Sriracha,
  Wasabi,
  Ginger,
  Turmeric,
  Cinnamon,
  Vanilla,
  Basil,
  Oregano,
  Thyme,
  Rosemary,
  Sage,
  Mint,
  Parsley,
  Cilantro,
  Dill,
  Chives,
  Scallion,
  Shallot,
  Leek,
  Celery,
  Radish,
  Turnip,
  Beet,
  Cabbage,
  Kale,
  Spinach,
  Arugula,
  Watercress,
  Bok,
  Collard,
  Swiss,
  Endive,
  Radicchio,
  Fennel,
  Artichoke,
  Asparagus,
  Brussels,
  Cauliflower,
  Okra,
  Squash,
  Zucchini,
  Pumpkin,
  Gourd,
  Cucumber as CucumberIcon,
  Pickle,
  Olive,
  Capers,
  Anchovy,
  Sardine,
  Tuna,
  Salmon,
  Shrimp,
  Crab,
  Lobster,
  Scallop,
  Clam,
  Mussel,
  Oyster,
  Octopus,
  Squid,
  Eel,
  Caviar,
  Roe,
  Seaweed,
  Kelp,
  Algae,
  Plankton,
  Coral,
  Anemone,
  Starfish,
  Urchin,
  Jellyfish,
  Whale,
  Dolphin,
  Shark,
  Ray,
  Seahorse,
  Turtle,
  Frog,
  Toad,
  Snake,
  Lizard,
  Gecko,
  Iguana,
  Chameleon,
  Salamander,
  Newt,
  Crocodile,
  Alligator,
  Turtle as TurtleIcon,
  Tortoise,
  Snail,
  Slug,
  Worm,
  Caterpillar,
  Butterfly,
  Moth,
  Bee,
  Wasp,
  Ant,
  Termite,
  Cockroach,
  Beetle,
  Ladybug,
  Firefly,
  Grasshopper,
  Cricket,
  Locust,
  Mantis,
  Stick,
  Leaf as LeafIcon,
  Spider,
  Scorpion,
  Tick,
  Mite,
  Flea,
  Louse,
  Mosquito,
  Fly,
  Gnat,
  Midge,
  Horsefly,
  Beefly,
  Dragonfly,
  Damselfly,
  Mayfly,
  Caddisfly,
  Stonefly,
  Dobsonfly,
  Fishfly,
  Alderfly,
  Lacewing,
  Antlion,
  Owlfly,
  Snakefly,
  Scorpionfly,
  Hangingfly,
  Bittacus,
  Panorpa,
  Boreus,
  Nannochorista,
  Austromerope,
  Boreidae,
  Panorpidae,
  Bittacidae,
  Panorpodidae,
  Meropeidae,
  Nannochoristidae,
  Apteropanorpidae,
  Notiothauma as NotiothamaIcon,
  Austromerope as AustromeropeIcon,
  Choristidae,
  Panorpoidea,
  Mecoptera,
  Siphonaptera,
  Strepsiptera,
  Zoraptera,
  Dermaptera,
  Plecoptera,
  Embioptera,
  Phasmatodea,
  Orthoptera,
  Grylloblattodea,
  Mantophasmatodea,
  Blattodea,
  Isoptera,
  Mantodea,
  Odonata,
  Ephemeroptera,
  Thysanura,
  Diplura,
  Protura,
  Collembola,
  Microcoryphia,
  Zygentoma,
  Archaeognatha,
  Monura,
  Entognatha,
  Hexapoda,
  Arthropoda,
  Mandibulata,
  Pancrustacea,
  Crustacea,
  Malacostraca,
  Decapoda,
  Isopoda,
  Amphipoda,
  Mysida,
  Euphausiacea,
  Stomatopoda,
  Tanaidacea,
  Cumacae,
  Spelaeogriphacae,
  Thermosbaenacea,
  Lophogastrida,
  Stygiomysida,
  Mictacae,
  Bathynellacea,
  Anaspidacea,
  Koonungidae,
  Psammaspididae,
  Stygocarididae,
  Anaspididae,
  Koonunga,
  Psammaspis,
  Stygocarides,
  Anaspides,
  Paranaspides,
  Allanaspides,
  Acanthaspis,
  Eucrenonaspis,
  Micraspides,
  Crenoaspis,
  Crenaspis,
  Alanaspis,
  Astacopsis,
  Geocherax,
  Ombrastacoides,
  Cherax,
  Euastacus,
  Astacus,
  Pacifastacus,
  Austropotamobius,
  Cambaroides,
  Procambarus,
  Orconectes,
  Cambarus,
  Fallicambarus,
  Hobbseus,
  Bouchardina,
  Barbicambarus,
  Creaserinus,
  Distocambarus,
  Faxonella,
  Cambarellus,
  Troglocambarus,
  Parastacus,
  Samastacus,
  Virilastacus,
  Astacoides,
  Paranephrops,
  Parastacoides,
  Engaeus,
  Geocharax,
  Gramastacus,
  Tenuibranchiurus,
  Spinastacoides,
  Paranephrops as ParanephropsIcon,
  Astacoides as AstacoidesIcon,
  Parastacoides as ParastacoidesIcon,
  Engaeus as EngaeusIcon,
  Geocharax as GeocharaxIcon,
  Gramastacus as GramastacusIcon,
  Tenuibranchiurus as TenuibranchiurusIcon,
  Spinastacoides as SpinastacoidesIcon
} from 'lucide-react';
import { useLocation } from "wouter";
import { useActivityTracker } from "@/hooks/use-activity-tracker";
import { OnlineUsersMonitor } from '@/components/OnlineUsersMonitor';
import FeedbackAlertsAdmin from '../components/FeedbackAlertsAdmin';
import { EmergencyAlertsAdmin } from '@/components/EmergencyAlertsAdmin';
import { SubscriptionManagementSection } from '@/components/admin/subscriptions/SubscriptionManagementSection';
import { NotificationCreateDialog } from '@/components/NotificationCreateDialog';
import ApiKeysManagement from '@/components/ApiKeysManagement'
import WhatsAppClicksAnalytics from '@/components/WhatsAppClicksAnalytics';
import { useUnifiedWebSocket } from '@/hooks/use-unified-websocket';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { CacheInvalidation } from '@/lib/cache-invalidation';

import { AdminRatingsPanel } from '@/components/AdminRatingsPanel';
import { LoginSharingSection } from '@/components/admin/LoginSharingSection';

// Placeholder for SuppliersManagementSection if not imported
const SuppliersManagementSection = () => (
  <div className="p-4 border rounded bg-gray-100 dark:bg-gray-800">
    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Gerenciamento de Fornecedores</h3>
    <p className="text-sm text-gray-600 dark:text-gray-400">Conteúdo do painel de fornecedores.</p>
  </div>
);

// Types for admin data based on database schema
interface AdminUser {
  id: number;
  email: string;
  name: string;
  role: string;
  subscriptionPlan: string;
  status: string;
  isApproved: boolean;
  isAdmin: boolean;
  createdAt: Date;
  lastActiveAt: Date;
  activeSessions: number;
  lastSessionActivity: Date | null;
  isOnline: boolean;
}

interface PendingUser {
  id: number;
  name: string;
  email: string;
  company: string;
  whatsapp: string;
  status: string;
  isApproved: boolean;
  subscriptionPlan: string;
  createdAt: string;
}

// Helper functions
const getPlanBadgeStyle = (plan: string) => {
  switch (plan) {
    case 'free': return 'bg-gray-100 text-gray-700';
    case 'pro': return 'bg-blue-100 text-blue-700';
    case 'apoiador': return 'bg-green-100 text-green-700';
    case 'business': return 'bg-purple-100 text-purple-700';
    case 'admin': return 'bg-orange-100 text-orange-700';
    case 'tester': return 'bg-yellow-100 text-yellow-700';
    default: return 'bg-gray-100 text-gray-700';
  }
};

const getRoleBadgeStyle = (role: string) => {
  switch (role) {
    case 'user': return 'bg-slate-100 text-slate-700';
    case 'admin': return 'bg-emerald-100 text-emerald-700';
    case 'superadmin': return 'bg-red-100 text-red-700';
    case 'pending_payment': return 'bg-orange-100 text-orange-700';
    default: return 'bg-slate-100 text-slate-700';
  }
};

const getRoleDisplayName = (role: string) => {
  switch (role) {
    case 'user': return 'Usuário';
    case 'pro': return 'PRO';
    case 'apoiador': return 'Apoiador';
    case 'tester': return 'Tester';
    case 'admin': return 'Admin';
    case 'superadmin': return 'Super Admin';
    case 'pending_payment': return 'Pendente de Pagamento';
    default: return 'Usuário';
  }
};

const getPlanDisplayName = (plan: string) => {
  switch (plan) {
    case 'free': return 'FREE';
    case 'pro': return 'PRO';
    case 'apoiador': return 'APOIADOR';
    case 'business': return 'BUSINESS';
    case 'admin': return 'ADMIN';
    case 'tester': return 'TESTER';
    default: return 'N/A';
  }
};

// ⚡ OTIMIZAÇÃO: DashboardOverviewSection movida para arquivo separado com lazy loading
// Ver: /client/src/pages/admin/sections/DashboardOverviewSection.tsx
// A função que estava aqui (567 linhas) foi extraída para reduzir o bundle inicial

// 2. Pending Approval Section
const PendingApprovalSection = () => {
  const { toast } = useToast();
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [approvalReason, setApprovalReason] = useState('');

  const { data: pendingUsers = [], isLoading, error, refetch } = useQuery({
    queryKey: ['/api/admin/pending-users'],
    queryFn: async () => {
      return await apiRequest('/api/admin/pending-users');
    },
    refetchInterval: 30000,
    staleTime: 10000,
    retry: 3,
    onSuccess: (data) => {
      console.log('✅ [ADMIN] Pending users fetched successfully:', data);
    },
    onError: (error) => {
      console.error('❌ [ADMIN] Error fetching pending users:', error);
    }
  });

  const approveUserMutation = useMutation({
    mutationFn: async ({ userId, reason, userType }: { userId: number; reason?: string; userType?: string }) => {
      const response = await apiRequest('/api/admin/approve-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, reason, userType }),
      });
      return response;
    },
    onSuccess: (data) => {
      toast({
        title: "Usuário Aprovado",
        description: data.message || "Usuário aprovado com sucesso e promovido para PRO",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/pending-users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats/users'] });
      setShowApprovalDialog(false);
      setApprovalReason('');
      setSelectedUser(null);
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao aprovar usuário",
        variant: "destructive",
      });
    }
  });

  const rejectUserMutation = useMutation({
    mutationFn: async ({ userId, reason }: { userId: number; reason?: string }) => {
      const response = await apiRequest('/api/admin/reject-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, reason }),
      });
      return response;
    },
    onSuccess: (data) => {
      toast({
        title: "Usuário Rejeitado",
        description: data.message || "Usuário rejeitado com sucesso",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/pending-users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats/users'] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao rejeitar usuário",
        variant: "destructive",
      });
    }
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="border-b pb-4">
          <h2 className="text-2xl font-bold">Aguardando Aprovação</h2>
          <p className="text-slate-600 dark:text-slate-400">Carregando usuários pendentes...</p>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <div className="h-10 w-10 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                    <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-3/4 animate-pulse" />
                  </div>
                  <div className="flex gap-2">
                    <div className="h-8 w-20 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                    <div className="h-8 w-20 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="border-b pb-4">
          <h2 className="text-2xl font-bold">Aguardando Aprovação</h2>
          <p className="text-slate-600 dark:text-slate-400">Erro ao carregar usuáriospendentes</p>
        </div>
        <Card className="border-red-200 bg-red-50 dark:bg-red-900/10">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-2">
              Erro ao carregar dados
            </h3>
            <p className="text-red-700 dark:text-red-300 mb-4">
              {error.message || "Não foi possível carregar os usuários pendentes"}
            </p>
            <Button onClick={() => refetch()} variant="outline" className="border-red-300 text-red-700 hover:bg-red-100">
              <RefreshCw className="h-4 w-4 mr-2" />
              Tentar Novamente
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h2 className="text-2xl font-bold">Aguardando Aprovação ({pendingUsers.length})</h2>
          <p className="text-slate-600 dark:text-slate-400">
            Novos usuários que precisam de aprovação para acessar o sistema
          </p>
        </div>
        <Button
          onClick={() => refetch()}
          variant="outline"
          size="sm"
          disabled={isLoading}
        >
          <RefreshCw className={'h-4 w-4 mr-2 ' + (isLoading ? 'animate-spin' : '')} />
          Atualizar
        </Button>
      </div>

      {pendingUsers.length === 0 ? (
        <Card className="border-green-200 bg-green-50 dark:bg-green-900/10">
          <CardContent className="p-8 text-center">
            <UserCheck className="h-16 w-16 text-green-500 mx-auto mb-6" />
            <h3 className="text-xl font-bold mb-3 text-green-700 dark:text-green-400">
              Nenhum usuário aguardando aprovação
            </h3>
            <p className="text-green-600 dark:text-green-300 text-lg mb-4">
              Todos os usuários estão aprovados e ativos no sistema
            </p>
            <div className="flex justify-center items-center gap-2 text-sm text-green-600 dark:text-green-400">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              Sistema funcionando normalmente
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Usuários Pendentes ({pendingUsers.length})
            </CardTitle>
            <CardDescription>
              Clique em "Aprovar" para conceder acesso PRO automaticamente
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-slate-500">Usuário</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-500">Empresa</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-500">WhatsApp</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-500">Status</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-500">Registro</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-500">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {pendingUsers.map((user: any) => (
                    <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="px-4 py-4">
                        <div className="flex items-center">
                          <div className="h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center mr-3">
                            <User className="h-4 w-4 text-slate-500" />
                          </div>
                          <div>
                            <div className="font-medium text-slate-900 dark:text-slate-100">
                              {user.name || 'Nome não informado'}
                            </div>
                            <div className="text-slate-500">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-slate-600 dark:text-slate-400">
                          {user.company || 'Não informado'}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-slate-600 dark:text-slate-400">
                          {user.whatsapp || user.phone || 'Não informado'}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <Badge variant="outline" className="border-yellow-300 text-yellow-700 bg-yellow-50">
                          <Clock className="h-3 w-3 mr-1" />
                          {user.status || 'Pendente'}
                        </Badge>
                      </td>
                      <td className="px-4 py-4 text-slate-500">
                        {user.createdAt ? new Date(user.createdAt).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        }) : 'Data não disponível'}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => {
                              approveUserMutation.mutate({
                                userId: user.id,
                                reason: 'Approved as PRO user',
                                userType: 'pro'
                              });
                            }}
                            disabled={approveUserMutation.isPending}
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            PRO
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => {
                              approveUserMutation.mutate({
                                userId: user.id,
                                reason: 'Approved as Tester user (7 days)',
                                userType: 'tester'
                              });
                            }}
                            disabled={approveUserMutation.isPending}
                            className="bg-orange-600 hover:bg-orange-700 text-white"
                          >
                            <Clock className="h-4 w-4 mr-1" />
                            Tester
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => rejectUserMutation.mutate({ 
                              userId: user.id, 
                              reason: 'Rejected by administrator' 
                            })}
                            disabled={rejectUserMutation.isPending}
                            className="text-red-600 hover:text-red-700 border-red-300 hover:bg-red-50"
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Rejeitar
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Approval Dialog */}
      <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              Aprovar Usuário
            </DialogTitle>
            <DialogDescription>
              Este usuário será aprovado e automaticamente promovido para o plano PRO
            </DialogDescription>
          </DialogHeader>

          {selectedUser && (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 dark:bg-green-900/10 border border-green-200 rounded-lg">
                <p className="font-medium text-green-900 dark:text-green-100">
                  {selectedUser.name || 'Nome não informado'}
                </p>
                <p className="text-sm text-green-700 dark:text-green-300">{selectedUser.email}</p>
                {selectedUser.company && (
                  <p className="text-sm text-green-700 dark:text-green-300">
                    Empresa: {selectedUser.company}
                  </p>
                )}
                {(selectedUser.whatsapp || selectedUser.phone) && (
                  <p className="text-sm text-green-700 dark:text-green-300">
                    WhatsApp: {selectedUser.whatsapp || selectedUser.phone}
                  </p>
                )}
              </div>

              <div className="p-3 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  ✅ Usuário será aprovado automaticamente<br/>
                  🚀 Plano será atualizado para PRO<br/>
                  🔑 Acesso completo ao sistema será concedido
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="approval-reason">Motivo da aprovação (opcional):</Label>
                <Input
                  id="approval-reason"
                  placeholder="Ex: Usuário válido, documentação verificada..."
                  value={approvalReason}
                  onChange={(e) => setApprovalReason(e.target.value)}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowApprovalDialog(false);
              setSelectedUser(null);
              setApprovalReason('');
            }}>
              Cancelar
            </Button>
            <Button 
              onClick={() => {
                if (selectedUser) {
                  approveUserMutation.mutate({
                    userId: selectedUser.id,                    reason: approvalReason || 'Approved by administrator'
                  });
                }
              }}
              disabled={approveUserMutation.isPending}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {approveUserMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Aprovando...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Confirmar Aprovação
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// 3. User Management Section (Enhanced with Delete Function)
// User Management Section
const UserManagementSection = () => {
  const { toast } = useToast();
  const { user: currentUser } = useAuth(); // Get current logged-in admin user
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showForceLogoutDialog, setShowForceLogoutDialog] = useState(false);
  const [showDiagnosticDialog, setShowDiagnosticDialog] = useState(false);
  const [showUserDetailsDialog, setShowUserDetailsDialog] = useState(false);
  const [showRoleChangeDialog, setShowRoleChangeDialog] = useState(false);
  const [showStatusChangeDialog, setShowStatusChangeDialog] = useState(false);
  const [showResetPasswordDialog, setShowResetPasswordDialog] = useState(false);
  const [showImpersonateDialog, setShowImpersonateDialog] = useState(false);
  const [diagnosticEmail, setDiagnosticEmail] = useState('');
  const [userDetailsTab, setUserDetailsTab] = useState('profile');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'email' | 'createdAt' | 'role'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [statusFilter, setStatusFilter] = useState<'all' | 'approved' | 'pending' | 'online'>('all');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'pro' | 'user' | 'tester' | 'apoiador'>('all');
  const [newRole, setNewRole] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [changeReason, setChangeReason] = useState('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const { data: usersData, isLoading, error: usersError, refetch } = useQuery({
    queryKey: ['/api/admin/users'],
    queryFn: async () => {
      return await apiRequest('/api/admin/users');
    },
    refetchInterval: 30000,
    staleTime: 10000,
    retry: 3,
    onError: (error) => {
      console.error('❌ Error loading users:', error);
      toast({
        title: "Erro ao carregar usuários",
        description: "Não foi possível carregar a lista de usuários. Tentando novamente...",
        variant: "destructive",
      });
    }
  });

  const { data: userDetailsData, isLoading: isLoadingDetails } = useQuery({
    queryKey: ['/api/admin/users/details', selectedUser?.id],
    queryFn: async () => {
      if (!selectedUser?.id) return null;
      return await apiRequest('/api/admin/users/' + selectedUser.id + '/details');
    },
    enabled: !!selectedUser?.id && showUserDetailsDialog,
  });

  const filteredUsers = useMemo(() => {
    if (!usersData?.users) return [];

    return usersData.users.filter((user: any) => {
      const matchesSearch = 
        user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.company?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'all' || 
        (statusFilter === 'approved' && user.isApproved) ||
        (statusFilter === 'pending' && !user.isApproved) ||
        (statusFilter === 'online' && user.isOnline);

      const matchesRole = roleFilter === 'all' || 
        (roleFilter === 'admin' && user.isAdmin) ||
        (roleFilter === 'pro' && user.subscriptionPlan === 'pro') ||
        (roleFilter === 'tester' && user.subscriptionPlan === 'tester') ||
        (roleFilter === 'apoiador' && user.subscriptionPlan === 'apoiador') ||
        (roleFilter === 'user' && user.subscriptionPlan === 'free');

      return matchesSearch && matchesStatus && matchesRole;
    });
  }, [usersData?.users, searchTerm, statusFilter, roleFilter]);

  const sortedUsers = useMemo(() => {
    return [...filteredUsers].sort((a, b) => {
      let aValue, bValue;

      switch (sortBy) {
        case 'name':
          aValue = a.name?.toLowerCase() || '';
          bValue = b.name?.toLowerCase() || '';
          break;
        case 'email':
          aValue = a.email?.toLowerCase() || '';
          bValue = b.email?.toLowerCase() || '';
          break;
        case 'createdAt':
          aValue = new Date(a.createdAt || 0).getTime();
          bValue = new Date(b.createdAt || 0).getTime();
          break;
        case 'role':
          aValue = a.role || '';
          bValue = b.role || '';
          break;
        case 'lastActivity':
          aValue = new Date(a.lastActivity || a.lastLoginAt || 0).getTime();
          bValue = new Date(b.lastActivity || b.lastLoginAt || 0).getTime();
          break;
        default:
          return 0;
      }

      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });
  }, [filteredUsers, sortBy, sortOrder]);

  // Calculate total pages
  const totalPages = Math.ceil(sortedUsers.length / itemsPerPage);

  // Get current page users
  const currentPageUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return sortedUsers.slice(startIndex, endIndex);
  }, [sortedUsers, currentPage, itemsPerPage]);

  const handleDeleteUser = async (userId: number) => {
    try {
      await apiRequest('/api/admin/delete-user/' + userId, {
        method: 'DELETE',
      });

      toast({
        title: "Usuário excluído",
        description: "O usuário foi excluído com sucesso do sistema.",
      });

      // Invalidate all relevant caches
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/pending-users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users/online'] });
      refetch();
    } catch (error) {
      toast({
        title: "Erro ao excluir usuário",
        description: error.message || "Ocorreu um erro inesperado.",
        variant: "destructive",
      });
    }
  };

  const handleForceLogout = async (userId: number) => {
    try {
      await apiRequest('/api/admin/force-logout/' + userId, {
        method: 'POST',
        body: JSON.stringify({
          reason: 'admin_force_logout'
        }),
      });

      toast({
        title: "Logout forçado",
        description: "O usuário foi desconectado de todas as sessões.",
      });

      // Invalidate all relevant caches
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users/online'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats/users'] });
      refetch();
    } catch (error) {
      toast({
        title: "Erro ao forçar logout",
        description: error.message || "Ocorreu um erro inesperado.",
        variant: "destructive",
      });
    }
  };

  const handleRoleChange = async (userId: number, newRole: string, reason: string) => {
    try {
      await apiRequest('/api/admin/users/' + userId + '/role', {
        method: 'PATCH',
        body: JSON.stringify({
          role: newRole,
          reason: reason
        }),
      });

      toast({
        title: "Função alterada",
        description: 'A função do usuário foi alterada para ' + newRole + '.',
      });

      // Invalidate all relevant caches
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/pending-users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users/online'] });
      refetch();
    } catch (error) {
      toast({
        title: "Erro ao alterar função",
        description: error.message || "Ocorreu um erro inesperado.",
        variant: "destructive",
      });
    }
  };

  const handleStatusChange = async (userId: number, newStatus: string, reason: string) => {
    try {
      await apiRequest('/api/admin/users/' + userId + '/status', {
        method: 'PATCH',
        body: JSON.stringify({
          status: newStatus,
          reason: reason
        }),
      });

      toast({
        title: "Status alterado",
        description: 'O status do usuário foi alterado para ' + newStatus + '.',
      });

      // Invalidate all relevant caches
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/pending-users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users/online'] });
      refetch();
    } catch (error) {
      toast({
        title: "Erro ao alterar status",
        description: error.message || "Ocorreu um erro inesperado.",
        variant: "destructive",
      });
    }
  };

  const handleResetPassword = async (userId: number) => {
    try {
      await apiRequest('/api/admin/users/' + userId + '/reset-password', {
        method: 'POST',
      });

      toast({
        title: "Reset de senha enviado",
        description: "Um link de redefinição de senha foi enviado para o email do usuário.",
      });
    } catch (error) {
      toast({
        title: "Erro ao resetar senha",
        description: error.message || "Ocorreu um erro inesperado.",
        variant: "destructive",
      });
    }
  };

  const handleImpersonate = async (userId: number) => {
    try {
      const response = await apiRequest('/api/admin/users/' + userId + '/impersonate', {
        method: 'POST',
      });

      // Store impersonation token and redirect
      localStorage.setItem('impersonation_token', response.token);
      window.location.href = '/dashboard?impersonating=true';
    } catch (error) {
      toast({
        title: "Erro ao personificar usuário",
        description: error.message || "Ocorreu um erro inesperado.",
        variant: "destructive",
      });
    }
  };

  // ⚡ OTIMIZAÇÃO: Lazy load XLSX apenas quando necessário (economiza ~500KB no bundle inicial)
  const handleExportUsers = async () => {
    try {
      toast({
        title: "Preparando exportação...",
        description: "Carregando biblioteca de exportação",
      });

      // Lazy load XLSX apenas quando usuário clicar em exportar
      const XLSX = await import('xlsx');

      // Preparar dados para exportação
      const exportData = filteredUsers.map(user => ({
        'ID': user.id,
        'Nome': user.name || 'N/A',
        'Email': user.email || 'N/A',
        'Empresa': user.company || 'N/A',
        'Função': user.isAdmin ? 'Admin' :
                 user.subscriptionPlan === 'pro' ? 'PRO' :
                 user.subscriptionPlan === 'apoiador' ? 'Apoiador' :
                 user.subscriptionPlan === 'tester' ? 'Tester' : 'Free',
        'Status': user.status === 'suspended' ? 'Suspenso' :
                  user.status === 'disabled' || user.status === 'inactive' ? 'Inativo' :
                  user.isOnline ? 'Online' :
                  user.isApproved ? 'Ativo' : 'Pendente',
        'Aprovado': user.isApproved ? 'Sim' : 'Não',
        'Data de Criação': user.createdAt ? new Date(user.createdAt).toLocaleDateString('pt-BR') : 'N/A',
        'Última Atividade': user.lastActivity || user.lastLoginAt
          ? new Date(user.lastActivity || user.lastLoginAt).toLocaleString('pt-BR')
          : 'Nunca',
        'Telefone': user.phone || 'N/A',
        'Plano de Assinatura': user.subscriptionPlan || 'N/A',
        'Verificado': user.emailVerified ? 'Sim' : 'Não'
      }));

      // Criar workbook
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Usuários');

      // Ajustar largura das colunas
      const maxWidth = exportData.reduce((w, r) => Math.max(w, Object.keys(r).length), 10);
      worksheet['!cols'] = Array(maxWidth).fill({ wch: 15 });

      // Gerar nome do arquivo com data atual
      const now = new Date();
      const fileName = `usuarios_${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}h${String(now.getMinutes()).padStart(2, '0')}.xlsx`;

      // Fazer download
      XLSX.writeFile(workbook, fileName);

      toast({
        title: "✅ Exportação realizada",
        description: `${exportData.length} usuários foram exportados para ${fileName}`,
      });

    } catch (error) {
      console.error('Erro ao exportar usuários:', error);
      toast({
        title: "❌ Erro na exportação",
        description: "Ocorreu um erro ao exportar os dados dos usuários.",
        variant: "destructive",
      });
    }
  };

  const getUserRoleBadge = (user: any) => {
    // Defensive coding - check if user exists before accessing properties
    if (!user) return <Badge className="bg-gray-100 text-gray-700">Carregando...</Badge>;

    // Check for pending payment status first
    if (user.status === 'pending_payment') return <Badge className="bg-orange-100 text-orange-700">Pendente Pagamento</Badge>;

    if (user.isAdmin) return <Badge className="bg-red-100 text-red-700">Admin</Badge>;
    if (user.subscriptionPlan === 'pro') return <Badge className="bg-blue-100 text-blue-700">PRO</Badge>;
    if (user.subscriptionPlan === 'apoiador') return <Badge className="bg-green-100 text-green-700">Apoiador</Badge>;
    if (user.subscriptionPlan === 'tester') return <Badge className="bg-yellow-100 text-yellow-700">Tester</Badge>;
    return <Badge className="bg-gray-100 text-gray-700">Free</Badge>;
  };

  const getUserStatusBadge = (user: any) => {
    // Defensive coding - check if user exists before accessing properties
    if (!user) return <Badge className="bg-gray-100 text-gray-700">Carregando...</Badge>;

    // Check status first (most important)
    if (user.status === 'suspended') return <Badge className="bg-red-100 text-red-700">Suspenso</Badge>;
    if (user.status === 'disabled' || user.status === 'inactive') return <Badge className="bg-gray-100 text-gray-700">Inativo</Badge>;

    // Then check online status
    if (user.isOnline) return <Badge className="bg-green-100 text-green-700">Online</Badge>;

    // Then check approval status
    if (user.isApproved) return <Badge className="bg-blue-100 text-blue-700">Ativo</Badge>;

    // Default to pending
    return <Badge className="bg-yellow-100 text-yellow-700">Pendente</Badge>;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-2" />
          <p className="text-sm text-gray-500">Carregando dados dos usuários...</p>
        </div>
      </div>
    );
  }

  if (usersError) {
    return (
      <div className="flex items-center justify-center h-48">
        <Card className="border-red-200 bg-red-50 dark:bg-red-900/10 max-w-md">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-2">
              Erro ao carregar usuários
            </h3>
            <p className="text-red-700 dark:text-red-300 mb-4">
              {usersError?.message || "Não foi possível carregar os dados dos usuários"}
            </p>
            <Button onClick={() => refetch()} variant="outline" className="border-red-300 text-red-700 hover:bg-red-100">
              <RefreshCw className="h-4 w-4 mr-2" />
              Tentar Novamente
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!usersData?.users || usersData.users.length === 0) {
    return (
      <div className="flex items-center justify-center h-48">
        <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-900/10 max-w-md">
          <CardContent className="p-6 text-center">
            <Users className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-yellow-900 dark:text-yellow-100 mb-2">
              Nenhum usuário encontrado
            </h3>
            <p className="text-yellow-700 dark:text-yellow-300 mb-4">
              Não há usuários cadastrados no sistema ainda.
            </p>
            <Button onClick={() => refetch()} variant="outline" className="border-yellow-300 text-yellow-700 hover:bg-yellow-100">
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Gerenciamento de Usuários</h2>
        <div className="flex items-center gap-2">
          <Button 
            onClick={handleExportUsers}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Exportar Usuários
          </Button>
          <Button 
            onClick={() => setShowDiagnosticDialog(true)}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Search className="h-4 w-4" />
            Diagnóstico de Usuário
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 p-4 bg-gray-50 rounded-lg">
        <div className="flex-1 min-w-64">
          <Input
            placeholder="Buscar por nome, email ou empresa..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos Status</SelectItem>
            <SelectItem value="approved">Aprovados</SelectItem>
            <SelectItem value="pending">Pendentes</SelectItem>
            <SelectItem value="online">Online</SelectItem>
          </SelectContent>
        </Select>

        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Função" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas Funções</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="pro">PRO</SelectItem>
            <SelectItem value="apoiador">Apoiador</SelectItem>
            <SelectItem value="tester">Tester</SelectItem>
            <SelectItem value="user">Free</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Ordenar por" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="createdAt">Data de Criação</SelectItem>
            <SelectItem value="lastActivity">Última Atividade</SelectItem>
            <SelectItem value="name">Nome</SelectItem>
            <SelectItem value="email">Email</SelectItem>
            <SelectItem value="role">Função</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
          className="flex items-center gap-2"
        >
          {sortOrder === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
        </Button>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Usuários ({sortedUsers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b">
                <tr className="text-left">
                  <th className="pb-3 font-semibold">Usuário</th>
                  <th className="pb-3 font-semibold">Status</th>
                  <th className="pb-3 font-semibold">Função</th>
                  <th className="pb-3 font-semibold">Criado em</th>
                  <th className="pb-3 font-semibold">Última Atividade</th>
                  <th className="pb-3 font-semibold">Ações</th>
                </tr>
              </thead>
              <tbody>
                {currentPageUsers.map((user: any) => (
                  <tr key={user.id} className="border-b hover:bg-gray-50">
                    <td className="py-3">
                      <div>
                        <div className="font-medium flex items-center gap-2">
                          {user.name || 'Sem nome'}
                          {user.isOnline && <div className="w-2 h-2 bg-green-500 rounded-full" />}
                        </div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                        {user.company && <div className="text-xs text-gray-400">{user.company}</div>}
                      </div>
                    </td>
                    <td className="py-3">
                      <button
                        onClick={() => {
                          setSelectedUser(user);
                          setShowStatusChangeDialog(true);
                        }}
                        className="hover:opacity-75 transition-opacity"
                      >
                        {getUserStatusBadge(user)}
                      </button>
                    </td>
                    <td className="py-3">
                      <button
                        onClick={() => {
                          setSelectedUser(user);
                          setShowRoleChangeDialog(true);
                        }}
                        className="hover:opacity-75 transition-opacity"
                      >
                        {getUserRoleBadge(user)}
                      </button>
                    </td>
                    <td className="py-3 text-sm text-gray-500">
                      {user.createdAt ? new Date(user.createdAt).toLocaleDateString('pt-BR') : 'N/A'}
                    </td>
                    <td className="py-3 text-sm text-gray-500">
                      {user.lastActivity || user.lastLoginAt 
                        ? new Date(user.lastActivity || user.lastLoginAt).toLocaleString('pt-BR')
                        : 'Nunca'
                      }
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedUser(user);
                            setShowUserDetailsDialog(true);
                          }}
                          title="Ver detalhes"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedUser(user);
                                setShowForceLogoutDialog(true);
                              }}
                            >
                              <LogOut className="h-4 w-4 mr-2" />
                              Forçar Logout
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedUser(user);
                                setShowResetPasswordDialog(true);
                              }}
                            >
                              <Key className="h-4 w-4 mr-2" />
                              Resetar Senha
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedUser(user);
                                setShowImpersonateDialog(true);
                              }}
                            >
                              <UserCheck className="h-4 w-4 mr-2" />
                              Personificar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedUser(user);
                                setShowDeleteDialog(true);
                              }}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">
                Mostrando {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, sortedUsers.length)} de {sortedUsers.length} usuários
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
              >
                <ArrowUp className="h-4 w-4 rotate-[-90deg]" />
                <ArrowUp className="h-4 w-4 rotate-[-90deg]" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                <ArrowUp className="h-4 w-4 rotate-[-90deg]" />
                Anterior
              </Button>

              <div className="flex space-x-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }

                  return (
                    <Button
                      key={pageNum}
                      variant={pageNum === currentPage ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(pageNum)}
                      className="min-w-[40px]"
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                Próxima
                <ArrowUp className="h-4 w-4 rotate-[90deg]" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
              >
                <ArrowUp className="h-4 w-4 rotate-[90deg]" />
                <ArrowUp className="h-4 w-4 rotate-[90deg]" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* User Details Dialog */}
      <Dialog open={showUserDetailsDialog} onOpenChange={setShowUserDetailsDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do Usuário: {selectedUser?.name || selectedUser?.email}</DialogTitle>
          </DialogHeader>

          {isLoadingDetails ? (
            <div className="flex items-center justify-center h-48">
              <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : (
            <>
              <div className="flex gap-2 border-b pb-2 mb-4">
                {['profile', 'activity', 'sessions', 'logs', 'api'].map((tab) => (
                  <Button
                    key={tab}
                    variant={userDetailsTab === tab ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setUserDetailsTab(tab)}
                  >
                    {tab === 'profile' && 'Perfil'}
                    {tab === 'activity' && 'Atividade'}
                    {tab === 'sessions' && 'Sessões'}
                    {tab === 'logs' && 'Logs'}
                    {tab === 'api' && 'API'}
                  </Button>
                ))}
              </div>

              {userDetailsTab === 'profile' && (
                <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Informações Básicas</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium text-gray-600">Nome</Label>
                        <p className="text-sm">{selectedUser?.name || 'Não informado'}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-600">Email</Label>
                        <p className="text-sm">{selectedUser?.email}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-600">Empresa</Label>
                        <p className="text-sm">{selectedUser?.company || 'Não informado'}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-600">ID</Label>
                        <p className="text-sm font-mono">{selectedUser?.id}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-600">Status</Label>
                        <p className="text-sm">{getUserStatusBadge(selectedUser)}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-600">Função</Label>
                        <p className="text-sm">{getUserRoleBadge(selectedUser)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                </div>
              )}

              {userDetailsTab === 'activity' && (
                <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Atividade Recente</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-500">
                      Funcionalidade em desenvolvimento...
                    </p>
                  </CardContent>
                </Card>
                </div>
              )}

              {userDetailsTab === 'sessions' && (
                <div className="space-y-4">
                <LoginSharingSection />
                </div>
              )}

              {userDetailsTab === 'logs' && (
                <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Logs de Auditoria</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-500">
                      Funcionalidade em desenvolvimento...
                    </p>
                  </CardContent>
                </Card>
                </div>
              )}

              {userDetailsTab === 'api' && (
                <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Uso da API</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-500">
                      Funcionalidade em desenvolvimento...
                    </p>
                  </CardContent>
                </Card>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Role Change Dialog */}
      <Dialog open={showRoleChangeDialog} onOpenChange={setShowRoleChangeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar Função do Usuário</DialogTitle>
            <DialogDescription>
              Alterar função de {selectedUser?.name} ({selectedUser?.email})
              <br />
              <span className="text-sm text-muted-foreground">
                Função atual: {getRoleDisplayName(selectedUser?.role || 'user')}
              </span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nova Função</Label>
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma função" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-slate-400 rounded-full"></div>
                      Free - Usuário padrão
                    </div>
                  </SelectItem>
                  <SelectItem value="tester">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                      Tester - Acesso temporário (7 dias)
                    </div>
                  </SelectItem>
                  <SelectItem value="pro">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                      PRO - Acesso completo
                    </div>
                  </SelectItem>
                  <SelectItem value="apoiador">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                      Apoiador - Acesso completo gratuito para parceiros
                    </div>
                  </SelectItem>
                  <SelectItem value="admin">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                      Admin - Administrador
                    </div>
                  </SelectItem>
                  <SelectItem value="pending_payment">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
                      Pendente de Pagamento - Acesso limitado
                    </div>
                  </SelectItem>
                  {(currentUser?.role === 'superadmin') && (
                    <SelectItem value="superadmin">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                        Super Admin - Controle total
                      </div>
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Motivo da Alteração</Label>
              <Input
                placeholder="Descreva o motivo da alteração..."
                value={changeReason}
                onChange={(e) => setChangeReason(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button 
                className="flex-1"
                onClick={() => {
                  if (selectedUser && newRole && changeReason) {
                    handleRoleChange(selectedUser.id, newRole, changeReason);
                    setShowRoleChangeDialog(false);
                    setNewRole('');
                    setChangeReason('');
                  }
                }}
                disabled={!newRole || !changeReason}
              >
                Confirmar
              </Button>
              <Button 
                variant="outline"
                onClick={() => {
                  setShowRoleChangeDialog(false);
                  setNewRole('');
                  setChangeReason('');
                }}
              >
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Status Change Dialog */}
      <Dialog open={showStatusChangeDialog} onOpenChange={setShowStatusChangeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar Status do Usuário</DialogTitle>
            <DialogDescription>
              Alterar status de {selectedUser?.name} ({selectedUser?.email})
              <br />
              <span className="text-sm text-muted-foreground">
                Status atual: {selectedUser?.status || 'approved'}
              </span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Novo Status</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="approved">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                      Ativo - Usuário pode acessar normalmente
                    </div>
                  </SelectItem>
                  <SelectItem value="suspended">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                      Suspenso - Acesso temporariamente bloqueado
                    </div>
                  </SelectItem>
                  <SelectItem value="disabled">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                      Desativado - Conta permanentemente desabilitada
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(newStatus === 'suspended' || newStatus === 'disabled') && (
              <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  ⚠️ <strong>Atenção:</strong> Esta ação irá {newStatus === 'suspended' ? 'suspender' : 'desativar'} o usuário e invalidar todas as suas sessões ativas.
                </p>
              </div>
            )}
            <div>
              <Label>Motivo da Alteração</Label>
              <Input
                placeholder="Descreva o motivo da alteração..."
                value={changeReason}
                onChange={(e) => setChangeReason(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button 
                className="flex-1"
                onClick={() => {
                  if (selectedUser && newStatus && changeReason) {
                    handleStatusChange(selectedUser.id, newStatus, changeReason);
                    setShowStatusChangeDialog(false);
                    setNewStatus('');
                    setChangeReason('');
                  }
                }}
                disabled={!newStatus || !changeReason}
              >
                Confirmar
              </Button>
              <Button 
                variant="outline"
                onClick={() => {
                  setShowStatusChangeDialog(false);
                  setNewStatus('');
                  setChangeReason('');
                }}
              >
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <AlertDialog open={showResetPasswordDialog} onOpenChange={setShowResetPasswordDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Resetar Senha</AlertDialogTitle>
            <AlertDialogDescription>
              Enviar um link de redefinição de senha para {selectedUser?.email}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (selectedUser) {
                  handleResetPassword(selectedUser.id);
                  setShowResetPasswordDialog(false);
                }
              }}
            >
              Enviar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Impersonate Dialog */}
      <AlertDialog open={showImpersonateDialog} onOpenChange={setShowImpersonateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Personificar Usuário</AlertDialogTitle>
            <AlertDialogDescription>
              Você será logado como {selectedUser?.name} ({selectedUser?.email}) para fins de depuração.
              Esta ação será registrada nos logs de auditoria.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (selectedUser) {
                  handleImpersonate(selectedUser.id);
                  setShowImpersonateDialog(false);
                }
              }}
              className="bg-orange-600 hover:bg-orange-700"
            >
              Personificar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o usuário <strong>{selectedUser?.name}</strong> ({selectedUser?.email})?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (selectedUser) {
                  handleDeleteUser(selectedUser.id);
                  setShowDeleteDialog(false);
                  setSelectedUser(null);
                }
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Force Logout Confirmation Dialog */}
      <AlertDialog open={showForceLogoutDialog} onOpenChange={setShowForceLogoutDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Forçar Logout</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja desconectar o usuário <strong>{selectedUser?.name}</strong> ({selectedUser?.email}) 
              de todas as sessões ativas?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (selectedUser) {
                  handleForceLogout(selectedUser.id);
                  setShowForceLogoutDialog(false);
                  setSelectedUser(null);
                }
              }}
            >
              Forçar Logout
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* User Diagnostic Dialog */}
      <Dialog open={showDiagnosticDialog} onOpenChange={setShowDiagnosticDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Diagnóstico de Usuário</DialogTitle>
            <DialogDescription>
              Digite o email do usuário para ver informações detalhadas
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="usuario@exemplo.com"
              value={diagnosticEmail}
              onChange={(e) => setDiagnosticEmail(e.target.value)}
              type="email"
            />
            <div className="flex gap-2">
              <Button 
                className="flex-1"
                onClick={() => {
                  if (diagnosticEmail) {
                    setLocation('/admin/user-diagnostic?email=' + encodeURIComponent(diagnosticEmail));
                    setShowDiagnosticDialog(false);
                    setDiagnosticEmail('');
                  }
                }}
                disabled={!diagnosticEmail}
              >
                <Search className="h-4 w-4 mr-2" />
                Diagnosticar
              </Button>
              <Button 
                variant="outline"
                onClick={() => {
                  setShowDiagnosticDialog(false);
                  setDiagnosticEmail('');
                }}
              >
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// 4. Emergency Alerts Section
const EmergencyAlertsSection = () => {
  const { toast } = useToast();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false); // State for delete confirmation dialog
  const [selectedAlert, setSelectedAlert] = useState<any>(null); // State to hold the alert to be deleted
  const [alertForm, setAlertForm] = useState({
    title: '',
    message: '',
    urgency: 'medium' as 'low' | 'medium' | 'high'
  });

  // Fetch alerts using the EmergencyAlertsAdmin component's logic (or adapt here)
  // For now, let's assume we have a similar hook or can refetch data.
  // If EmergencyAlertsAdmin manages its own state, we might not need this here.
  // However, for the admin dashboard to *display* alerts, we need the data.
  // Let's fetch it directly for demonstration.

  const { data: alertsData, isLoading, refetch } = useQuery({
    queryKey: ['/api/emergency-alerts'], // Assuming this is the correct API endpoint
    refetchInterval: 60000, // Refetch every minute
    staleTime: 30000,
    retry: 3,
  });

  const alerts = alertsData?.alerts || []; // Adjust based on actual API response structure

  // Mutation to create a new alert
  const createAlertMutation = useMutation({
    mutationFn: async (alertData: typeof alertForm) => {
      const response = await apiRequest('/api/emergency-alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(alertData),
      });
      return response;
    },
    onSuccess: (data) => {
      toast({
        title: "Aviso Enviado!",
        description: "Aviso emergencial enviado para " + data.sentToUsers + " usuários", // Adjust based on API response
      });
      setShowCreateDialog(false);
      setAlertForm({ title: '', message: '', urgency: 'medium' });
      refetch(); // Refetch the list of alerts after creation
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao enviar aviso",
        variant: "destructive",
      });
    }
  });

  // Mutation to delete an alert
  const deleteAlertMutation = useMutation({
    mutationFn: async (alertId: number) => {
      const response = await apiRequest(`/api/emergency-alerts/${alertId}`, {
        method: 'DELETE',
      });
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Aviso Excluído",
        description: "O aviso emergencial foi removido com sucesso.",
      });
      setShowDeleteDialog(false);
      setSelectedAlert(null);
      refetch(); // Refetch the list of alerts
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao excluir aviso",
        variant: "destructive",
      });
    }
  });

  // Function to handle creating an alert
  const handleCreateAlert = () => {
    if (!alertForm.title.trim() || !alertForm.message.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Título e mensagem são obrigatórios",
        variant: "destructive",
      });
      return;
    }
    createAlertMutation.mutate(alertForm);
  };

  // Function to open the delete confirmation dialog
  const openDeleteDialog = (alert: any) => {
    setSelectedAlert(alert);
    setShowDeleteDialog(true);
  };

  // Placeholder for enabling/disabling alerts if needed
  // const toggleAlertStatusMutation = useMutation({...});

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center border-b pb-4">
          <div>
            <h2 className="text-2xl font-bold">Avisos Emergenciais</h2>
            <p className="text-slate-600 dark:text-slate-400">Envie notificações importantes para todos os usuários</p>
          </div>
          <Button disabled className="bg-red-600 hover:bg-red-700 text-white flex items-center gap-2">
            <Siren className="h-4 w-4" />
            Novo Aviso
          </Button>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Megaphone className="h-5 w-5" />
              Carregando Avisos...
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b pb-4">
        <div>
          <h2 className="text-2xl font-bold">Avisos Emergenciais</h2>
          <p className="text-slate-600 dark:text-slate-400">Envie notificações importantes para todos os usuários</p>
        </div>
        <Button 
          onClick={() => setShowCreateDialog(true)}
          className="bg-red-600 hover:bg-red-700 text-white flex items-center gap-2"
        >
          <Siren className="h-4 w-4" />
          Novo Aviso
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5" />
            Histórico de Avisos ({alerts.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {alerts.length === 0 ? (
            <div className="text-center py-8">
              <Megaphone className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum aviso enviado</h3>
              <p className="text-slate-500 dark:text-slate-400">
                Clique em "Novo Aviso" para enviar sua primeira notificação emergencial
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {alerts.map((alert: any) => (
                <Card key={alert.id} className={`border-l-4 ${alert.urgency === 'high' ? 'border-l-red-500' : alert.urgency === 'medium' ? 'border-l-yellow-500' : 'border-l-blue-500'}`}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-lg">{alert.title}</h3>
                          <Badge variant={alert.isActive ? "outline" : "destructive"}>
                            {alert.isActive ? "Ativo" : "Inativo"}
                          </Badge>
                          <Badge className={alert.urgency === 'high' ? 'bg-red-100 text-red-700' : alert.urgency === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'}>
                            {alert.urgency.toUpperCase()}
                          </Badge>
                        </div>
                        <p className="text-slate-600 dark:text-slate-400">{alert.message}</p>
                        <div className="flex flex-wrap gap-4 text-sm text-slate-500">
                          <span>📊 {alert.viewCount || 0} visualizações</span>
                          <span>👤 Por: {alert.senderName || 'Admin'}</span>
                          <span>📅 {new Date(alert.sentAt).toLocaleString('pt-BR')}</span>
                        </div>
                      </div>
                      <div className="flex gap-2 items-center">
                        {/* Placeholder for Toggle action */}
                        {/* <Switch checked={alert.isActive} onCheckedChange={() => { }} /> */}
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => openDeleteDialog(alert)} 
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Criação */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Siren className="h-5 w-5" />
              Novo Aviso Emergencial
            </DialogTitle>
            <DialogDescription>
              Este aviso será enviado instantaneamente para todos os usuários online.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="alert-title">Título do Aviso*</Label>
              <Input
                id="alert-title"
                placeholder="Ex: Manutenção Programada"
                value={alertForm.title}
                onChange={(e) => setAlertForm(prev => ({ ...prev, title: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="alert-urgency">Nível de Urgência</Label>
              <Select
                value={alertForm.urgency}
                onValueChange={(value: 'low' | 'medium' | 'high') => 
                  setAlertForm(prev => ({ ...prev, urgency: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o nível de urgência" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                      Baixa - Informativo
                    </div>
                  </SelectItem>
                  <SelectItem value="medium">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                      Média - Importante
                    </div>
                  </SelectItem>
                  <SelectItem value="high">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                      Alta - Urgente
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="alert-message">Mensagem*</Label>
              <textarea
                id="alert-message"
                className="w-full min-h-[100px] px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Digite aqui a mensagem do aviso emergencial..."
                value={alertForm.message}
                onChange={(e) => setAlertForm(prev => ({ ...prev, message: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleCreateAlert}
              disabled={createAlertMutation.isPending}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {createAlertMutation.isPending ? 'Enviando...' : 'Enviar Aviso'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Confirmação de Exclusão */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="h-5 w-5" />
              Confirmar Exclusão
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o aviso "{selectedAlert?.title}"?
              <br />
              <span className="text-sm text-red-600 font-medium">
                Esta ação não pode ser desfeita e removerá permanentemente o alerta e todas as suas visualizações.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowDeleteDialog(false);
              setSelectedAlert(null);
            }}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (selectedAlert) {
                  deleteAlertMutation.mutate(selectedAlert.id);
                }
              }}
              disabled={deleteAlertMutation.isPending}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleteAlertMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Excluindo...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir Definitivamente
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

// 5. System Settings Section
const SystemSettingsSection = () => {
  const { toast } = useToast();
  const [settings, setSettings] = useState({
    maintenanceMode: false,
    allowNewRegistrations: true,
    maxUsersPerPlan: {
      free: 1000,
      pro: 5000,
      business: 10000
    },
    systemNotifications: true,
    emergencyContactEmail: 'admin@sistema.com'
  });

  const { data: systemSettings, isLoading, error } = useQuery({
    queryKey: ['/api/admin/system-settings'],
    retry: 3,
  });

  const updateSettingMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: any }) => {
      const response = await apiRequest('/api/admin/system-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value }),
      });
      return response;
    },
    onSuccess: (data) => {
      toast({
        title: "Configuração Atualizada",
        description: "A configuração do sistema foi salva com sucesso",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao atualizar configuração",
        variant: "destructive",
        });
    }
  });

  const handleSettingChange = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    updateSettingMutation.mutate({ key, value });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Configurações do Sistema</h2>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="border-b pb-4">
        <h2 className="text-2xl font-bold">Configurações do Sistema</h2>
        <p className="text-slate-600 dark:text-slate-400">Gerencie configurações globais da plataforma</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configurações Gerais */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Configurações Gerais
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-sm font-medium">Modo de Manutenção</Label>
                <p className="text-xs text-slate-500">
                  Bloqueia acesso de usuários regulares ao sistema
                </p>
              </div>
              <Switch
                checked={settings.maintenanceMode}
                onCheckedChange={(checked) => handleSettingChange('maintenanceMode', checked)}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-sm font-medium">Novos Registros</Label>
                <p className="text-xs text-slate-500">
                  Permite que novos usuários se registrem
                </p>
              </div>
              <Switch
                checked={settings.allowNewRegistrations}
                onCheckedChange={(checked) => handleSettingChange('allowNewRegistrations', checked)}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-sm font-medium">Notificações do Sistema</Label>
                <p className="text-xs text-slate-500">
                  Envia notificações automáticas do sistema
                </p>
              </div>
              <Switch
                checked={settings.systemNotifications}
                onCheckedChange={(checked) => handleSettingChange('systemNotifications', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Limites de Usuários */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Limites por Plano
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="free-limit">Plano FREE</Label>
              <Input
                id="free-limit"
                type="number"
                value={settings.maxUsersPerPlan.free}
                onChange={(e) => handleSettingChange('maxUsersPerPlan', {
                  ...settings.maxUsersPerPlan,
                  free: parseInt(e.target.value)
                })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pro-limit">Plano PRO</Label>
              <Input
                id="pro-limit"
                type="number"
                value={settings.maxUsersPerPlan.pro}
                onChange={(e) => handleSettingChange('maxUsersPerPlan', {
                  ...settings.maxUsersPerPlan,
                  pro: parseInt(e.target.value)
                })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="business-limit">Plano BUSINESS</Label>
              <Input
                id="business-limit"
                type="number"
                value={settings.maxUsersPerPlan.business}
                onChange={(e) => handleSettingChange('maxUsersPerPlan', {
                  ...settings.maxUsersPerPlan,
                  business: parseInt(e.target.value)
                })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Configurações de Contato */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Configurações de Contato
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="emergency-email">Email de Emergência</Label>
              <Input
                id="emergency-email"
                type="email"
                value={settings.emergencyContactEmail}
                onChange={(e) => handleSettingChange('emergencyContactEmail', e.target.value)}
                placeholder="admin@sistema.com"
              />
              <p className="text-xs text-slate-500">
                Email para receber alertas críticos do sistema
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Estatísticas do Sistema */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Estatísticas do Sistema
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">99.9%</div>
                <div className="text-xs text-blue-600 dark:text-blue-400">Uptime</div>
              </div>
              <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">1.2s</div>
                <div className="text-xs text-green-600 dark:text-green-400">Resp. Média</div>
              </div>
            </div>

            <Button variant="outline" className="w-full">
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar Estatísticas
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const getSectionName = (section: string) => {
    const names = {
      dashboard: 'Dashboard',
      users: 'Aprovações',
      'manage-users': 'Usuários',
      emergency: 'Emergência',
      keys: 'API Keys',
      feedback: 'Feedback',
      alerts: 'Alertas',
      whatsapp: 'WhatsApp Analytics',
      ratings: 'Avaliações',
      suppliers: 'Fornecedores',
      subscriptions: 'Assinaturas',
      cobrancas: 'Cobranças',
      settings: 'Configurações'
    };
    return names[section as keyof typeof names] || section;
  };

  const getSectionIcon = (section: string) => {
    const icons = {
      dashboard: <BarChart3 className="h-4 w-4" />,
      users: <UserPlus className="h-4 w-4" />,
      'manage-users': <Users className="h-4 w-4" />,
      sessions: <Globe className="h-4 w-4" />,
      emergency: <AlertTriangle className="h-4 w-4" />,
      keys: <Key className="h-4 w-4" />,
      feedback: <MessageSquare className="h-4 w-4" />,
      alerts: <Bell className="h-4 w-4" />,
      whatsapp: <MessageCircle className="h-4 w-4" />,
      ratings: <Star className="h-4 w-4" />,
      suppliers: <Building2 className="h-4 w-4" />,
      subscriptions: <CreditCard className="h-4 w-4" />,
      cobrancas: <DollarSign className="h-4 w-4" />,
      settings: <Settings className="h-4 w-4" />
    };
    return icons[section as keyof typeof icons];
  };

// Main Admin Component
const Admin = () => {
  const [location, setLocation] = useLocation();
  const { user, logout, loading, authInitialized } = useAuth();
  const { pingActivity } = useActivityTracker();
  const [activeSection, setActiveSection] = useState<
    'dashboard' | 'users' | 'manage-users' | 'sessions' | 'emergency' | 'keys' | 'feedback' | 'alerts' | 'whatsapp' | 'ratings' | 'suppliers' | 'subscriptions' | 'cobrancas' | 'settings'
  >('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Loading state check - prevent rendering while user data is being loaded
  if (loading || !authInitialized || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
            Carregando Painel Administrativo
          </h2>
          <p className="text-slate-600 dark:text-slate-400">
            Verificando permissões e carregando dados...
          </p>
          <div className="mt-4 text-sm text-slate-500">
            Status: {loading ? 'Autenticando' : 'Inicializando'}
          </div>
        </div>
      </div>
    );
  }

  const renderSection = (section: string) => {
    switch (section) {
      case 'dashboard':
        return (
          <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>}>
            <DashboardOverviewSection />
          </Suspense>
        );
      case 'users':
        return <PendingApprovalSection />;
      case 'manage-users':
        return <UserManagementSection />;
      case 'sessions':
        return (
          <div className="space-y-6">
            <OnlineUsersMonitor />
            <LoginSharingSection />
          </div>
        );
      case 'emergency':
        return <EmergencyAlertsSection />;
      case 'keys':
        return <ApiKeysManagement />;
      case 'feedback':
        return <FeedbackAlertsAdmin />;
      case 'alerts':
        return (
          <div className="space-y-6">
            <div className="border-b pb-4">
              <h2 className="text-2xl font-bold">Alertas de Feedback/Login</h2>
              <p className="text-slate-600 dark:text-slate-400">
                Gerencie avisos personalizados com feedback dos usuários
              </p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Alertas de Feedback
                </CardTitle>
                <CardDescription>
                  Avisos que coletam feedback dos usuários após login
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Bell className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    Gerenciar Alertas de Feedback
                  </h3>
                  <p className="text-slate-500 dark:text-slate-400 mb-4">
                    Acesse a seção dedicada para criar e gerenciar alertas de feedback personalizados
                  </p>
                  <Button 
                    onClick={() => setActiveSection('feedback')}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    Ir para Seção de Feedback
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      case 'whatsapp':
        return <WhatsAppClicksAnalytics />;
      case 'ratings':
        return <AdminRatingsPanel />;
      case 'suppliers':
        return <SuppliersManagementSection />;
      case 'subscriptions':
        return <SubscriptionManagementSection />;
      case 'settings':
        return (
          <div className="space-y-6">
            <SystemSettingsSection />
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold mb-4">Sistema de Margens de Lucro - Teste</h3>
              {/* Sistema de Margem de Lucro - Em Desenvolvimento */}
              <Card className="border-2 border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
                    <Calculator className="h-5 w-5" />
                    Sistema de Margem de Lucro
                    <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">
                      Em Desenvolvimento
                    </Badge>
                  </CardTitle>
                  <CardDescription className="text-yellow-700 dark:text-yellow-300">
                    Funcionalidade sendo desenvolvida para configurar margens de lucro
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="p-6 text-center border-2 border-dashed border-yellow-300 rounded-lg bg-yellow-100/50 dark:bg-yellow-900/20">
                    <div className="flex flex-col items-center gap-3">
                      <div className="p-2 bg-yellow-200 dark:bg-yellow-800 rounded-full">
                        <AlertCircle className="h-6 w-6 text-yellow-700 dark:text-yellow-300" />
                      </div>
                      <div className="space-y-1">
                        <p className="font-medium text-yellow-800 dark:text-yellow-200">
                          Funcionalidade Bloqueada
                        </p>
                        <p className="text-sm text-yellow-700 dark:text-yellow-300">
                          O sistema de margens está sendo desenvolvido e não pode ser utilizado ainda.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        );
      default:
        return (
          <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>}>
            <DashboardOverviewSection />
          </Suspense>
        );
    }
  };

  const menuItems = [
    { value: 'dashboard', label: 'Dashboard', icon: <BarChart3 className="h-5 w-5" /> },
    { value: 'users', label: 'Aprovação', icon: <UserPlus className="h-5 w-5" /> },
    { value: 'manage-users', label: 'Usuários', icon: <Users className="h-5 w-5" /> },
    { value: 'sessions', label: 'Sessões', icon: <Globe className="h-5 w-5" /> },
    { value: 'emergency', label: 'Emergência', icon: <AlertTriangle className="h-5 w-5" /> },
    { value: 'keys', label: 'API Keys', icon: <Key className="h-5 w-5" /> },
    { value: 'feedback', label: 'Feedback', icon: <MessageSquare className="h-5 w-5" /> },
    { value: 'alerts', label: 'Alertas', icon: <Bell className="h-5 w-5" /> },
    { value: 'whatsapp', label: 'WhatsApp', icon: <MessageCircle className="h-5 w-5" /> },
    { value: 'ratings', label: 'Avaliações', icon: <Star className="h-5 w-5" /> },
    { value: 'suppliers', label: 'Fornecedores', icon: <Building2 className="h-5 w-5" /> },
    { value: 'subscriptions', label: 'Assinaturas', icon: <CreditCard className="h-5 w-5" /> },
    { value: 'cobrancas', label: 'Cobranças', icon: <DollarSign className="h-5 w-5" />, isExternal: true },
    { value: 'settings', label: 'Configurações', icon: <Settings className="h-5 w-5" /> },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 z-50 h-screen w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700 transform transition-transform duration-200 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Admin Panel</h2>
              <Button
                variant="ghost"
                size="sm"
                className="lg:hidden"
                onClick={() => setSidebarOpen(false)}
              >
                <X className="h-5 w-5" />
              </Button>
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
                onClick={() => {
                  if (item.isExternal) {
                    setLocation('/admin/cobrancas');
                  } else {
                    setActiveSection(item.value as any);
                    setSidebarOpen(false);
                  }
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                  activeSection === item.value
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 font-medium'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
                {item.isExternal && <ExternalLink className="h-4 w-4 ml-auto" />}
              </button>
            ))}
            
            <div className="pt-2 mt-2 border-t border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setLocation('/admin/user-diagnostic')}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <User className="h-5 w-5" />
                <span>Diagnóstico</span>
              </button>
            </div>
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

      {/* Main Content */}
      <div className="lg:pl-64">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                className="lg:hidden"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                  {menuItems.find(item => item.value === activeSection)?.label || 'Dashboard'}
                </h1>
                <p className="text-sm text-slate-600 dark:text-slate-400">Sistema de gestão e monitoramento</p>
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="p-6">
          {renderSection(activeSection)}
        </main>
      </div>
    </div>
  );
};

export default Admin;
