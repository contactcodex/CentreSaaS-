'use client';

import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  KeyRound,
  Power,
  PowerOff,
  Building2,
  ShieldAlert,
  Eye,
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  HourglassIcon,
  Infinity,
  CalendarClock,
} from 'lucide-react';
import { useT } from '@/hooks/use-translation';

// ── Types ──────────────────────────────────────────────────────────────────

type SubscriptionStatus = 'trial_24h' | 'trial_7d' | 'active' | 'expired' | 'unlimited' | 'none';
type PackType = '1month' | '1year' | 'unlimited';

interface Centre {
  id: string;
  name: string;
  email: string;
  contactPhone: string | null;
  contactWhatsapp: string | null;
  subscriptionStatus: SubscriptionStatus;
  subscriptionPack: PackType | null;
  subscriptionStart: string | null;
  subscriptionEnd: string | null;
  usersCount: number;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
}

interface CentreFormData {
  name: string;
  email: string;
  password: string;
  contactPhone: string;
  contactWhatsapp: string;
  notes: string;
}

interface DashboardStats {
  total: number;
  active: number;
  expired: number;
  trial: number;
}

// ── Constants ──────────────────────────────────────────────────────────────

const defaultFormData: CentreFormData = {
  name: '',
  email: '',
  password: '',
  contactPhone: '',
  contactWhatsapp: '',
  notes: '',
};

// ── Helpers ────────────────────────────────────────────────────────────────

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day} / ${month} / ${year}`;
}

function getDaysRemaining(endDate: string | null): number | null {
  if (!endDate) return null;
  const now = new Date();
  const end = new Date(endDate);
  const diffTime = end.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function TableSkeleton() {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );
}

function CardSkeleton() {
  return (
    <Card>
      <CardContent className="p-4">
        <Skeleton className="h-4 w-24 mb-2" />
        <Skeleton className="h-8 w-16" />
      </CardContent>
    </Card>
  );
}

// ── Status Badge Component ────────────────────────────────────────────────

function StatusBadge({ status, label }: { status: SubscriptionStatus; label: string }) {
  const config: Record<SubscriptionStatus, { className: string; icon: React.ReactNode }> = {
    trial_24h: {
      className: 'bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100',
      icon: <HourglassIcon className="h-3 w-3" />,
    },
    trial_7d: {
      className: 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100',
      icon: <Clock className="h-3 w-3" />,
    },
    active: {
      className: 'bg-green-100 text-green-800 border-green-200 hover:bg-green-100',
      icon: <CheckCircle2 className="h-3 w-3" />,
    },
    expired: {
      className: 'bg-red-100 text-red-700 border-red-200 hover:bg-red-100',
      icon: <XCircle className="h-3 w-3" />,
    },
    unlimited: {
      className: 'bg-violet-100 text-violet-800 border-violet-200 hover:bg-violet-100',
      icon: <Infinity className="h-3 w-3" />,
    },
    none: {
      className: 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-100',
      icon: null,
    },
  };

  const { className, icon } = config[status] || config.none;

  return (
    <Badge variant="outline" className={className}>
      {icon && <span className="ms-1">{icon}</span>}
      {label}
    </Badge>
  );
}

// ── Days Remaining Display ────────────────────────────────────────────────

function DaysRemainingDisplay({
  endDate,
  status,
  daysText,
  expiresTodayText,
  expiredText,
  noExpiryText,
}: {
  endDate: string | null;
  status: SubscriptionStatus;
  daysText: string;
  expiresTodayText: string;
  expiredText: string;
  noExpiryText: string;
}) {
  if (status === 'unlimited') {
    return <span className="text-violet-600 text-xs">{noExpiryText}</span>;
  }
  if (status === 'none') {
    return <span className="text-gray-400 text-xs">—</span>;
  }

  const days = getDaysRemaining(endDate);
  if (days === null) return <span className="text-gray-400 text-xs">—</span>;

  if (days < 0) {
    return <span className="text-red-600 text-xs font-medium">{expiredText}</span>;
  }
  if (days === 0) {
    return <span className="text-amber-600 text-xs font-medium">{expiresTodayText}</span>;
  }

  return (
    <div className="flex flex-col">
      <span className="text-xs text-muted-foreground">{formatDate(endDate)}</span>
      <span className={`text-xs font-medium ${days <= 7 ? 'text-amber-600' : 'text-green-600'}`}>
        {days} {daysText}
      </span>
    </div>
  );
}

// ── Stats Cards ───────────────────────────────────────────────────────────

function StatsCards({ stats, loading, t }: { stats: DashboardStats | null; loading: boolean; t: ReturnType<typeof useT>['superAdmin'] }) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  if (!stats) return null;

  const cards = [
    {
      label: t.totalCentres,
      value: stats.total,
      icon: <Building2 className="h-5 w-5" />,
      color: 'text-sky-600',
      bg: 'bg-sky-50',
    },
    {
      label: t.activeCentres,
      value: stats.active,
      icon: <CheckCircle2 className="h-5 w-5" />,
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
    {
      label: t.expiredCentres,
      value: stats.expired,
      icon: <XCircle className="h-5 w-5" />,
      color: 'text-red-600',
      bg: 'bg-red-50',
    },
    {
      label: t.trialCentres,
      value: stats.trial,
      icon: <Clock className="h-5 w-5" />,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {cards.map((card) => (
        <Card key={card.label} className="border-0 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground font-medium">{card.label}</span>
              <div className={`h-8 w-8 rounded-lg ${card.bg} flex items-center justify-center ${card.color}`}>
                {card.icon}
              </div>
            </div>
            <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ── Pack Label ────────────────────────────────────────────────────────────

function getPackLabel(pack: PackType | null, t: ReturnType<typeof useT>['superAdmin']): string {
  if (!pack) return t.none;
  const map: Record<PackType, string> = {
    '1month': t.pack1month,
    '1year': t.pack1year,
    unlimited: t.packUnlimited,
  };
  return map[pack] || t.none;
}

// ── Status Label ──────────────────────────────────────────────────────────

function getStatusLabel(status: SubscriptionStatus, t: ReturnType<typeof useT>['superAdmin']): string {
  const map: Record<SubscriptionStatus, string> = {
    trial_24h: t.trial24h,
    trial_7d: t.trial7d,
    active: t.active,
    expired: t.expired,
    unlimited: t.unlimited,
    none: t.none,
  };
  return map[status] || t.none;
}

// ── Component ──────────────────────────────────────────────────────────────

export default function SuperAdminView() {
  const t = useT();
  const sa = t.superAdmin;

  // ── State ───────────────────────────────────────────────────────────────

  const [centres, setCentres] = useState<Centre[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);

  // Search
  const [searchQuery, setSearchQuery] = useState('');

  // Create / Edit dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCentre, setEditingCentre] = useState<Centre | null>(null);
  const [formData, setFormData] = useState<CentreFormData>(defaultFormData);
  const [submitting, setSubmitting] = useState(false);

  // Pack selection (for edit dialog)
  const [selectedPack, setSelectedPack] = useState<string>('');
  const [newPassword, setNewPassword] = useState('');

  // Delete dialog
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingCentre, setDeletingCentre] = useState<Centre | null>(null);

  // Reset password dialog
  const [resetPwOpen, setResetPwOpen] = useState(false);
  const [resetPwCentre, setResetPwCentre] = useState<Centre | null>(null);
  const [resetPwValue, setResetPwValue] = useState('');
  const [resetPwSubmitting, setResetPwSubmitting] = useState(false);

  // ── Data fetching ──────────────────────────────────────────────────────

  const fetchCentres = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/super-admin/centres');
      if (!res.ok) throw new Error();
      const json = await res.json();
      setCentres(Array.isArray(json) ? json : json.centres || []);
    } catch {
      toast.error(t.common.fetchError);
    } finally {
      setLoading(false);
    }
  }, [t.common.fetchError]);

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await fetch('/api/super-admin/stats');
      if (!res.ok) throw new Error();
      const json = await res.json();
      setStats(json);
    } catch {
      // Stats are non-critical, don't show error toast
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCentres();
    fetchStats();
  }, [fetchCentres, fetchStats]);

  // ── Filtered centres ──────────────────────────────────────────────────

  const filteredCentres = centres.filter((centre) => {
    if (!searchQuery || searchQuery.length < 1) return true;
    const q = searchQuery.toLowerCase();
    return (
      (centre.name || '').toLowerCase().includes(q) ||
      (centre.email || '').toLowerCase().includes(q)
    );
  });

  // ── Form handling ─────────────────────────────────────────────────────

  const handleOpenCreateDialog = () => {
    setEditingCentre(null);
    setFormData(defaultFormData);
    setSelectedPack('');
    setNewPassword('');
    setDialogOpen(true);
  };

  const handleOpenEditDialog = (centre: Centre) => {
    setEditingCentre(centre);
    setFormData({
      name: centre.name,
      email: centre.email,
      password: '',
      contactPhone: centre.contactPhone || '',
      contactWhatsapp: centre.contactWhatsapp || '',
      notes: centre.notes || '',
    });
    setSelectedPack(centre.subscriptionPack || '');
    setNewPassword('');
    setDialogOpen(true);
  };

  const handleCreateSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error(t.common.required);
      return;
    }
    if (!formData.email.trim()) {
      toast.error(t.common.required);
      return;
    }
    if (!formData.password.trim()) {
      toast.error(t.common.required);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/super-admin/centres', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.trim(),
          password: formData.password.trim(),
          contactPhone: formData.contactPhone.trim() || null,
          contactWhatsapp: formData.contactWhatsapp.trim() || null,
          notes: formData.notes.trim() || null,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success(sa.createdSuccess);
      setDialogOpen(false);
      fetchCentres();
      fetchStats();
    } catch {
      toast.error(t.common.saveError);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async () => {
    if (!editingCentre) return;
    if (!formData.name.trim()) {
      toast.error(t.common.required);
      return;
    }

    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        contactPhone: formData.contactPhone.trim() || null,
        contactWhatsapp: formData.contactWhatsapp.trim() || null,
        notes: formData.notes.trim() || null,
      };

      // If pack is selected, update subscription
      if (selectedPack) {
        payload.subscriptionPack = selectedPack;
        payload.subscriptionStatus = selectedPack === 'unlimited' ? 'unlimited' : 'active';
        if (selectedPack === '1month') {
          const start = new Date();
          const end = new Date();
          end.setMonth(end.getMonth() + 1);
          payload.subscriptionStart = start.toISOString();
          payload.subscriptionEnd = end.toISOString();
        } else if (selectedPack === '1year') {
          const start = new Date();
          const end = new Date();
          end.setFullYear(end.getFullYear() + 1);
          payload.subscriptionStart = start.toISOString();
          payload.subscriptionEnd = end.toISOString();
        }
      }

      const res = await fetch(`/api/super-admin/centres/${editingCentre.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error();
      toast.success(sa.updatedSuccess);
      setDialogOpen(false);
      fetchCentres();
      fetchStats();
    } catch {
      toast.error(t.common.saveError);
    } finally {
      setSubmitting(false);
    }
  };

  const handleActivateTrial = async (centreId: string) => {
    try {
      const start = new Date();
      const end = new Date();
      end.setDate(end.getDate() + 7);
      const res = await fetch(`/api/super-admin/centres/${centreId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscriptionStatus: 'trial_7d',
          subscriptionStart: start.toISOString(),
          subscriptionEnd: end.toISOString(),
        }),
      });
      if (!res.ok) throw new Error();
      toast.success(sa.activateTrial);
      fetchCentres();
      fetchStats();
    } catch {
      toast.error(t.common.saveError);
    }
  };

  const handleToggleActive = async (centre: Centre) => {
    try {
      const res = await fetch(`/api/super-admin/centres/${centre.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !centre.isActive }),
      });
      if (!res.ok) throw new Error();
      toast.success(!centre.isActive ? sa.reactivate : sa.deactivate);
      fetchCentres();
      fetchStats();
    } catch {
      toast.error(t.common.saveError);
    }
  };

  const handleDelete = async () => {
    if (!deletingCentre) return;
    try {
      const res = await fetch(`/api/super-admin/centres/${deletingCentre.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error();
      toast.success(sa.deletedSuccess);
      setDeleteOpen(false);
      setDeletingCentre(null);
      fetchCentres();
      fetchStats();
    } catch {
      toast.error(t.common.deleteError);
    }
  };

  const handleOpenResetPassword = (centre: Centre) => {
    setResetPwCentre(centre);
    setResetPwValue('');
    setResetPwOpen(true);
  };

  const handleResetPassword = async () => {
    if (!resetPwCentre || !resetPwValue.trim()) {
      toast.error(t.common.required);
      return;
    }
    setResetPwSubmitting(true);
    try {
      const res = await fetch(`/api/super-admin/centres/${resetPwCentre.id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: resetPwValue.trim() }),
      });
      if (!res.ok) throw new Error();
      toast.success(sa.passwordResetSuccess);
      setResetPwOpen(false);
      setResetPwCentre(null);
      setResetPwValue('');
    } catch {
      toast.error(t.common.saveError);
    } finally {
      setResetPwSubmitting(false);
    }
  };

  const handleSubmit = () => {
    if (editingCentre) {
      handleEditSubmit();
    } else {
      handleCreateSubmit();
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div dir="rtl" className="space-y-4">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-foreground">{sa.title}</h2>
          <p className="text-sm text-muted-foreground">{sa.subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-full sm:w-64">
            <Search className="absolute end-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={`${sa.centres}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pe-10"
            />
          </div>
          <Button onClick={handleOpenCreateDialog} className="gap-2 shrink-0">
            <Plus className="h-4 w-4" />
            {sa.addCentre}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <StatsCards stats={stats} loading={statsLoading} t={sa} />

      {/* Centres Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <TableSkeleton />
          ) : filteredCentres.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">
                {searchQuery ? t.common.noResults : t.common.noData}
              </p>
              <p className="text-sm mt-1">
                {searchQuery ? t.common.tryOtherSearch : sa.addCentre}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-start">{sa.centreName}</TableHead>
                    <TableHead className="text-start hidden md:table-cell">{sa.centreEmail}</TableHead>
                    <TableHead className="text-start">{sa.subscriptionStatus}</TableHead>
                    <TableHead className="text-start hidden sm:table-cell">{sa.subscriptionPack}</TableHead>
                    <TableHead className="text-start hidden lg:table-cell">{sa.expiryDate}</TableHead>
                    <TableHead className="text-start hidden sm:table-cell">{sa.users}</TableHead>
                    <TableHead className="text-start">{sa.actions}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCentres.map((centre) => (
                    <TableRow key={centre.id} className={!centre.isActive ? 'opacity-50' : ''}>
                      <TableCell className="text-start">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
                              centre.isActive ? 'bg-sky-100 text-sky-700' : 'bg-gray-100 text-gray-400'
                            }`}
                          >
                            <Building2 className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{centre.name}</p>
                            <p className="text-xs text-muted-foreground md:hidden" dir="ltr">{centre.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-start hidden md:table-cell text-sm text-muted-foreground" dir="ltr">
                        {centre.email}
                      </TableCell>
                      <TableCell className="text-start">
                        <StatusBadge
                          status={centre.subscriptionStatus}
                          label={getStatusLabel(centre.subscriptionStatus, sa)}
                        />
                      </TableCell>
                      <TableCell className="text-start hidden sm:table-cell">
                        <span className="text-sm">{getPackLabel(centre.subscriptionPack, sa)}</span>
                      </TableCell>
                      <TableCell className="text-start hidden lg:table-cell">
                        <DaysRemainingDisplay
                          endDate={centre.subscriptionEnd}
                          status={centre.subscriptionStatus}
                          daysText={sa.daysRemaining}
                          expiresTodayText={sa.expiresToday}
                          expiredText={sa.alreadyExpired}
                          noExpiryText={sa.noExpiry}
                        />
                      </TableCell>
                      <TableCell className="text-start hidden sm:table-cell">
                        <div className="flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-sm">{centre.usersCount}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-start">
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleOpenEditDialog(centre)}
                            title={sa.editCentre}
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-amber-600 hover:text-amber-700"
                            onClick={() => handleOpenResetPassword(centre)}
                            title={sa.resetPassword}
                          >
                            <KeyRound className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className={`h-8 w-8 ${
                              centre.isActive
                                ? 'text-orange-600 hover:text-orange-700'
                                : 'text-green-600 hover:text-green-700'
                            }`}
                            onClick={() => handleToggleActive(centre)}
                            title={centre.isActive ? sa.deactivate : sa.reactivate}
                          >
                            {centre.isActive ? (
                              <PowerOff className="h-3.5 w-3.5" />
                            ) : (
                              <Power className="h-3.5 w-3.5" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => {
                              setDeletingCentre(centre);
                              setDeleteOpen(true);
                            }}
                            title={sa.deleteCentre}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ═══════════════════════════════════════════════════════════════════
          CREATE / EDIT CENTRE DIALOG
          ═══════════════════════════════════════════════════════════════════ */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl p-0 gap-0 max-h-[90vh] flex flex-col">
          <DialogHeader className="shrink-0 px-6 pt-6 pb-2">
            <DialogTitle>
              {editingCentre ? sa.editCentre : sa.addCentre}
            </DialogTitle>
            <DialogDescription>
              {editingCentre ? `${sa.editCentre} — ${editingCentre.name}` : sa.addCentre}
            </DialogDescription>
          </DialogHeader>

          <div className="overflow-y-auto flex-1 min-h-0 px-6 py-4">
            <div className="grid gap-5">
              {/* ── Centre Info ───────────────────────────────────────── */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">
                    {sa.centreName} <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    placeholder={sa.centreName}
                    value={formData.name}
                    onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">
                    {sa.centreEmail} <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="email"
                    placeholder="email@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
                    dir="ltr"
                    className="text-left"
                  />
                </div>
              </div>

              {!editingCentre && (
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">
                    {sa.centrePassword} <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => setFormData((p) => ({ ...p, password: e.target.value }))}
                    dir="ltr"
                    className="text-left"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">{sa.contactPhone}</Label>
                  <Input
                    placeholder="06XX-XXXXXX"
                    value={formData.contactPhone}
                    onChange={(e) => setFormData((p) => ({ ...p, contactPhone: e.target.value }))}
                    dir="ltr"
                    className="text-left"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">{sa.contactWhatsapp}</Label>
                  <Input
                    placeholder="06XX-XXXXXX"
                    value={formData.contactWhatsapp}
                    onChange={(e) => setFormData((p) => ({ ...p, contactWhatsapp: e.target.value }))}
                    dir="ltr"
                    className="text-left"
                  />
                </div>
              </div>

              {/* ── Notes ─────────────────────────────────────────────── */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">{sa.notes}</Label>
                <Textarea
                  placeholder={sa.notes}
                  value={formData.notes}
                  onChange={(e) => setFormData((p) => ({ ...p, notes: e.target.value }))}
                  rows={3}
                />
              </div>

              {/* ── Edit-only: Subscription Management ────────────────── */}
              {editingCentre && (
                <>
                  <Separator />
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold flex items-center gap-2">
                      <CalendarClock className="h-4 w-4 text-muted-foreground" />
                      {sa.subscription}
                    </h3>

                    {/* Current status */}
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-sm text-muted-foreground">{sa.subscriptionStatus}:</span>
                      <StatusBadge
                        status={editingCentre.subscriptionStatus}
                        label={getStatusLabel(editingCentre.subscriptionStatus, sa)}
                      />
                      <span className="text-sm text-muted-foreground">
                        {sa.subscriptionPack}: {getPackLabel(editingCentre.subscriptionPack, sa)}
                      </span>
                    </div>

                    {/* Subscription dates */}
                    {(editingCentre.subscriptionStart || editingCentre.subscriptionEnd) && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="text-sm">
                          <span className="text-muted-foreground">{sa.activationDate}:</span>{' '}
                          <span className="font-medium">{formatDate(editingCentre.subscriptionStart)}</span>
                        </div>
                        <div className="text-sm">
                          <span className="text-muted-foreground">{sa.expiryDate}:</span>{' '}
                          <span className="font-medium">{formatDate(editingCentre.subscriptionEnd)}</span>
                        </div>
                      </div>
                    )}

                    {/* Activate trial */}
                    {editingCentre.subscriptionStatus === 'none' && (
                      <Button
                        variant="outline"
                        className="w-full gap-2 border-blue-200 text-blue-700 hover:bg-blue-50"
                        onClick={() => handleActivateTrial(editingCentre.id)}
                      >
                        <Clock className="h-4 w-4" />
                        {sa.activateTrial}
                      </Button>
                    )}

                    {/* Pack selector */}
                    <div className="space-y-3">
                      <Label className="text-sm font-semibold">{sa.selectPack}</Label>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {([
                          { value: '1month', label: sa.pack1month },
                          { value: '1year', label: sa.pack1year },
                          { value: 'unlimited', label: sa.packUnlimited },
                        ] as const).map((pack) => (
                          <label
                            key={pack.value}
                            className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                              selectedPack === pack.value
                                ? 'border-primary bg-primary/5'
                                : 'border-border hover:border-primary/30 hover:bg-accent/50'
                            }`}
                          >
                            <input
                              type="radio"
                              name="pack"
                              value={pack.value}
                              checked={selectedPack === pack.value}
                              onChange={(e) => setSelectedPack(e.target.value)}
                              className="accent-primary"
                            />
                            <span className="text-sm font-medium">{pack.label}</span>
                          </label>
                        ))}
                      </div>
                      {selectedPack && (
                        <Button
                          className="gap-2 w-full sm:w-auto"
                          onClick={() => {
                            handleEditSubmit();
                          }}
                          disabled={submitting}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          {sa.activatePack}
                        </Button>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="shrink-0 border-t px-6 py-4 bg-muted/30 flex flex-col-reverse sm:flex-row items-center gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={submitting}
            >
              {t.common.cancel}
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="gap-2 min-w-[120px]"
            >
              {submitting ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  {t.common.saving}
                </>
              ) : editingCentre ? (
                <>
                  <Pencil className="h-4 w-4" />
                  {sa.saveChanges}
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  {sa.addCentre}
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════════════
          DELETE CONFIRMATION DIALOG
          ═══════════════════════════════════════════════════════════════════ */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              {sa.deleteCentre}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-start leading-relaxed pt-2">
              {sa.deleteConfirm}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-start mt-4">
            <AlertDialogCancel className="m-0">{t.common.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-white hover:bg-destructive/90 m-0 gap-2"
            >
              <Trash2 className="h-4 w-4" />
              {t.common.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ═══════════════════════════════════════════════════════════════════
          RESET PASSWORD DIALOG
          ═══════════════════════════════════════════════════════════════════ */}
      <Dialog open={resetPwOpen} onOpenChange={setResetPwOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5" />
              {sa.resetPassword}
            </DialogTitle>
            <DialogDescription>
              {resetPwCentre?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-sm font-semibold">{sa.newPassword} <span className="text-red-500">*</span></Label>
              <Input
                type="password"
                placeholder="••••••••"
                value={resetPwValue}
                onChange={(e) => setResetPwValue(e.target.value)}
                dir="ltr"
                className="text-left"
              />
            </div>
          </div>
          <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
            <Button variant="outline" onClick={() => setResetPwOpen(false)} disabled={resetPwSubmitting}>
              {t.common.cancel}
            </Button>
            <Button onClick={handleResetPassword} disabled={resetPwSubmitting} className="gap-2">
              {resetPwSubmitting ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <KeyRound className="h-4 w-4" />
              )}
              {sa.resetPassword}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
