'use client';

import { centreFetch, isExpired } from '@/store/store';
import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
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
// ScrollArea removed - using overflow-y-auto for reliable footer visibility
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  ShieldCheck,
  Shield,
  UserCog,
  Users,
} from 'lucide-react';
import { useT } from '@/hooks/use-translation';

// ── Types ──────────────────────────────────────────────────────────────────

interface User {
  id: string;
  email: string;
  fullName: string;
  role: 'ADMIN' | 'SECRETARY';
  status: 'active' | 'inactive';
  accessPages: string;
  createdAt: string;
}

interface UserFormData {
  fullName: string;
  email: string;
  password: string;
  role: 'ADMIN' | 'SECRETARY';
  status: 'active' | 'inactive';
  accessPages: string[];
}

interface AccessPage {
  id: string;
  label: string;
  icon: string;
}

// ── Constants ──────────────────────────────────────────────────────────────

const ALL_PAGES: AccessPage[] = [
  { id: 'dashboard', label: 'dashboard', icon: 'LayoutDashboard' },
  { id: 'financial-reports', label: 'financial-reports', icon: 'TrendingUp' },
  { id: 'students', label: 'students', icon: 'Users' },
  { id: 'teachers', label: 'teachers', icon: 'GraduationCap' },
  { id: 'payments', label: 'payments', icon: 'Receipt' },
  { id: 'teacher-payments', label: 'teacher-payments', icon: 'Wallet' },
  { id: 'schedule', label: 'schedule', icon: 'CalendarDays' },
  { id: 'services', label: 'services', icon: 'BookOpen' },
  { id: 'classrooms', label: 'classrooms', icon: 'DoorOpen' },
  { id: 'settings', label: 'settings', icon: 'Settings' },
];

const ALL_PAGE_IDS = ALL_PAGES.map((p) => p.id);

const defaultFormData: UserFormData = {
  fullName: '',
  email: '',
  password: '',
  role: 'SECRETARY',
  status: 'active',
  accessPages: [],
};

// ── Helpers ────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day} / ${month} / ${year}`;
}

function parseAccessPages(accessPages: string): string[] {
  if (!accessPages) return [];
  return accessPages.split(',').map((p) => p.trim()).filter(Boolean);
}

const PAGE_LABEL_KEY_MAP: Record<string, keyof import('@/lib/translations').Translations['users']> = {
  dashboard: 'pageDashboard',
  'financial-reports': 'pageFinancialReports',
  students: 'pageStudents',
  teachers: 'pageTeachers',
  payments: 'pagePayments',
  'teacher-payments': 'pageTeacherPayments',
  schedule: 'pageSchedule',
  services: 'pageServices',
  classrooms: 'pageClassrooms',
  settings: 'pageSettings',
};

function TableSkeleton() {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  );
}

// ── Component ──────────────────────────────────────────────────────────────

export default function UsersView() {
  const t = useT();

  // ── State ───────────────────────────────────────────────────────────────

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Search
  const [searchQuery, setSearchQuery] = useState('');

  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<UserFormData>(defaultFormData);
  const [submitting, setSubmitting] = useState(false);

  // Delete state
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);

  // ── Data fetching ──────────────────────────────────────────────────────

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await centreFetch('/api/users');
      if (!res.ok) throw new Error();
      const json = await res.json();
      setUsers(json);
    } catch { if (!isExpired()) toast.error(t.users.fetchError); } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // ── Filtered users ─────────────────────────────────────────────────────

  const filteredUsers = users.filter((user) => {
    if (!searchQuery || searchQuery.length < 1) return true;
    const q = searchQuery.toLowerCase();
    return (
      (user.fullName || '').toLowerCase().includes(q) ||
      (user.email || '').toLowerCase().includes(q)
    );
  });

  // ── Badge helpers ──────────────────────────────────────────────────────

  const getRoleBadge = (role: string) => {
    if (role === 'ADMIN') {
      return (
        <Badge className="bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100">
          <ShieldCheck className="h-3 w-3 ms-1" />
          {t.users.adminRole}
        </Badge>
      );
    }
    return (
      <Badge className="bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100">
        <Shield className="h-3 w-3 ms-1" />
        {t.users.secretaryRole}
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    if (status === 'active') {
      return (
        <Badge className="bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100">
          {t.common.active}
        </Badge>
      );
    }
    return (
      <Badge className="bg-red-100 text-red-700 border-red-200 hover:bg-red-100">
        {t.common.inactive}
      </Badge>
    );
  };

  // ── Access pages helpers ───────────────────────────────────────────────

  const toggleAccessPage = (pageId: string) => {
    setFormData((prev) => {
      if (prev.role === 'ADMIN') return prev;
      const pages = prev.accessPages.includes(pageId)
        ? prev.accessPages.filter((p) => p !== pageId)
        : [...prev.accessPages, pageId];
      return { ...prev, accessPages: pages };
    });
  };

  const selectAllPages = () => {
    if (formData.role === 'ADMIN') return;
    setFormData((prev) => ({
      ...prev,
      accessPages: prev.accessPages.length === ALL_PAGE_IDS.length ? [] : [...ALL_PAGE_IDS],
    }));
  };

  // ── Form handling ──────────────────────────────────────────────────────

  const handleOpenDialog = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        fullName: user.fullName,
        email: user.email,
        password: '',
        role: user.role,
        status: user.status,
        accessPages: user.role === 'ADMIN' ? [...ALL_PAGE_IDS] : parseAccessPages(user.accessPages),
      });
    } else {
      setEditingUser(null);
      setFormData(defaultFormData);
    }
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.fullName.trim()) {
      toast.error(t.users.nameRequired);
      return;
    }
    if (!formData.email.trim()) {
      toast.error(t.users.emailRequired);
      return;
    }
    if (!editingUser && !formData.password.trim()) {
      toast.error(t.users.passwordRequired);
      return;
    }

    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        fullName: formData.fullName.trim(),
        email: formData.email.trim(),
        role: formData.role,
        status: formData.status,
        accessPages: formData.role === 'ADMIN' ? ALL_PAGE_IDS.join(',') : formData.accessPages.join(','),
      };

      if (formData.password.trim()) {
        payload.password = formData.password.trim();
      }

      const url = editingUser ? `/api/users/${editingUser.id}` : '/api/users';
      const method = editingUser ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error();
      toast.success(editingUser ? t.users.updateSuccess : t.users.addSuccess);
      setDialogOpen(false);
      fetchUsers();
    } catch { if (!isExpired()) toast.error(t.users.saveError); } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingUser) return;
    try {
      const res = await fetch(`/api/users/${deletingUser.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error();
      toast.success(t.users.deleteSuccess);
      setDeleteOpen(false);
      setDeletingUser(null);
      fetchUsers();
    } catch { if (!isExpired()) toast.error(t.users.deleteError); }
  };

  // ── Handle role change in form ─────────────────────────────────────────

  const handleRoleChange = (role: 'ADMIN' | 'SECRETARY') => {
    setFormData((prev) => ({
      ...prev,
      role,
      accessPages: role === 'ADMIN' ? [...ALL_PAGE_IDS] : [],
    }));
  };

  // ── Page label helper ─────────────────────────────────────────────────

  const getPageLabel = (pageId: string) => {
    const key = PAGE_LABEL_KEY_MAP[pageId];
    if (key) {
      return t.users[key] as string;
    }
    return pageId;
  };

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div dir="rtl" className="space-y-4">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Users className="h-5 w-5" />
          <span className="text-sm">{users.length} {t.users.userCount}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-full sm:w-64">
            <Search className="absolute end-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t.users.searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pe-10"
            />
          </div>
          <Button onClick={() => handleOpenDialog()} className="gap-2 shrink-0">
            <Plus className="h-4 w-4" />
            {t.users.addUser}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">{t.users.totalUsers}</p>
            <p className="text-lg font-bold mt-1">{users.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">{t.users.adminsLabel}</p>
            <p className="text-lg font-bold text-blue-700 mt-1">
              {users.filter((u) => u.role === 'ADMIN').length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">{t.users.secretariesLabel}</p>
            <p className="text-lg font-bold text-blue-600 mt-1">
              {users.filter((u) => u.role === 'SECRETARY').length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">{t.users.activeUsersLabel}</p>
            <p className="text-lg font-bold text-sky-600 mt-1">
              {users.filter((u) => u.status === 'active').length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <TableSkeleton />
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <UserCog className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">
                {searchQuery ? t.users.noSearchResults : t.users.noUsersYet}
              </p>
              <p className="text-sm mt-1">
                {searchQuery ? t.users.tryOtherSearch : t.users.addFirstUser}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-start">{t.common.name}</TableHead>
                    <TableHead className="text-start">{t.common.email}</TableHead>
                    <TableHead className="text-start hidden md:table-cell">{t.users.role}</TableHead>
                    <TableHead className="text-start hidden sm:table-cell">{t.common.status}</TableHead>
                    <TableHead className="text-start hidden lg:table-cell">{t.users.createdDate}</TableHead>
                    <TableHead className="text-start">{t.common.actions}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="text-start">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
                              user.role === 'ADMIN'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-blue-100 text-blue-700'
                            }`}
                          >
                            {user.role === 'ADMIN' ? (
                              <ShieldCheck className="h-4 w-4" />
                            ) : (
                              <Shield className="h-4 w-4" />
                            )}
                          </div>
                          <p className="font-medium text-sm">{user.fullName}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground" dir="ltr">
                        {user.email}
                      </TableCell>
                      <TableCell className="text-start hidden md:table-cell">
                        {getRoleBadge(user.role)}
                      </TableCell>
                      <TableCell className="text-start hidden sm:table-cell">
                        {getStatusBadge(user.status)}
                      </TableCell>
                      <TableCell className="text-start hidden lg:table-cell text-sm text-muted-foreground">
                        {formatDate(user.createdAt)}
                      </TableCell>
                      <TableCell className="text-start">
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleOpenDialog(user)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => {
                              setDeletingUser(user);
                              setDeleteOpen(true);
                            }}
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
          ADD / EDIT USER DIALOG
          ═══════════════════════════════════════════════════════════════════ */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl p-0 gap-0 max-h-[90vh] flex flex-col">
          <DialogHeader className="shrink-0 px-6 pt-6 pb-2">
            <DialogTitle>
              {editingUser ? t.users.editUser : t.users.addNewUser}
            </DialogTitle>
            <DialogDescription>
              {editingUser
                ? t.users.editUserDesc
                : t.users.addNewUserDesc}
            </DialogDescription>
          </DialogHeader>

          <div className="overflow-y-auto flex-1 min-h-0 px-6 py-4">
            <div className="grid gap-5">
              {/* ── Full Name ─────────────────────────────────────────── */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">{t.common.name}</Label>
                <Input
                  placeholder={t.users.fullNamePlaceholder}
                  value={formData.fullName}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, fullName: e.target.value }))
                  }
                />
              </div>

              {/* ── Email ─────────────────────────────────────────────── */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">{t.common.email}</Label>
                <Input
                  type="email"
                  placeholder="example@email.com"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, email: e.target.value }))
                  }
                  dir="ltr"
                  className="text-left"
                />
              </div>

              {/* ── Password ──────────────────────────────────────────── */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">{t.users.password}</Label>
                <Input
                  type="password"
                  placeholder={editingUser ? t.users.passwordKeepHint : t.users.passwordPlaceholder}
                  value={formData.password}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, password: e.target.value }))
                  }
                  dir="ltr"
                  className="text-left"
                />
                {editingUser && (
                  <p className="text-xs text-muted-foreground">
                    {t.users.passwordKeepHint}
                  </p>
                )}
              </div>

              {/* ── Role & Status ─────────────────────────────────────── */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">{t.users.role}</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(val) => handleRoleChange(val as 'ADMIN' | 'SECRETARY')}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ADMIN">
                        <span className="flex items-center gap-2">
                          <ShieldCheck className="h-4 w-4 text-blue-700" />
                          {t.users.adminRole}
                        </span>
                      </SelectItem>
                      <SelectItem value="SECRETARY">
                        <span className="flex items-center gap-2">
                          <Shield className="h-4 w-4 text-blue-600" />
                          {t.users.secretaryRole}
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold">{t.common.status}</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(val) =>
                      setFormData((prev) => ({ ...prev, status: val as 'active' | 'inactive' }))
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">{t.common.active}</SelectItem>
                      <SelectItem value="inactive">{t.common.inactive}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* ── Access Pages ───────────────────────────────────────── */}
              <div className="space-y-3">
                <Separator />
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold">{t.users.accessPages}</Label>
                  {formData.role !== 'ADMIN' && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-xs gap-1.5"
                      onClick={selectAllPages}
                    >
                      {formData.accessPages.length === ALL_PAGE_IDS.length
                        ? t.users.deselectAll
                        : t.users.selectAll}
                    </Button>
                  )}
                </div>

                {formData.role === 'ADMIN' && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-sm text-blue-800">
                      <ShieldCheck className="h-4 w-4 inline ms-1.5" />
                      {t.users.adminFullAccess}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {ALL_PAGES.map((page) => {
                    const isChecked =
                      formData.role === 'ADMIN' || formData.accessPages.includes(page.id);
                    const isDisabled = formData.role === 'ADMIN';

                    return (
                      <label
                        key={page.id}
                        className={`flex items-center gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                          isChecked
                            ? 'bg-primary/5 border-primary/30'
                            : 'bg-card hover:bg-accent/50 border-border'
                        } ${isDisabled ? 'opacity-70 cursor-not-allowed' : ''}`}
                      >
                        <Checkbox
                          checked={isChecked}
                          disabled={isDisabled}
                          onCheckedChange={() => toggleAccessPage(page.id)}
                        />
                        <span className="text-sm font-medium">{getPageLabel(page.id)}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
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
              ) : editingUser ? (
                <>
                  <Pencil className="h-4 w-4" />
                  {t.common.saveChanges}
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  {t.users.addUser}
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
              {t.users.deleteConfirmTitle}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-start leading-relaxed pt-2">
              {t.users.deleteConfirmMsg}{' '}
              <span className="font-bold text-foreground">{deletingUser?.fullName}</span>
              ？ {t.common.cannotUndo}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-start mt-4">
            <AlertDialogCancel className="m-0">{t.common.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-white hover:bg-destructive/90 m-0 gap-2"
            >
              <Trash2 className="h-4 w-4" />
              {t.users.yesDeleteUser}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
