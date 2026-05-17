'use client';

import { useAppStore, ViewType } from '@/store/store';
import { useState, useEffect, useMemo } from 'react';
import LoginPage from '@/components/login-page';
import { cn } from '@/lib/utils';
import { useT } from '@/hooks/use-translation';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  LayoutDashboard,
  TrendingUp,
  Users,
  GraduationCap,
  Receipt,
  Wallet,
  CalendarDays,
  BookOpen,
  DoorOpen,
  Settings,
  Menu,
  Phone,
  MapPin,
  Globe,
  ShieldCheck,
  LogOut,
  AlertTriangle,
  Clock,
  Crown,
  MessageCircle,
  Lock,
} from 'lucide-react';
import { FinancialReportsView } from '@/components/views/financial-reports-view';
import { DashboardView } from '@/components/views/dashboard-view';
import { StudentsView } from '@/components/views/students-view';
import { TeachersView } from '@/components/views/teachers-view';
import { PaymentsView } from '@/components/views/payments-view';
import { TeacherPaymentsView } from '@/components/views/teacher-payments-view';
import { ScheduleView } from '@/components/views/schedule-view';
import { ServicesView } from '@/components/views/services-view';
import { ClassroomsView } from '@/components/views/classrooms-view';
import { SettingsView } from '@/components/views/settings-view';
import UsersView from '@/components/views/users-view';
import SuperAdminView from '@/components/views/super-admin-view';
import { ErrorBoundary } from '@/components/error-boundary';

interface CentreInfo {
  id: string;
  name: string;
  logoUrl: string | null;
  contactWhatsapp: string | null;
  subscriptionStatus: string;
  subscriptionPack: string;
  subscriptionStart: string | null;
  subscriptionEnd: string | null;
  isActive: boolean;
}

const navIcons: Record<ViewType, React.ReactNode> = {
  dashboard: <LayoutDashboard className="h-5 w-5" />,
  'financial-reports': <TrendingUp className="h-5 w-5" />,
  students: <Users className="h-5 w-5" />,
  teachers: <GraduationCap className="h-5 w-5" />,
  payments: <Receipt className="h-5 w-5" />,
  'teacher-payments': <Wallet className="h-5 w-5" />,
  schedule: <CalendarDays className="h-5 w-5" />,
  services: <BookOpen className="h-5 w-5" />,
  classrooms: <DoorOpen className="h-5 w-5" />,
  'user-management': <ShieldCheck className="h-5 w-5" />,
  settings: <Settings className="h-5 w-5" />,
  'super-admin': <LayoutDashboard className="h-5 w-5" />,
};

const navKeys: ViewType[] = [
  'dashboard', 'user-management', 'financial-reports', 'students', 'teachers', 'payments',
  'teacher-payments', 'schedule', 'services', 'classrooms', 'settings',
];

function getNavLabel(t: ReturnType<typeof useT>, id: ViewType): string {
  const map: Record<ViewType, string> = {
    dashboard: t.nav.dashboard,
    'financial-reports': t.nav.financialReports,
    students: t.nav.students,
    teachers: t.nav.teachers,
    payments: t.nav.payments,
    'teacher-payments': t.nav.teacherPayments,
    schedule: t.nav.schedule,
    services: t.nav.services,
    classrooms: t.nav.classrooms,
    'user-management': t.nav.userManagement,
    settings: t.nav.settings,
    'super-admin': t.subscription.superAdminTitle,
  };
  return map[id] || id;
}

function getNavDesc(t: ReturnType<typeof useT>, id: ViewType): string {
  if (id === 'dashboard') return t.nav.dashboardDesc;
  if (id === 'financial-reports') return t.nav.financialReportsDesc;
  if (id === 'super-admin') return t.nav.manageFinancialReports;
  return `${t.nav.manageDashboard.replace(t.nav.dashboard, '')} ${getNavLabel(t, id)}`;
}

function getDaysRemaining(endDate: string | null): number | null {
  if (!endDate) return null;
  const end = new Date(endDate);
  const now = new Date();
  const diff = end.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function SubscriptionBanner({ centre }: { centre: CentreInfo }) {
  const t = useT();
  const isAr = useAppStore(s => s.lang) === 'ar';
  const { subscriptionStatus, subscriptionEnd, contactWhatsapp } = centre;

  // No banner needed for unlimited or active with plenty of time
  if (subscriptionStatus === 'unlimited') return null;
  if (subscriptionStatus === 'none') return null;
  if (subscriptionStatus === 'active') {
    const days = getDaysRemaining(subscriptionEnd);
    if (days === null || days > 7) return null;
  }

  const days = getDaysRemaining(subscriptionEnd);
  const isExpired = subscriptionStatus === 'expired' || (days !== null && days < 0);
  const isTrial = subscriptionStatus === 'trial_1min' || subscriptionStatus === 'trial_24h' || subscriptionStatus === 'trial_7d';
  const isExpiring = subscriptionStatus === 'active' && days !== null && days <= 7 && days >= 0;

  const whatsappUrl = contactWhatsapp
    ? `https://wa.me/${contactWhatsapp.replace(/[^0-9]/g, '')}`
    : null;

  return (
    <div
      className={cn(
        'w-full px-4 py-3 flex items-center justify-between gap-3 flex-wrap',
        isExpired && 'bg-red-50 border-b border-red-200 text-red-800',
        isTrial && !isExpired && 'bg-amber-50 border-b border-amber-200 text-amber-800',
        isExpiring && 'bg-yellow-50 border-b border-yellow-200 text-yellow-800',
      )}
    >
      <div className="flex items-center gap-2 text-sm font-medium">
        {isExpired ? (
          <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" />
        ) : isTrial ? (
          <Clock className="h-4 w-4 shrink-0 text-amber-600" />
        ) : (
          <Clock className="h-4 w-4 shrink-0 text-yellow-600" />
        )}
        {isExpired && <span>{t.subscription.expiredTitle} — {t.subscription.expiredDesc}</span>}
        {isTrial && !isExpired && days !== null && (
          <span>{t.subscription.trialTitle} — {days} {isAr ? t.subscription.trialDaysLeft : t.subscription.trialDaysLeft}</span>
        )}
        {isExpiring && days !== null && (
          <span>{t.subscription.expiringTitle} — {days} {isAr ? t.subscription.expiringDaysLeft : t.subscription.expiringDaysLeft}</span>
        )}
      </div>
      <div className="flex items-center gap-2">
        {subscriptionStatus === 'unlimited' && (
          <Badge className="bg-violet-100 text-violet-700 border-violet-200 text-xs">
            <Crown className="h-3 w-3 me-1" /> {t.subscription.unlimitedBadge}
          </Badge>
        )}
        {whatsappUrl && (
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-medium transition-colors"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            {t.subscription.whatsappOrder}
          </a>
        )}
      </div>
    </div>
  );
}

function SidebarContent({ currentView, onNavigate, onMobileClose, navKeys: keys, centreName, logoUrl }: {
  currentView: ViewType;
  onNavigate: (v: ViewType) => void;
  onMobileClose?: () => void;
  navKeys?: ViewType[];
  centreName?: string;
  logoUrl?: string | null;
}) {
  const t = useT();
  const items = keys || navKeys;

  return (
    <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground">
      <div className="p-5 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sidebar-primary flex items-center justify-center overflow-hidden shadow-lg">
            {logoUrl ? (
              <img src={logoUrl} alt="" className="h-7 w-7 object-contain" />
            ) : (
              <img src="/logo.png" alt="C" className="h-7 w-7 object-contain" />
            )}
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight">{centreName || 'Codex Centre'}</h1>
            <p className="text-xs text-sidebar-foreground/70">{t.sidebar.systemName}</p>
          </div>
        </div>
      </div>

      <Separator className="bg-sidebar-border" />

      <ScrollArea className="flex-1 py-3 px-2">
        <nav className="space-y-1">
          {items.map((id) => (
            <Button
              key={id}
              variant="ghost"
              onClick={() => {
                onNavigate(id);
                onMobileClose?.();
              }}
              className={cn(
                'w-full justify-start gap-3 h-11 px-3 font-medium transition-all duration-200',
                currentView === id
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-md hover:bg-sidebar-primary/90'
                  : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              )}
            >
              {navIcons[id]}
              <span>{getNavLabel(t, id)}</span>
            </Button>
          ))}
        </nav>
      </ScrollArea>

      <Separator className="bg-sidebar-border" />

      <div className="p-4 space-y-2 text-xs text-sidebar-foreground/70">
        <div className="flex items-center gap-2">
          <Phone className="h-3.5 w-3.5 shrink-0" />
          <span dir="ltr">--</span>
        </div>
        <div className="flex items-start gap-2">
          <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <span className="line-clamp-2">--</span>
        </div>
      </div>
    </div>
  );
}

function LanguageToggle() {
  const { lang, toggleLang } = useAppStore();
  return (
    <Button variant="outline" size="sm" onClick={toggleLang} className="gap-1.5 h-8 px-3 text-xs font-medium">
      <Globe className="h-3.5 w-3.5" />
      {lang === 'ar' ? 'عربي' : 'Français'}
    </Button>
  );
}

function SubscriptionExpiredPage({ onLogout }: { onLogout: () => void }) {
  const { lang } = useAppStore();
  const t = useT();

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 flex items-center justify-center p-4" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <Card className="w-full max-w-md shadow-xl border-0 text-center">
        <CardHeader className="space-y-4 pb-2">
          <div className="mx-auto">
            <img src="/logo.png" alt="Codex" className="h-16 w-auto object-contain mx-auto" />
          </div>
          <div className="h-16 w-16 mx-auto rounded-full bg-red-100 flex items-center justify-center">
            <Lock className="h-8 w-8 text-red-600" />
          </div>
          <CardTitle className="text-xl">
            {lang === 'ar' ? 'انتهت فترة الاشتراك' : 'Abonnement expiré'}
          </CardTitle>
          <CardDescription className="text-sm leading-relaxed">
            {lang === 'ar'
              ? 'انتهت فترة التجربة الخاصة بك. يرجى التواصل مع دعم Codex لتفعيل اشتراكك.'
              : 'Votre période d\'essai est terminée. Veuillez contacter le support Codex pour activer votre abonnement.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
            <p className="text-sm text-emerald-800 font-medium mb-1">
              {lang === 'ar' ? 'تواصل مع الدعم' : 'Contacter le support'}
            </p>
            <a
              href="https://wa.me/212606060606"
              target="_blank"
              rel="noopener noreferrer"
              className="text-2xl font-bold text-emerald-700"
              dir="ltr"
            >
              0606060606
            </a>
          </div>
          <a
            href="https://wa.me/212606060606"
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-3 px-4 rounded-xl transition-colors text-center"
          >
            {lang === 'ar' ? 'تواصل عبر واتساب' : 'Contacter via WhatsApp'}
          </a>
          <Button variant="outline" onClick={onLogout} className="w-full mt-2">
            {t.sidebar.logout}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default function Home() {
  const { currentView, setCurrentView, lang, userRole, setUserRole: setStoreUserRole, subscriptionExpired, setSubscriptionExpired } = useAppStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [userName, setUserName] = useState('');
  const [accessPages, setAccessPages] = useState<string>('');
  const [centre, setCentre] = useState<CentreInfo | null>(null);
  const t = useT();

  const isSuperAdmin = userRole === 'SUPER_ADMIN';
  const isAdmin = userRole === 'ADMIN';

  // Filter nav items by role and accessPages
  const hiddenForSecretary = new Set<ViewType>(['user-management', 'financial-reports']);
  const filteredNavKeys = navKeys.filter(k => {
    if (isAdmin) return true;
    if (hiddenForSecretary.has(k)) return false;
    if (accessPages) {
      const pages = accessPages.split(',').map(p => p.trim());
      if (pages.length > 0 && !pages.includes(k)) return false;
    }
    return true;
  });

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => {
        if (res.ok) return res.json();
        throw new Error('Not authenticated');
      })
      .then(data => {
        setIsAuthenticated(true);
        setUserName(data.user?.fullName || t.sidebar.defaultUser);
        const role = data.user?.role || '';
        setStoreUserRole(role);
        setAccessPages(data.user?.accessPages || '');
        if (data.centre) setCentre(data.centre);
      })
      .catch(() => {
        setIsAuthenticated(false);
      });
  }, []);

  // Load centre info for sidebar logo
  useEffect(() => {
    if (isAuthenticated && !isSuperAdmin) {
      centreFetch('/api/centre-info')
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data) {
            setCentre(prev => prev ? { ...prev, ...data } : null as unknown as CentreInfo);
          }
        })
        .catch(() => {});
    }
  }, [isAuthenticated, isSuperAdmin]);

  // Check if subscription is expired — either from initial load or from mid-session API detection
  const isSubscriptionExpired = useMemo(() => {
    if (subscriptionExpired) return true; // Set by centreFetch when API returns 403
    if (!centre) return false;
    if (centre.subscriptionStatus === 'unlimited') return false;
    if (centre.subscriptionStatus === 'none' || centre.subscriptionStatus === 'expired') return true;
    if (!centre.subscriptionEnd) return false;
    return new Date(centre.subscriptionEnd) < new Date();
  }, [centre, subscriptionExpired]);

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setIsAuthenticated(false);
    setSubscriptionExpired(false);
  };

  // Super Admin sees its own panel
  if (isSuperAdmin) {
    return (
      <div className="min-h-screen bg-bg-main">
        <ErrorBoundary>
          <SuperAdminView />
        </ErrorBoundary>
      </div>
    );
  }

  if (isSubscriptionExpired) {
    return <SubscriptionExpiredPage onLogout={handleLogout} />;
  }

  const renderView = () => {
    switch (currentView) {
      case 'dashboard': return <DashboardView onNavigate={setCurrentView} />;
      case 'financial-reports': return <FinancialReportsView />;
      case 'students': return <StudentsView />;
      case 'teachers': return <TeachersView />;
      case 'payments': return <PaymentsView />;
      case 'teacher-payments': return <TeacherPaymentsView />;
      case 'schedule': return <ScheduleView />;
      case 'services': return <ServicesView />;
      case 'classrooms': return <ClassroomsView />;
      case 'user-management': return isAdmin ? <UsersView /> : <DashboardView onNavigate={setCurrentView} />;
      case 'settings': return <SettingsView />;
      default: return <DashboardView onNavigate={setCurrentView} />;
    }
  };

  const dir = lang === 'ar' ? 'rtl' : 'ltr';

  return (
    <div className="flex min-h-screen bg-bg-main" dir={dir}>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 shrink-0 shadow-xl lg:sticky lg:top-0 lg:h-screen lg:self-start">
        <SidebarContent
          currentView={currentView}
          onNavigate={setCurrentView}
          navKeys={filteredNavKeys}
          centreName={centre?.name}
          logoUrl={centre?.logoUrl}
        />
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        {/* Subscription Banner */}
        {centre && <SubscriptionBanner centre={centre} />}

        {/* Top Bar (Mobile) */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 bg-white border-b sticky top-0 z-40">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="shrink-0">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side={lang === 'ar' ? 'right' : 'left'} className="w-64 p-0">
              <SheetTitle className="sr-only">{t.sidebar.menuTitle}</SheetTitle>
              <SidebarContent
                currentView={currentView}
                onNavigate={setCurrentView}
                onMobileClose={() => setMobileOpen(false)}
                navKeys={filteredNavKeys}
                centreName={centre?.name}
                logoUrl={centre?.logoUrl}
              />
            </SheetContent>
          </Sheet>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center overflow-hidden">
              {centre?.logoUrl ? (
                <img src={centre.logoUrl} alt="" className="h-6 w-6 object-contain" />
              ) : (
                <img src="/logo.png" alt="C" className="h-6 w-6 object-contain" />
              )}
            </div>
            <h1 className="font-bold text-primary">{centre?.name || 'Codex Centre'}</h1>
          </div>
        </header>

        {/* Desktop Header */}
        <header className="hidden lg:flex items-center justify-between px-6 py-3 bg-white border-b lg:sticky lg:top-0 lg:z-30">
          <div>
            <h2 className="text-lg font-bold text-foreground">
              {getNavLabel(t, currentView)}
            </h2>
            <p className="text-xs text-muted-foreground">
              {getNavDesc(t, currentView)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <Button variant="ghost" size="icon" onClick={handleLogout} className="h-9 w-9 text-muted-foreground hover:text-destructive" title={t.sidebar.logout}>
              <LogOut className="h-4 w-4" />
            </Button>
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
              {userName.charAt(0)}
            </div>
            <div className="flex flex-col items-start">
              <span className="text-sm font-medium text-foreground">{userName}</span>
              <span className="text-[10px] text-muted-foreground">{userRole === 'ADMIN' ? t.sidebar.admin : t.sidebar.secretary}</span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 p-4 lg:p-6">
          <div className="max-w-7xl mx-auto">
            <ErrorBoundary>
              {renderView()}
            </ErrorBoundary>
          </div>
        </div>
      </main>
    </div>
  );
}
