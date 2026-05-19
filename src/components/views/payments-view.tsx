'use client';

import { useAppStore, centreFetch, isExpired } from '@/store/store';
import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
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
// ScrollArea removed - using overflow-y-auto for reliable footer visibility
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Receipt,
  Wallet,
  Filter,
  FileText,
  AlertTriangle,
  User,
  Phone,
  UserCheck,
  CalendarDays,
  CalendarClock,
  X,
  ChevronDown,
  Tag,
  Percent,
  Gift,
  Sparkles,
  Star,
  Crown,
  Zap,
  Heart,
  Rocket,
  Flame,
  Trophy,
  GraduationCap,
  Package,
} from 'lucide-react';
import { useT } from '@/hooks/use-translation';

// ── Types ──────────────────────────────────────────────────────────────────

interface Payment {
  id: string;
  studentId: string;
  student: {
    id: string;
    fullName: string;
    phone: string | null;
    parentName: string | null;
    parentPhone: string | null;
    monthlyFee: number;
    level: {
      nameAr: string;
      nameFr: string;
      subject: { nameAr: string; nameFr: string; service?: { nameAr: string; nameFr: string; id: string } | null } | null;
    } | null;
    teacher: { id: string; fullName: string } | null;
  };
  amount: number;
  paidAmount: number;
  remainingAmount: number;
  discount: number;
  discountReason?: string | null;
  packMonths: number;
  month: string;
  year: number;
  paymentDate: string | null;
  method: string | null;
  notes: string | null;
  status: string;
  createdAt: string;
  promotionId?: string | null;
  promotion?: {
    id: string;
    name: string;
    nameAr: string;
    nameFr: string;
    type: string;
    value: number;
    color: string;
    icon: string;
  } | null;
  packDiscountId?: string | null;
  packDiscount?: {
    id: string;
    name: string;
    nameAr: string;
    nameFr: string;
    months: number;
    discountPercent: number;
  } | null;
}

interface StudentSearchResult {
  id: string;
  fullName: string;
  phone: string | null;
  parentName: string | null;
  parentPhone: string | null;
  monthlyFee: number;
  packMonths?: number;
  level: {
    nameAr: string;
    nameFr: string;
    subject: { nameAr: string; nameFr: string; service?: { nameAr: string; nameFr: string; id: string } | null } | null;
  } | null;
  teacher: { id: string; fullName: string } | null;
}

interface Service {
  id: string;
  name: string;
  nameAr: string;
  nameFr: string;
  subjects: {
    id: string;
    name: string;
    nameAr: string;
    nameFr: string;
    levels: {
      id: string;
      name: string;
      nameAr: string;
      nameFr: string;
    }[];
    order: number;
  }[];
  order: number;
}

interface Promotion {
  id: string;
  name: string;
  nameAr: string;
  nameFr: string;
  type: 'badge' | 'percentage' | 'fixed';
  value: number;
  color: string;
  icon: string;
  active: boolean;
}

interface PackDiscount {
  id: string;
  name: string;
  nameAr: string;
  nameFr: string;
  months: number;
  discountPercent: number;
  active: boolean;
}

interface PaymentFormData {
  studentId: string;
  amount: number | '';
  paidAmount: number | '';
  discount: number | '';
  packMonths: number;
  month: string;
  year: number | '';
  paymentDate: string;
  method: string;
  notes: string;
  status: string;
  promotionId: string | '';
  packDiscountId: string | '';
}

interface OverdueService {
  service: string;
  totalOverdue: number;
  studentCount: number;
  levels: OverdueLevel[];
}

interface OverdueLevel {
  level: string;
  totalOverdue: number;
  studentCount: number;
  students: OverdueStudent[];
}

interface OverdueStudent {
  studentId: string;
  studentName: string;
  phone: string | null;
  parentPhone: string | null;
  parentName: string | null;
  monthlyFee: number;
  totalOverdue: number;
  monthsOverdue: number;
  nextDueDate: string | null;
  subjectName: string | null;
  levelName: string | null;
  overduePayments: {
    id: string;
    month: string;
    monthLabel: string;
    year: number;
    remainingAmount: number;
    monthsOverdue: number;
  }[];
}

const defaultFormData: PaymentFormData = {
  studentId: '',
  amount: '',
  paidAmount: '',
  discount: '',
  packMonths: 1,
  month: '',
  year: new Date().getFullYear(),
  paymentDate: new Date().toISOString().split('T')[0],
  method: 'cash',
  notes: '',
  status: 'pending',
  promotionId: '',
  packDiscountId: '',
};

// ── Promotion icon map ──
const PROMO_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Tag, Percent, Gift, Sparkles, Star, Crown, Zap, Heart, Rocket, Flame, Trophy, GraduationCap,
};

const PROMO_COLOR_OPTIONS = [
  '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899',
  '#f43f5e', '#ef4444', '#f97316', '#f59e0b', '#eab308',
  '#84cc16', '#22c55e', '#10b981', '#14b8a6', '#06b6d4',
  '#0ea5e9', '#3b82f6', '#2563eb', '#1d4ed8', '#4f46e5',
];

const PROMO_ICON_OPTIONS = [
  'Tag', 'Percent', 'Gift', 'Sparkles', 'Star', 'Crown', 'Zap', 'Heart', 'Rocket', 'Flame', 'Trophy', 'GraduationCap',
];

const MONTH_KEYS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;

// ── Helpers ────────────────────────────────────────────────────────────────

function formatDate(dayMonthYear: string): string {
  if (!dayMonthYear) return '—';
  const d = new Date(dayMonthYear);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day} / ${month} / ${year}`;
}

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

export function PaymentsView() {
  const t = useT();
  const { userRole } = useAppStore();
  const lang = useAppStore((s) => s.lang);
  const isAr = lang === 'ar';
  const isAdmin = userRole === 'ADMIN';

  // Pack discounts state (declared early for PACK_OPTIONS useMemo)
  const [packDiscounts, setPackDiscounts] = useState<PackDiscount[]>([]);

  // ── Derived month data ──
  const MONTHS = useMemo(() =>
    MONTH_KEYS.map((key) => ({
      value: key,
      label: t.months[key],
    })),
  [t]);

  const MONTH_NAMES = useMemo(() =>
    Object.fromEntries(MONTHS.map((m) => [m.value, m.label])),
  [MONTHS]);

  const PAYMENT_METHODS = useMemo(() => [
    { value: 'cash', label: t.payments.cash },
    { value: 'transfer', label: t.payments.transfer },
    { value: 'check', label: t.payments.check },
  ], [t]);

  const PACK_OPTIONS = useMemo(() => {
    // Build options: always start with 1 month (no pack), then add dynamic packs
    const opts: { value: number; label: string; discountPercent: number; packDiscountId: string }[] = [
      { value: 1, label: t.payments.pack1, discountPercent: 0, packDiscountId: '' },
    ];
    for (const pd of packDiscounts) {
      const lang = useAppStore.getState().lang;
      const label = (lang === 'fr' ? pd.nameFr : pd.nameAr) || pd.name;
      opts.push({
        value: pd.months,
        label: `${label}${pd.discountPercent > 0 ? ` (-${pd.discountPercent}%)` : ''}`,
        discountPercent: pd.discountPercent,
        packDiscountId: pd.id,
      });
    }
    return opts;
  }, [t, packDiscounts]);

  const getStatusBadge = useCallback((status: string) => {
    switch (status) {
      case 'paid':
        return (
          <Badge className="bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100">
            {t.payments.statusPaid}
          </Badge>
        );
      case 'partial':
        return (
          <Badge className="bg-cyan-100 text-cyan-700 border-cyan-200 hover:bg-cyan-100">
            {t.payments.statusPartial}
          </Badge>
        );
      case 'pending':
        return (
          <Badge className="bg-red-100 text-red-700 border-red-200 hover:bg-red-100">
            {t.payments.statusPending}
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  }, [t]);

  const getMethodLabel = useCallback((method: string | null) => {
    switch (method) {
      case 'cash':
        return t.payments.cash;
      case 'transfer':
        return t.payments.transfer;
      case 'check':
        return t.payments.check;
      default:
        return method || '—';
    }
  }, [t]);

  // Centre info for bon (logo + name + phone + address)
  const [centreInfo, setCentreInfo] = useState<{ name: string; logoUrl: string | null; contactWhatsapp: string | null } | null>(null);
  useEffect(() => {
    (async () => {
      try {
        const res = await centreFetch('/api/centre-info');
        if (res.ok) setCentreInfo(await res.json());
      } catch { /* silent */ }
    })();
  }, []);

  // Also fetch settings for bon footer
  const [centreSettings, setCentreSettings] = useState<Record<string, string>>({});
  useEffect(() => {
    (async () => {
      try {
        const res = await centreFetch('/api/settings');
        if (res.ok) setCentreSettings(await res.json());
      } catch { /* silent */ }
    })();
  }, []);

  const getBonHtml = useCallback((payment: Payment) => {
    const student = payment.student;
    const monthLabel = MONTH_NAMES[payment.month] || payment.month;
    const paymentDate = payment.paymentDate ? formatDate(payment.paymentDate) : '—';
    const netAmount = payment.amount - payment.discount;

    const centreName = centreInfo?.name || 'Codex Centre';
    const centreLogo = centreInfo?.logoUrl || '/logo.png';
    const centrePhone = centreSettings.center_phone || centreInfo?.contactWhatsapp || '--';
    const centreAddress = centreSettings.center_address || '--';

    return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>${t.payments.bonPrint}</title>
  <base href="${typeof window !== 'undefined' ? window.location.origin + '/' : '/'}">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Tajawal', 'Segoe UI', Tahoma, sans-serif;
      background: white;
      padding: 0;
      color: #1a1a2e;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    @media print {
      .no-print { display: none !important; }
      @page { margin: 10mm; size: A4; }
    }
    .bon {
      max-width: 700px;
      margin: 0 auto;
      border: 2px solid #002A6C;
      padding: 32px;
    }
    .header {
      text-align: center;
      margin-bottom: 20px;
    }
    .header h1 {
      font-size: 20px;
      font-weight: 800;
      color: #002A6C;
      margin-top: 8px;
      margin-bottom: 0;
    }
    .header .logo {
      width: 70px;
      height: 70px;
      border-radius: 50%;
      object-fit: cover;
      display: block;
      margin: 0 auto;
    }
    .divider {
      height: 2px;
      background: #002A6C;
      margin: 16px 0;
    }
    .info-section {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 20px;
    }
    .info-item {
      font-size: 14px;
    }
    .info-item .label {
      color: #64748b;
      font-weight: 500;
    }
    .info-item .value {
      font-weight: 700;
      color: #1e293b;
    }
    .details-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 14px;
      margin-bottom: 20px;
    }
    .details-table th,
    .details-table td {
      padding: 8px 12px;
      text-align: right;
      border-bottom: 1px solid #e2e8f0;
    }
    .details-table th {
      background: #f0fdfa;
      font-weight: 600;
      color: #002A6C;
      font-size: 13px;
    }
    .details-table .amount {
      font-weight: 700;
      text-align: left;
      direction: ltr;
    }
    .details-table .green { color: #059669; }
    .details-table .red { color: #dc2626; }
    .details-table .amber { color: #0090cc; }
    .bon-footer {
      margin-top: 40px;
      padding-top: 16px;
      border-top: 1px solid #e2e8f0;
      text-align: center;
      font-size: 12px;
      color: #475569;
      line-height: 1.8;
    }
    .bon-footer .phone-line {
      font-weight: 600;
      direction: ltr;
      display: inline-block;
    }
    .no-print {
      text-align: center;
      margin-bottom: 16px;
    }
    .no-print button {
      background: #002A6C;
      color: white;
      border: none;
      padding: 10px 28px;
      border-radius: 8px;
      font-size: 15px;
      font-family: 'Tajawal', sans-serif;
      font-weight: 600;
      cursor: pointer;
    }
    .no-print button:hover { background: #003d99; }
  </style>
</head>
<body>
  <div class="bon">
    <div class="header">
      <img src="${centreLogo}" alt="${centreName}" class="logo">
      <h1>${centreName}</h1>
    </div>
    <div class="divider"></div>
    <div class="info-section">
      <div class="info-item">
        <span class="label">${t.payments.bonStudentName}: </span>
        <span class="value">${student.fullName}</span>
      </div>
      <div class="info-item">
        <span class="label">${t.common.phone}: </span>
        <span class="value" dir="ltr">${student.phone || '—'}</span>
      </div>
    </div>
    <table class="details-table">
      <thead>
        <tr>
          <th>${t.payments.bonStatement}</th>
          <th class="amount">${t.payments.bonAmountDh}</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>${t.payments.bonRequired}</td>
          <td class="amount">${payment.amount.toLocaleString('ar-MA', { minimumFractionDigits: 2 })}</td>
        </tr>
        ${payment.discount > 0 ? `<tr>
          <td>${t.payments.bonDiscount}</td>
          <td class="amount amber">- ${payment.discount.toLocaleString('ar-MA', { minimumFractionDigits: 2 })}</td>
        </tr>
        <tr>
          <td>${t.payments.bonAfterDiscount}</td>
          <td class="amount">${netAmount.toLocaleString('ar-MA', { minimumFractionDigits: 2 })}</td>
        </tr>` : ''}
        <tr>
          <td>${t.payments.bonPaid}</td>
          <td class="amount green">${payment.paidAmount.toLocaleString('ar-MA', { minimumFractionDigits: 2 })}</td>
        </tr>
        <tr>
          <td>${t.payments.bonRemaining}</td>
          <td class="amount red">${payment.remainingAmount.toLocaleString('ar-MA', { minimumFractionDigits: 2 })}</td>
        </tr>
        <tr>
          <td>${t.payments.bonMonthYear}</td>
          <td>${monthLabel} ${payment.year}${payment.packMonths > 1 ? ` (${t.payments.packBadge} ${payment.packMonths} ${t.payments.packMonthsUnit})` : ''}</td>
        </tr>
        ${payment.packMonths > 1 ? `<tr>
          <td>${t.payments.packMonthlyEquiv}</td>
          <td class="amount">${Math.round(payment.amount / payment.packMonths).toLocaleString('ar-MA', { minimumFractionDigits: 2 })}</td>
        </tr>` : ''}
        <tr>
          <td>${t.payments.bonPaymentDate}</td>
          <td dir="ltr" style="text-align:right">${paymentDate}</td>
        </tr>
      </tbody>
    </table>
    <div class="bon-footer">
      <div class="phone-line">${centrePhone}</div>
      <div>${centreAddress}</div>
    </div>
  </div>
  <div class="no-print" style="text-align:center; margin-top:16px;">
    <button onclick="window.print()">${t.payments.bonPrint}</button>
  </div>
</body>
</html>`;
  }, [t, MONTH_NAMES]);

  // Generate bon in new window for printing
  const generateBon = useCallback((payment: Payment) => {
    const bonHtml = getBonHtml(payment);
    const cleanHtml = bonHtml.replace(
      /<div class="no-print"[^>]*>[\s\S]*<\/div>\s*<\/body>/,
      '</body>'
    );
    const newWindow = window.open('', '_blank');
    if (newWindow) {
      newWindow.document.write(cleanHtml);
      newWindow.document.close();
    }
  }, [getBonHtml]);

  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  // Student search state
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [studentSearchResults, setStudentSearchResults] = useState<StudentSearchResult[]>([]);
  const [allStudents, setAllStudents] = useState<StudentSearchResult[]>([]);
  const [studentSearching, setStudentSearching] = useState(false);
  const studentsLoaded = useRef(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentSearchResult | null>(null);
  const [yearlyPaid, setYearlyPaid] = useState(0);

  // Check if selected student belongs to Langues service
  const isLanguesService = useMemo(() => {
    return selectedStudent?.level?.subject?.service?.id === 'service_langues';
  }, [selectedStudent]);

  // Filters
  const [filterMonth, setFilterMonth] = useState('all');
  const [filterYear, setFilterYear] = useState(String(new Date().getFullYear()));
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterServiceId, setFilterServiceId] = useState('all');
  const [filterSubjectId, setFilterSubjectId] = useState('all');
  const [filterLevelId, setFilterLevelId] = useState('all');
  const [services, setServices] = useState<Service[]>([]);

  // Student name/phone search filter for payments table
  const [paymentSearch, setPaymentSearch] = useState('');

  // Computed: subjects filtered by selected service
  const filterSubjects = useMemo(() => {
    if (filterServiceId === 'all') return [];
    const svc = services.find((s) => s.id === filterServiceId);
    return svc?.subjects || [];
  }, [filterServiceId, services]);

  // Computed: levels filtered by selected subject
  const filterLevels = useMemo(() => {
    if (filterSubjectId === 'all') return [];
    const svc = services.find((s) => s.id === filterServiceId);
    const subj = svc?.subjects.find((sub) => sub.id === filterSubjectId);
    return subj?.levels || [];
  }, [filterServiceId, filterSubjectId, services]);

  // Computed: filter payments by student name or phone
  const filteredPayments = useMemo(() => {
    if (!paymentSearch || paymentSearch.length < 1) return payments;
    const q = paymentSearch.toLowerCase();
    return payments.filter((p) => {
      const name = (p.student.fullName || '').toLowerCase();
      const phone = (p.student.phone || '').toLowerCase();
      const parentPhone = (p.student.parentPhone || '').toLowerCase();
      return name.includes(q) || phone.includes(q) || parentPhone.includes(q);
    });
  }, [payments, paymentSearch]);

  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [formData, setFormData] = useState<PaymentFormData>(defaultFormData);
  const [submitting, setSubmitting] = useState(false);

  // Delete state
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingPayment, setDeletingPayment] = useState<Payment | null>(null);

  // Overdue dialog state
  const [overdueOpen, setOverdueOpen] = useState(false);
  const [overdueData, setOverdueData] = useState<OverdueService[]>([]);
  const [overdueLoading, setOverdueLoading] = useState(false);
  const [creatingInvoice, setCreatingInvoice] = useState<string | null>(null);

  // Promotions state
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [promoDialogOpen, setPromoDialogOpen] = useState(false);
  const [promoForm, setPromoForm] = useState({
    name: '', nameAr: '', nameFr: '', type: 'badge' as 'badge' | 'percentage' | 'fixed',
    value: 0, color: '#6366f1', icon: 'Tag',
  });

  // Pack discount dialog state
  const [packDialogOpen, setPackDialogOpen] = useState(false);
  const [packForm, setPackForm] = useState({
    name: '', nameAr: '', nameFr: '', months: 3, discountPercent: 0,
  });

  // ── Data fetching ──────────────────────────────────────────────────────

  const fetchPromotions = useCallback(async () => {
    try {
      const res = await centreFetch('/api/promotions');
      if (res.ok) {
        const json = await res.json();
        setPromotions(json);
      }
    } catch { /* silent */ }
  }, []);

  const fetchPackDiscounts = useCallback(async () => {
    try {
      const res = await centreFetch('/api/pack-discounts');
      if (res.ok) {
        const json = await res.json();
        setPackDiscounts(json);
      }
    } catch { /* silent */ }
  }, []);

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterMonth !== 'all') params.set('month', filterMonth);
      if (filterYear) params.set('year', filterYear);
      if (filterStatus !== 'all') params.set('status', filterStatus);
      if (filterServiceId !== 'all') params.set('serviceId', filterServiceId);
      if (filterSubjectId !== 'all') params.set('subjectId', filterSubjectId);
      if (filterLevelId !== 'all') params.set('levelId', filterLevelId);
      const res = await centreFetch(`/api/payments?${params.toString()}`);
      if (!res.ok) throw new Error();
      const json = await res.json();
      setPayments(json);
    } catch { if (!isExpired()) toast.error(t.payments.fetchError); } finally {
      setLoading(false);
    }
  }, [filterMonth, filterYear, filterStatus, filterServiceId, filterSubjectId, filterLevelId, t]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  useEffect(() => {
    fetchPromotions();
  }, [fetchPromotions]);

  useEffect(() => {
    fetchPackDiscounts();
  }, [fetchPackDiscounts]);

  // Fetch services for filters
  useEffect(() => {
    const fetchServices = async () => {
      try {
        const res = await centreFetch('/api/services');
        if (!res.ok) throw new Error();
        const json = await res.json();
        setServices(json);
      } catch {
        // silent
      }
    };
    fetchServices();
  }, []);

  // Cascade: reset subject/level when service changes
  useEffect(() => {
    setFilterSubjectId('all');
    setFilterLevelId('all');
  }, [filterServiceId]);

  // Cascade: reset level when subject changes
  useEffect(() => {
    setFilterLevelId('all');
  }, [filterSubjectId]);

  // ── Load all students (for payment dialog) ─────────────────────────

  const loadAllStudents = useCallback(async () => {
    setStudentSearching(true);
    try {
      const res = await centreFetch('/api/students');
      if (!res.ok) throw new Error();
      const json = await res.json();
      setAllStudents(json);
      setStudentSearchResults(json);
    } catch {
      console.error('Failed to load students for payment dialog');
      setAllStudents([]);
      setStudentSearchResults([]);
    } finally {
      setStudentSearching(false);
    }
  }, []);

  // ── Student search (local filtering – no API calls) ────────────────

  const filteredStudents = useMemo(() => {
    if (!studentSearchQuery || studentSearchQuery.length < 1) {
      return allStudents;
    }
    const q = studentSearchQuery.toLowerCase();
    return allStudents.filter((s) => {
      const name = (s.fullName || '').toLowerCase();
      const phone = (s.phone || '').toLowerCase();
      const parentPhone = (s.parentPhone || '').toLowerCase();
      return name.includes(q) || phone.includes(q) || parentPhone.includes(q);
    });
  }, [studentSearchQuery, allStudents]);

  // Fetch yearly paid amount when student is selected
  useEffect(() => {
    if (!selectedStudent) {
      setYearlyPaid(0);
      return;
    }
    const currentYear = new Date().getFullYear();
    (async () => {
      try {
        const res = await centreFetch(
          `/api/payments?studentId=${selectedStudent.id}&year=${currentYear}`
        );
        if (!res.ok) return;
        const yearPayments: Payment[] = await res.json();
        const total = yearPayments.reduce((s, p) => s + p.paidAmount, 0);
        setYearlyPaid(total);
      } catch {
        setYearlyPaid(0);
      }
    })();
  }, [selectedStudent]);

  // ── Overdue fetching ──────────────────────────────────────────────────

  const fetchOverdue = useCallback(async () => {
    setOverdueLoading(true);
    try {
      const res = await centreFetch('/api/payments/overdue');
      if (!res.ok) throw new Error();
      const json = await res.json();
      setOverdueData(json);
    } catch { if (!isExpired()) toast.error(t.payments.overdueFetchError); } finally {
      setOverdueLoading(false);
    }
  }, [t]);

  const handleOpenOverdue = () => {
    setOverdueOpen(true);
    fetchOverdue();
  };

  const handleCreateInvoiceForOverdue = async (student: OverdueStudent) => {
    const now = new Date();
    const currentMonth = MONTH_KEYS[now.getMonth()];
    const currentYear = now.getFullYear();

    setCreatingInvoice(student.studentId);
    try {
      const res = await centreFetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: student.studentId,
          amount: student.monthlyFee,
          paidAmount: 0,
          discount: 0,
          packMonths: 1,
          month: currentMonth,
          year: currentYear,
          paymentDate: null,
          method: 'cash',
          notes: '',
          status: 'pending',
        }),
      });
      if (!res.ok) throw new Error('Failed to create');
      toast.success(t.payments.invoiceCreatedQuick);
      // Refresh overdue data
      fetchOverdue();
      // Also refresh main payments list
      fetchPayments();
    } catch { if (!isExpired()) toast.error(t.common.saveError); } finally {
      setCreatingInvoice(null);
    }
  };

  // ── Form handling ──────────────────────────────────────────────────────

  const handleOpenDialog = (payment?: Payment) => {
    if (payment) {
      setEditingPayment(payment);
      setSelectedStudent({
        id: payment.student.id,
        fullName: payment.student.fullName,
        phone: payment.student.phone,
        parentName: payment.student.parentName,
        parentPhone: payment.student.parentPhone,
        monthlyFee: payment.student.monthlyFee,
        level: payment.student.level,
        teacher: payment.student.teacher,
      });
      setFormData({
        studentId: payment.studentId,
        amount: payment.amount,
        paidAmount: payment.paidAmount,
        discount: payment.discount || 0,
        packMonths: payment.packMonths || 1,
        month: payment.month,
        year: payment.year,
        paymentDate:
          payment.paymentDate?.split('T')[0] ||
          new Date().toISOString().split('T')[0],
        method: payment.method || 'cash',
        notes: payment.notes || '',
        status: payment.status,
      });
    } else {
      setEditingPayment(null);
      setSelectedStudent(null);
      setStudentSearchQuery('');
      setStudentSearchResults([]);
      setFormData(defaultFormData);
      // Load all students once when opening add dialog
      if (!studentsLoaded.current) {
        studentsLoaded.current = true;
        loadAllStudents();
      } else {
        // Already loaded, just show them
        setStudentSearchResults(allStudents);
      }
    }
    setDialogOpen(true);
  };

  const handleSelectStudent = (student: StudentSearchResult) => {
    setSelectedStudent(student);
    setStudentSearchQuery('');
    setFormData((prev) => ({
      ...prev,
      studentId: student.id,
      amount: student.monthlyFee || '',
      packMonths: student.level?.subject?.service?.id === 'service_langues'
        ? (student.packMonths || prev.packMonths)
        : 1,
      discount: '',
      packDiscountId: '',
    }));
  };

  const handleClearStudent = () => {
    setSelectedStudent(null);
    setStudentSearchQuery('');
    setFormData((prev) => ({ ...prev, studentId: '', amount: '', packMonths: 1, discount: '', packDiscountId: '' }));
  };

  // Computed amounts
  const discountValue =
    typeof formData.discount === 'number' ? formData.discount : 0;
  const netAmount =
    (typeof formData.amount === 'number' ? formData.amount : 0) - discountValue;
  const remainingAmount =
    typeof formData.amount === 'number' && typeof formData.paidAmount === 'number'
      ? netAmount - formData.paidAmount
      : 0;

  // Auto-detect status
  const autoStatus =
    typeof formData.amount === 'number' && typeof formData.paidAmount === 'number'
      ? formData.paidAmount >= netAmount
        ? 'paid'
        : formData.paidAmount > 0
          ? 'partial'
          : 'pending'
      : formData.status;

  const handleSubmit = async () => {
    if (!formData.studentId) {
      toast.error(t.payments.studentRequired);
      return;
    }
    if (!formData.amount || Number(formData.amount) <= 0) {
      toast.error(t.payments.amountRequired);
      return;
    }
    if (!formData.month) {
      toast.error(t.payments.monthRequired);
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        amount: Number(formData.amount),
        paidAmount: Number(formData.paidAmount) || 0,
        discount: Number(formData.discount) || 0,
        discountReason: formData.promotionId
          ? (promotions.find(p => p.id === formData.promotionId)?.nameAr || '')
          : (formData.packDiscountId
            ? (packDiscounts.find(p => p.id === formData.packDiscountId)?.nameAr || t.payments.packDiscountApplied)
            : ''),
        packMonths: formData.packMonths || 1,
        year: Number(formData.year),
        remainingAmount:
          netAmount - (Number(formData.paidAmount) || 0),
        status: autoStatus,
        promotionId: formData.promotionId || null,
        packDiscountId: formData.packDiscountId || null,
      };

      const url = editingPayment
        ? `/api/payments/${editingPayment.id}`
        : '/api/payments';
      const method = editingPayment ? 'PUT' : 'POST';
      const res = await centreFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error();
      toast.success(
        editingPayment ? t.payments.updateSuccess : t.payments.addSuccess
      );

      // Offer to print bon for new payments
      if (!editingPayment) {
        const savedPayment = await res.json();
        setDialogOpen(false);
        fetchPayments();
        setTimeout(() => {
          if (confirm(t.common.printQuestion)) {
            generateBon(savedPayment);
          }
        }, 300);
        return;
      }

      setDialogOpen(false);
      fetchPayments();
    } catch { if (!isExpired()) toast.error(t.common.saveError); } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingPayment) return;
    try {
      const res = await centreFetch(`/api/payments/${deletingPayment.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error();
      toast.success(t.payments.deleteSuccess);
      setDeleteOpen(false);
      setDeletingPayment(null);
      fetchPayments();
    } catch { if (!isExpired()) toast.error(t.common.deleteError); }
  };

  // ── Promotion handlers ──────────────────────────────────────────────────

  const handlePromoCreate = async () => {
    if (!promoForm.nameAr.trim()) {
      toast.error(t.payments.promoNameRequired);
      return;
    }
    try {
      const res = await centreFetch('/api/promotions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(promoForm),
      });
      if (!res.ok) throw new Error();
      toast.success(t.payments.promoCreated);
      setPromoDialogOpen(false);
      setPromoForm({ name: '', nameAr: '', nameFr: '', type: 'badge', value: 0, color: '#6366f1', icon: 'Tag' });
      fetchPromotions();
    } catch { if (!isExpired()) toast.error(t.common.saveError); }
  };

  const handlePromoDelete = async (id: string) => {
    try {
      await centreFetch(`/api/promotions/${id}`, { method: 'DELETE' });
      toast.success(t.common.deleteSuccess);
      fetchPromotions();
      // Clear selection if deleted
      if (formData.promotionId === id) {
        setFormData({ ...formData, promotionId: '', discount: '' });
      }
    } catch { if (!isExpired()) toast.error(t.common.deleteError); }
  };

  const handlePromotionSelect = (promoId: string) => {
    if (!promoId) {
      setFormData({ ...formData, promotionId: '', discount: '' });
      return;
    }
    const promo = promotions.find(p => p.id === promoId);
    if (!promo) return;

    let newDiscount = 0;
    if (promo.type === 'percentage' && typeof formData.amount === 'number' && formData.amount > 0) {
      newDiscount = Math.round((formData.amount * promo.value) / 100 * 100) / 100;
    } else if (promo.type === 'fixed') {
      newDiscount = promo.value;
    }
    // badge type: no discount

    setFormData({
      ...formData,
      promotionId: promoId,
      discount: newDiscount > 0 ? newDiscount : '',
    });
  };

  // Auto-calculate discount when amount changes and a percentage promo is selected
  useEffect(() => {
    if (formData.promotionId && typeof formData.amount === 'number' && formData.amount > 0) {
      const promo = promotions.find(p => p.id === formData.promotionId);
      if (promo?.type === 'percentage') {
        const newDiscount = Math.round((formData.amount * promo.value) / 100 * 100) / 100;
        setFormData(prev => ({ ...prev, discount: newDiscount }));
      }
    }
  }, [formData.amount, formData.promotionId, promotions]);

  // ── Pack discount handlers ─────────────────────────────────────────────

  const handlePackDiscountCreate = async () => {
    if (!packForm.name.trim() || !packForm.nameAr.trim()) {
      toast.error(t.payments.packNameRequired);
      return;
    }
    try {
      const res = await centreFetch('/api/pack-discounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(packForm),
      });
      if (res.ok) {
        toast.success(t.payments.packCreated);
        setPackForm({ name: '', nameAr: '', nameFr: '', months: 3, discountPercent: 0 });
        setPackDialogOpen(false);
        fetchPackDiscounts();
      }
    } catch { if (!isExpired()) toast.error(t.common.saveError); }
  };

  const handlePackDiscountDelete = async (id: string) => {
    try {
      await centreFetch(`/api/pack-discounts/${id}`, { method: 'DELETE' });
      toast.success(t.common.deleteSuccess);
      fetchPackDiscounts();
      if (formData.packDiscountId === id) {
        const monthlyFee = selectedStudent?.monthlyFee || 0;
        setFormData(prev => ({
          ...prev,
          packMonths: 1,
          packDiscountId: '',
          amount: monthlyFee || prev.amount,
          discount: '',
        }));
      }
    } catch { if (!isExpired()) toast.error(t.common.deleteError); }
  };

  const handlePackSelect = (opt: { value: number; discountPercent: number; packDiscountId: string }) => {
    const monthlyFee = selectedStudent?.monthlyFee || (typeof formData.amount === 'number' ? formData.amount : 0);
    const totalNormal = monthlyFee * opt.value;
    const discount = totalNormal * opt.discountPercent / 100;

    setFormData(prev => ({
      ...prev,
      packMonths: opt.value,
      packDiscountId: opt.packDiscountId,
      amount: Math.round(totalNormal * 100) / 100,
      discount: discount > 0 ? Math.round(discount * 100) / 100 : prev.discount,
    }));
  };

  // ── Totals ─────────────────────────────────────────────────────────────

  const totalAmount = filteredPayments.reduce((s, p) => s + p.amount, 0);
  const totalDiscount = filteredPayments.reduce((s, p) => s + (p.discount || 0), 0);
  const totalPaid = filteredPayments.reduce((s, p) => s + p.paidAmount, 0);
  const totalRemaining = filteredPayments.reduce(
    (s, p) => s + p.remainingAmount,
    0
  );

  const grandTotalOverdue = overdueData.reduce(
    (s, svc) => s + svc.totalOverdue,
    0
  );

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Wallet className="h-5 w-5" />
          <span className="text-sm">{filteredPayments.length} {t.payments.paymentCount}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleOpenOverdue}
            className="gap-2 border-cyan-300 text-cyan-700 hover:bg-cyan-50 hover:text-cyan-800"
          >
            <AlertTriangle className="h-4 w-4" />
            {t.payments.overdue}
          </Button>
          <Button onClick={() => handleOpenDialog()} className="gap-2">
            <Plus className="h-4 w-4" />
            {t.payments.addPayment}
          </Button>
        </div>
      </div>

      {/* Summary Cards - Admin only */}
      {isAdmin && (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">{t.payments.requiredAmount}</p>
            <p className="text-lg font-bold mt-1">
              {totalAmount.toLocaleString()}{' '}
              <span className="text-xs font-normal">{t.common.dh}</span>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">{t.payments.discount}</p>
            <p className="text-lg font-bold text-cyan-600 mt-1">
              {totalDiscount.toLocaleString()}{' '}
              <span className="text-xs font-normal">{t.common.dh}</span>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">{t.payments.paid}</p>
            <p className="text-lg font-bold text-blue-700 mt-1">
              {totalPaid.toLocaleString()}{' '}
              <span className="text-xs font-normal">{t.common.dh}</span>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">{t.payments.remaining}</p>
            <p className="text-lg font-bold text-red-600 mt-1">
              {totalRemaining.toLocaleString()}{' '}
              <span className="text-xs font-normal">{t.common.dh}</span>
            </p>
          </CardContent>
        </Card>
      </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          {/* Student search row */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-3">
            <div className="relative flex-1 w-full">
              <Search className="absolute end-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t.payments.searchPaymentPlaceholder}
                value={paymentSearch}
                onChange={(e) => setPaymentSearch(e.target.value)}
                className="ps-9"
              />
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1 w-full">
              <Select value={filterServiceId} onValueChange={setFilterServiceId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t.students.filterByService} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.students.allServices}</SelectItem>
                  {services.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {isAr ? (s.nameAr || s.name) : (s.nameFr || s.name)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterSubjectId} onValueChange={setFilterSubjectId} disabled={filterServiceId === 'all'}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t.students.filterBySubject} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.students.allSubjects}</SelectItem>
                  {filterSubjects.map((subj) => (
                    <SelectItem key={subj.id} value={subj.id}>
                      {isAr ? (subj.nameAr || subj.name) : (subj.nameFr || subj.name)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterLevelId} onValueChange={setFilterLevelId} disabled={filterSubjectId === 'all'}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t.students.filterByLevel} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.students.allLevels}</SelectItem>
                  {filterLevels.map((lvl) => (
                    <SelectItem key={lvl.id} value={lvl.id}>
                      {isAr ? (lvl.nameAr || lvl.name) : (lvl.nameFr || lvl.name)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {/* Second row: month, year, status */}
          {(filterServiceId !== 'all' || filterSubjectId !== 'all' || filterLevelId !== 'all') && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mt-3 pt-3 border-t border-gray-100">
              <div className="w-4 shrink-0" />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1 w-full">
                <Select value={filterMonth} onValueChange={setFilterMonth}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t.payments.allMonths} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.payments.allMonths}</SelectItem>
                    {MONTHS.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  placeholder={t.payments.year}
                  value={filterYear}
                  onChange={(e) => setFilterYear(e.target.value)}
                  dir="ltr"
                  className="w-full"
                />
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t.payments.allStatuses} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.payments.allStatuses}</SelectItem>
                    <SelectItem value="paid">{t.payments.statusPaid}</SelectItem>
                    <SelectItem value="partial">{t.payments.statusPartial}</SelectItem>
                    <SelectItem value="pending">{t.payments.statusPending}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          {(filterServiceId !== 'all' || filterSubjectId !== 'all' || filterLevelId !== 'all') && (
            <div className="mt-2 flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground hover:text-red-600"
                onClick={() => {
                  setFilterServiceId('all');
                  setFilterSubjectId('all');
                  setFilterLevelId('all');
                }}
              >
                <X className="h-3 w-3 ms-1" />
                {t.common.clear}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <TableSkeleton />
          ) : filteredPayments.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Receipt className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">{paymentSearch ? t.common.noResults : t.payments.noPayments}</p>
              <p className="text-sm mt-1">
                {paymentSearch ? t.common.tryOtherSearch : t.payments.addFirst}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto max-h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-start">{t.payments.studentCol}</TableHead>
                    <TableHead className="text-start">{t.payments.monthYearCol}</TableHead>
                    {isAdmin && (
                    <>
                    <TableHead className="text-start hidden md:table-cell">
                      {t.payments.amountCol}
                    </TableHead>
                    <TableHead className="text-start hidden md:table-cell">
                      {t.payments.paidCol}
                    </TableHead>
                    <TableHead className="text-start hidden lg:table-cell">
                      {t.payments.remainingCol}
                    </TableHead>
                    <TableHead className="text-start hidden lg:table-cell">
                      {t.payments.discountCol}
                    </TableHead>
                    </>
                    )}
                    <TableHead className="text-start hidden lg:table-cell">
                      {t.payments.dateCol}
                    </TableHead>
                    <TableHead className="text-start">{t.common.status}</TableHead>
                    <TableHead className="text-start">{t.common.actions}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="text-start">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className="font-medium text-sm">
                              {payment.student.fullName}
                            </p>
                            {payment.promotion && (
                              <Badge
                                className="text-[10px] px-2 py-0.5 font-medium shrink-0"
                                style={{
                                  backgroundColor: payment.promotion.color + '20',
                                  color: payment.promotion.color,
                                  borderColor: payment.promotion.color,
                                  borderWidth: '1.5px',
                                  borderStyle: 'solid',
                                }}
                              >
                                {payment.promotion.icon && <span className="me-1">{payment.promotion.icon}</span>}
                                {isAr ? payment.promotion.nameAr : payment.promotion.nameFr}
                              </Badge>
                            )}
                            {!payment.promotion && payment.packDiscount && (
                              <Badge
                                className="text-[10px] px-2 py-0.5 font-medium bg-violet-100 text-violet-700 border border-violet-400 shrink-0"
                              >
                                <Package className="h-2.5 w-2.5 me-1 inline" />
                                {isAr ? payment.packDiscount.nameAr : payment.packDiscount.nameFr}
                                {payment.packDiscount.discountPercent > 0 && (
                                  <span className="ms-1 opacity-75">(-{payment.packDiscount.discountPercent}%)</span>
                                )}
                              </Badge>
                            )}
                            {!payment.promotion && !payment.packDiscount && payment.discount > 0 && payment.discountReason && (
                              <Badge
                                className="text-[10px] px-2 py-0.5 font-medium bg-emerald-100 text-emerald-700 border border-emerald-400 shrink-0"
                              >
                                <Tag className="h-2.5 w-2.5 me-1 inline" />
                                {payment.discountReason}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {payment.student.level && payment.student.level.subject && (
                              <span>
                                {isAr ? payment.student.level.subject.nameAr : payment.student.level.subject.nameFr} -{' '}
                                {isAr ? payment.student.level.nameAr : payment.student.level.nameFr}
                              </span>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-start text-sm">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span>
                            {MONTH_NAMES[payment.month] || payment.month}{' '}
                            {payment.year}
                          </span>
                          {payment.packMonths > 1 && (
                            <Badge className="bg-violet-100 text-violet-700 border-violet-200 hover:bg-violet-100 text-[10px] px-1.5 py-0">
                              {payment.packDiscount
                                ? `${isAr ? payment.packDiscount.nameAr : payment.packDiscount.nameFr} (${payment.packMonths} ${t.payments.packMonthsUnit})`
                                : `${t.payments.packBadge} ${payment.packMonths} ${t.payments.packMonthsUnit}`
                              }
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      {isAdmin && (
                      <>
                      <TableCell className="text-start hidden md:table-cell font-medium">
                        {payment.amount.toLocaleString()}{' '}
                        <span className="text-xs font-normal">{t.common.dh}</span>
                      </TableCell>
                      <TableCell className="text-start hidden md:table-cell text-blue-700">
                        {payment.paidAmount.toLocaleString()}{' '}
                        <span className="text-xs font-normal">{t.common.dh}</span>
                      </TableCell>
                      <TableCell className="text-start hidden lg:table-cell text-red-600">
                        {payment.remainingAmount.toLocaleString()}{' '}
                        <span className="text-xs font-normal">{t.common.dh}</span>
                      </TableCell>
                      <TableCell className="text-start hidden lg:table-cell text-cyan-600">
                        {payment.discount > 0 ? (
                          <span>
                            {payment.discount.toLocaleString()}{' '}
                            <span className="text-xs font-normal">{t.common.dh}</span>
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      </>
                      )}
                      <TableCell className="text-start hidden lg:table-cell text-sm text-muted-foreground">
                        {payment.paymentDate
                          ? formatDate(payment.paymentDate)
                          : '—'}
                      </TableCell>
                      <TableCell className="text-start">
                        {getStatusBadge(payment.status)}
                      </TableCell>
                      <TableCell className="text-start">
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => generateBon(payment)}
                            title={t.common.printBon}
                          >
                            <FileText className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleOpenDialog(payment)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => {
                              setDeletingPayment(payment);
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
          ADD / EDIT PAYMENT DIALOG
          ═══════════════════════════════════════════════════════════════════ */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl p-0 gap-0 max-h-[90vh] flex flex-col">
          <DialogHeader className="shrink-0 px-8 pt-6 pb-2">
            <DialogTitle>
              {editingPayment ? t.payments.editPayment : t.payments.addNew}
            </DialogTitle>
            <DialogDescription>
              {editingPayment
                ? t.payments.editDesc
                : t.payments.addDesc}
            </DialogDescription>
          </DialogHeader>

          <div className="overflow-y-auto flex-1 min-h-0 px-8 py-4">
            <div className="grid gap-4">
              {/* ── Student Search ─────────────────────────────────────── */}
              {!editingPayment && !selectedStudent && (
                <div className="space-y-3">
                  <Label className="text-sm font-semibold">
                    {t.payments.searchStudent}
                  </Label>
                  <div className="relative">
                    <Search className="absolute end-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder={t.payments.searchStudentPlaceholder}
                      value={studentSearchQuery}
                      onChange={(e) =>
                        setStudentSearchQuery(e.target.value)
                      }
                      className="ps-10"
                    />
                  </div>

                  {/* Search results as profile cards */}
                  {studentSearching && (
                    <div className="flex items-center justify-center py-4">
                      <Skeleton className="h-12 w-full" />
                    </div>
                  )}

                  {!studentSearching &&
                    filteredStudents.length > 0 &&
                    !selectedStudent && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto">
                        {filteredStudents.map((s) => (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => handleSelectStudent(s)}
                            className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 hover:border-primary/40 transition-colors text-start w-full"
                          >
                            <div className="h-9 w-9 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center shrink-0 mt-0.5">
                              <User className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm truncate">
                                {s.fullName}
                              </p>
                              {s.phone && (
                                <p
                                  className="text-xs text-muted-foreground truncate"
                                  dir="ltr"
                                >
                                  {s.phone}
                                </p>
                              )}
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                {s.level && s.level.subject && (
                                  <span className="text-[10px] bg-sky-50 text-sky-700 px-1.5 py-0.5 rounded">
                                    {isAr ? s.level.subject.nameAr : s.level.subject.nameFr} -{' '}
                                    {isAr ? s.level.nameAr : s.level.nameFr}
                                  </span>
                                )}
                                {s.monthlyFee > 0 && (
                                  <span className="text-[10px] bg-cyan-50 text-cyan-700 px-1.5 py-0.5 rounded">
                                    {s.monthlyFee.toLocaleString()} {t.common.month}
                                  </span>
                                )}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                  {!studentSearching &&
                    allStudents.length > 0 &&
                    filteredStudents.length === 0 &&
                    !selectedStudent && (
                      <div className="text-center py-6 text-muted-foreground text-sm">
                        {t.payments.noStudentFound}
                      </div>
                    )}
                </div>
              )}

              {/* ── Selected Student Profile Card ──────────────────────── */}
              {selectedStudent && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold">
                      {t.payments.selectedStudent}
                    </Label>
                    {!editingPayment && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleClearStudent}
                        className="h-7 text-xs text-muted-foreground"
                      >
                        <X className="h-3 w-3 me-1" />
                        {t.common.edit}
                      </Button>
                    )}
                  </div>

                  <div className="rounded-lg border bg-gradient-to-br from-sky-50/50 to-white p-4">
                    <div className="flex items-start gap-4">
                      <div className="h-12 w-12 rounded-full bg-sky-600 text-white flex items-center justify-center shrink-0">
                        <User className="h-5 w-5" />
                      </div>
                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">
                            {t.common.name}:{' '}
                          </span>
                          <span className="font-bold">
                            {selectedStudent.fullName}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">
                            {t.common.phone}:{' '}
                          </span>
                          <span className="font-medium" dir="ltr">
                            {selectedStudent.phone || '—'}
                          </span>
                        </div>
                        {selectedStudent.parentName && (
                          <div>
                            <span className="text-muted-foreground">
                              {t.students.parentName}:{' '}
                            </span>
                            <span className="font-medium">
                              {selectedStudent.parentName}
                            </span>
                          </div>
                        )}
                        {selectedStudent.parentPhone && (
                          <div>
                            <span className="text-muted-foreground">
                              {t.students.parentPhone}:{' '}
                            </span>
                            <span
                              className="font-medium"
                              dir="ltr"
                            >
                              {selectedStudent.parentPhone}
                            </span>
                          </div>
                        )}
                        <div>
                          <span className="text-muted-foreground">
                            {t.students.monthlyFeeSection}:{' '}
                          </span>
                          <span className="font-bold text-sky-700">
                            {selectedStudent.monthlyFee.toLocaleString()}{' '}
                            {t.common.dh}
                          </span>
                        </div>
                        {selectedStudent.level && selectedStudent.level.subject && (
                          <div>
                            <span className="text-muted-foreground">
                              {t.students.level}:{' '}
                            </span>
                            <span className="font-medium">
                              {isAr ? selectedStudent.level.subject.nameAr : selectedStudent.level.subject.nameFr} -{' '}
                              {isAr ? selectedStudent.level.nameAr : selectedStudent.level.nameFr}
                            </span>
                          </div>
                        )}
                        {isAdmin && (
                        <div className="sm:col-span-2">
                          <span className="text-muted-foreground">
                            {t.common.dh} ({new Date().getFullYear()}):{' '}
                          </span>
                          <span className="font-bold text-blue-700">
                            {yearlyPaid.toLocaleString()} {t.common.dh}
                          </span>
                        </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <Separator />

              {/* ── Payment Details ────────────────────────────────────── */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-primary" />
                  {t.common.amount}
                </h4>
                <div className={`grid gap-3 ${isAdmin ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-2 sm:grid-cols-2'}`}>
                  {isAdmin && (
                  <>
                  <div className="space-y-1.5">
                    <Label htmlFor="amount">{t.payments.bonAmountDh} *</Label>
                    <Input
                      id="amount"
                      type="number"
                      min="0"
                      value={formData.amount}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          amount: Number(e.target.value) || '',
                        })
                      }
                      placeholder="0"
                      dir="ltr"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="discount">{t.payments.bonDiscount} ({t.common.dh})</Label>
                    <Input
                      id="discount"
                      type="number"
                      min="0"
                      value={formData.discount}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          discount: Number(e.target.value) || 0,
                        })
                      }
                      placeholder="0"
                      dir="ltr"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="paidAmount">{t.payments.bonPaid} ({t.common.dh})</Label>
                    <Input
                      id="paidAmount"
                      type="number"
                      min="0"
                      value={formData.paidAmount}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          paidAmount: Number(e.target.value) || '',
                        })
                      }
                      placeholder="0"
                      dir="ltr"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t.payments.remaining}</Label>
                    <div className="flex items-center h-9 px-3 rounded-md border bg-muted text-sm">
                      <span dir="ltr">
                        {Math.max(0, remainingAmount).toLocaleString()}
                      </span>
                      <span className="ms-1 text-muted-foreground text-xs">
                        {t.common.dh}
                      </span>
                    </div>
                  </div>
                  </>
                  )}
                  {!isAdmin && (
                  <>
                  <div className="space-y-1.5">
                    <Label htmlFor="amount">{t.payments.bonAmountDh} *</Label>
                    <Input
                      id="amount"
                      type="number"
                      min="0"
                      value={formData.amount}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          amount: Number(e.target.value) || '',
                        })
                      }
                      placeholder="0"
                      dir="ltr"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="paidAmount">{t.payments.bonPaid} ({t.common.dh})</Label>
                    <Input
                      id="paidAmount"
                      type="number"
                      min="0"
                      value={formData.paidAmount}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          paidAmount: Number(e.target.value) || '',
                        })
                      }
                      placeholder="0"
                      dir="ltr"
                    />
                  </div>
                  </>
                  )}
                </div>
                {isAdmin && discountValue > 0 && (
                  <div className="text-xs text-cyan-600 bg-cyan-50 rounded-md p-2">
                    {t.payments.bonAfterDiscount}:{' '}
                    <strong>{netAmount.toLocaleString()} {t.common.dh}</strong>
                  </div>
                )}
                {formData.packMonths > 1 && typeof formData.amount === 'number' && formData.amount > 0 && (
                  <div className="text-xs bg-sky-50 text-sky-700 rounded-md p-2">
                    {t.payments.packMonthlyEquiv}:{' '}
                    <strong>{Math.round(formData.amount / formData.packMonths).toLocaleString()} {t.common.dh} / {t.common.month}</strong>
                  </div>
                )}
              </div>

              {/* ── Promotions ──────────────────────────────────────────── */}
              {isAdmin && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <Tag className="h-4 w-4 text-primary" />
                    {t.payments.promoTitle}
                  </h4>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1 text-xs"
                    onClick={() => setPromoDialogOpen(true)}
                  >
                    <Plus className="h-3 w-3" />
                    {t.payments.promoAddNew}
                  </Button>
                </div>

                {promotions.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {/* "No promotion" option */}
                    <button
                      type="button"
                      onClick={() => handlePromotionSelect('')}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                        !formData.promotionId
                          ? 'border-muted-foreground bg-muted text-muted-foreground'
                          : 'border-transparent bg-gray-50 text-gray-400 hover:bg-gray-100'
                      }`}
                    >
                      <X className="h-3 w-3" />
                      {t.payments.promoNone}
                    </button>
                    {promotions.map((promo) => {
                      const IconComp = PROMO_ICONS[promo.icon] || Tag;
                      const isSelected = formData.promotionId === promo.id;
                      return (
                        <div key={promo.id} className="group relative">
                          <button
                            type="button"
                            onClick={() => handlePromotionSelect(promo.id)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                              isSelected
                                ? 'border-transparent shadow-sm ring-2 ring-offset-1 scale-105'
                                : 'border-transparent hover:scale-105'
                            }`}
                            style={{
                              backgroundColor: promo.color + '18',
                              color: promo.color,
                              ringColor: isSelected ? promo.color : 'transparent',
                              ...(isSelected ? { '--tw-ring-color': promo.color } as React.CSSProperties : {}),
                            }}
                          >
                            <IconComp className="h-3 w-3" />
                            {isAr ? promo.nameAr : promo.nameFr}
                            {promo.type === 'percentage' && promo.value > 0 && (
                              <span className="opacity-75">-{promo.value}%</span>
                            )}
                            {promo.type === 'fixed' && promo.value > 0 && (
                              <span className="opacity-75">-{promo.value}</span>
                            )}
                          </button>
                          {/* Delete button on hover */}
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handlePromoDelete(promo.id); }}
                            className="absolute -top-1.5 -end-1.5 h-4 w-4 rounded-full bg-destructive text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="h-2.5 w-2.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground bg-muted/50 rounded-md p-3 text-center">
                    {t.payments.promoEmpty}
                  </div>
                )}

                {/* Show selected promotion info */}
                {formData.promotionId && (
                  <div className="text-xs rounded-md p-2" style={{
                    backgroundColor: (promotions.find(p => p.id === formData.promotionId)?.color || '#6366f1') + '10',
                    color: promotions.find(p => p.id === formData.promotionId)?.color || '#6366f1',
                  }}>
                    {(() => {
                      const promo = promotions.find(p => p.id === formData.promotionId);
                      if (!promo) return null;
                      const promoLabel = isAr ? promo.nameAr : promo.nameFr;
                      if (promo.type === 'badge') return `🏷️ ${promoLabel}`;
                      if (promo.type === 'percentage') return `🏷️ ${promoLabel} — ${t.payments.promoDiscountLabel} ${promo.value}%${typeof formData.amount === 'number' && formData.amount > 0 ? ` = -${Math.round((formData.amount * promo.value) / 100 * 100) / 100} ${t.common.dh}` : ''}`;
                      if (promo.type === 'fixed') return `🏷️ ${promoLabel} — ${t.payments.promoDiscountLabel} ${promo.value} ${t.common.dh}`;
                      return null;
                    })()}
                  </div>
                )}
              </div>
              )}

              {/* ── Pack Type (Langues only) ───────────────────────────── */}
              {isLanguesService && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold flex items-center gap-2">
                      <Package className="h-4 w-4 text-sky-600" />
                      {t.payments.packType}
                    </Label>
                    {isAdmin && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 gap-1 text-xs"
                        onClick={() => setPackDialogOpen(true)}
                      >
                        <Plus className="h-3 w-3" />
                        {t.payments.packAddNew}
                      </Button>
                    )}
                  </div>
                  {PACK_OPTIONS.length > 1 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {PACK_OPTIONS.map((opt) => (
                        <div key={opt.value + '-' + opt.packDiscountId} className="group relative">
                          <button
                            type="button"
                            onClick={() => handlePackSelect(opt)}
                            className={`w-full px-3 py-2.5 rounded-lg border-2 text-sm font-medium transition-all ${
                              formData.packMonths === opt.value && formData.packDiscountId === opt.packDiscountId
                                ? 'border-sky-500 bg-sky-50 text-sky-700 shadow-sm'
                                : 'border-muted bg-card hover:border-sky-200 hover:bg-sky-50/50 text-foreground'
                            }`}
                          >
                            <div className="text-center">
                              <div className="text-sm font-semibold">{opt.label}</div>
                              {opt.discountPercent > 0 && typeof formData.amount === 'number' && formData.amount > 0 && (
                                <div className="text-[10px] text-sky-600 mt-0.5">
                                  {Math.round(formData.amount * (1 - opt.discountPercent / 100) / opt.value).toLocaleString()} {t.common.dh}/{t.common.month}
                                </div>
                              )}
                            </div>
                          </button>
                          {/* Delete button on hover (only for custom packs) */}
                          {opt.value > 1 && opt.packDiscountId && (
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); handlePackDiscountDelete(opt.packDiscountId); }}
                              className="absolute -top-1.5 -start-1.5 h-4 w-4 rounded-full bg-destructive text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="h-2.5 w-2.5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground bg-muted/50 rounded-md p-3 text-center">
                      {t.payments.packEmpty}
                    </div>
                  )}

                  {/* Pack discount info */}
                  {formData.packMonths > 1 && formData.packDiscountId && (
                    (() => {
                      const pd = packDiscounts.find(p => p.id === formData.packDiscountId);
                      const monthlyFee = selectedStudent?.monthlyFee || 0;
                      if (!pd || monthlyFee <= 0) return null;
                      const totalNormal = monthlyFee * pd.months;
                      const discount = totalNormal * pd.discountPercent / 100;
                      const totalAfterDiscount = totalNormal - discount;
                      const teacherMonthly = totalAfterDiscount / pd.months;
                      return (
                        <div className="bg-gradient-to-r from-sky-50 to-cyan-50 border border-sky-200 rounded-lg p-3 space-y-1.5 text-xs">
                          <div className="font-semibold text-sky-700 flex items-center gap-1.5">
                            <Package className="h-3.5 w-3.5" />
                            {t.payments.packDiscountApplied}
                          </div>
                          <div className="grid grid-cols-2 gap-1.5 text-sky-800">
                            <div>{t.payments.packPreviewNormal}:</div>
                            <div className="font-medium text-left" dir="ltr">{totalNormal.toLocaleString()} {t.common.dh}</div>
                            <div>{t.payments.packSaving}:</div>
                            <div className="font-medium text-left text-green-600" dir="ltr">-{discount.toLocaleString()} {t.common.dh}</div>
                            <div>{t.payments.packPreviewDiscount}:</div>
                            <div className="font-bold text-left text-sky-700" dir="ltr">{totalAfterDiscount.toLocaleString()} {t.common.dh}</div>
                            <div>{t.payments.packTeacherMonthly}:</div>
                            <div className="font-medium text-left" dir="ltr">{Math.round(teacherMonthly).toLocaleString()} {t.common.dh}/{t.common.month}</div>
                          </div>
                        </div>
                      );
                    })()
                  )}
                </div>
              )}

              {/* ── Month / Year / Date / Method ────────────────────────── */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="space-y-1.5">
                  <Label>{t.payments.month} *</Label>
                  <Select
                    value={formData.month}
                    onValueChange={(val) =>
                      setFormData({ ...formData, month: val })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={t.payments.chooseMonth} />
                    </SelectTrigger>
                    <SelectContent>
                      {MONTHS.map((m) => (
                        <SelectItem key={m.value} value={m.value}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>{t.payments.year} *</Label>
                  <Input
                    type="number"
                    min="2020"
                    max="2040"
                    value={formData.year}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        year: Number(e.target.value) || '',
                      })
                    }
                    dir="ltr"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>{t.payments.bonPaymentDate}</Label>
                  <Input
                    type="date"
                    value={formData.paymentDate}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        paymentDate: e.target.value,
                      })
                    }
                    dir="ltr"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>{t.payments.paymentMethod}</Label>
                  <Select
                    value={formData.method}
                    onValueChange={(val) =>
                      setFormData({ ...formData, method: val })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_METHODS.map((m) => (
                        <SelectItem key={m.value} value={m.value}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* ── Notes ──────────────────────────────────────────────── */}
              <div className="space-y-1.5">
                <Label htmlFor="notes">{t.common.notes}</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  placeholder={`${t.common.notes} (${t.common.optional})`}
                  rows={2}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="shrink-0 px-8 py-4 border-t">
            <div className="flex items-center justify-between w-full">
              <div className="text-xs text-muted-foreground">
                {t.common.status}:{' '}
                {autoStatus === 'paid'
                  ? t.payments.statusPaid
                  : autoStatus === 'partial'
                    ? t.payments.statusPartial
                    : t.payments.statusPending}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                  className="gap-2"
                >
                  {t.common.cancel}
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="gap-2 bg-blue-700 hover:bg-blue-800"
                >
                  {submitting ? (
                    <span className="animate-spin">⏳</span>
                  ) : (
                    <span>✓</span>
                  )}
                  {editingPayment ? t.common.saveChanges : t.payments.addPayment}
                </Button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════════════
          OVERDUE PAYMENTS DIALOG
          ═══════════════════════════════════════════════════════════════════ */}
      <Dialog open={overdueOpen} onOpenChange={setOverdueOpen}>
        <DialogContent className="sm:max-w-3xl p-0 gap-0 max-h-[90vh] flex flex-col">
          <DialogHeader className="shrink-0 px-8 pt-6 pb-2">
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-cyan-500" />
              {t.payments.overdue}
            </DialogTitle>
            <DialogDescription>
              {t.payments.overdueDesc}
            </DialogDescription>
          </DialogHeader>

          {overdueLoading ? (
            <div className="px-8 py-8">
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            </div>
          ) : overdueData.length === 0 ? (
            <div className="px-8 py-12 text-center text-muted-foreground">
              <AlertTriangle className="h-12 w-12 mx-auto mb-3 text-blue-400 opacity-50" />
              <p className="font-medium">{t.common.noData}</p>
              <p className="text-sm mt-1">{t.common.noData}</p>
            </div>
          ) : (
            <>
              {/* Grand total bar */}
              <div className="mx-8 mt-2 mb-3 p-3 rounded-lg bg-cyan-50 border border-cyan-200 flex items-center justify-between">
                <span className="text-sm font-semibold text-cyan-800">
                  {t.common.total}
                </span>
                <span className="text-lg font-bold text-cyan-700">
                  {grandTotalOverdue.toLocaleString()}{' '}
                  <span className="text-sm font-normal">{t.common.dh}</span>
                </span>
              </div>

              <div className="overflow-y-auto flex-1 min-h-0 px-8 pb-6 max-h-[65vh]">
                <div className="space-y-6">
                  {overdueData.map((service) => (
                    <div key={service.service}>
                      {/* Service header */}
                      <div className="flex items-center gap-2 mb-3">
                        <div className="h-1 w-4 rounded bg-cyan-400" />
                        <h3 className="font-bold text-base">
                          {service.service}
                        </h3>
                        <Badge
                          variant="outline"
                          className="text-xs border-cyan-300 text-cyan-700"
                        >
                          {service.studentCount} {t.students.studentCount} —{' '}
                          {service.totalOverdue.toLocaleString()} {t.common.dh}
                        </Badge>
                      </div>

                      {/* Levels */}
                      {service.levels.map((level) => (
                        <div
                          key={level.level}
                          className="mb-4 ms-4"
                        >
                          <h4 className="text-sm font-semibold text-muted-foreground mb-2">
                            {level.level}
                          </h4>
                          <div className="space-y-2">
                            {level.students.map((student) => (
                              <div
                                key={student.studentId}
                                className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent/30 transition-colors"
                              >
                                <div className="h-9 w-9 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                                  <AlertTriangle className="h-4 w-4" />
                                </div>
                                <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-3 gap-1 text-sm">
                                  <div>
                                    <span className="font-semibold">
                                      {student.studentName}
                                    </span>
                                    {student.parentName && (
                                      <span className="text-xs text-muted-foreground block">
                                        {t.students.guardian}{student.parentName}
                                      </span>
                                    )}
                                    {student.subjectName && (
                                      <span className="text-[11px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded inline-block mt-0.5">
                                        {student.subjectName}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                                    {student.phone && (
                                      <span
                                        className="flex items-center gap-1"
                                        dir="ltr"
                                      >
                                        <Phone className="h-3 w-3" />
                                        {student.phone}
                                      </span>
                                    )}
                                    {student.parentPhone && (
                                      <span
                                        className="flex items-center gap-1"
                                        dir="ltr"
                                      >
                                        <UserCheck className="h-3 w-3" />
                                        {student.parentPhone}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-bold text-red-600">
                                      {student.totalOverdue.toLocaleString()}{' '}
                                      {t.common.dh}
                                    </span>
                                    <Badge
                                      variant="outline"
                                      className="text-[10px] border-red-200 text-red-600"
                                    >
                                      {student.monthsOverdue} {t.payments.month}
                                    </Badge>
                                    {student.nextDueDate && (
                                      <span className="flex items-center gap-1 text-[11px] font-semibold text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded border border-cyan-200" dir="ltr">
                                        <CalendarClock className="h-3 w-3 text-cyan-500" />
                                        {student.nextDueDate}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <Button
                                  size="sm"
                                  className="gap-1.5 bg-red-500 hover:bg-red-600 text-white shrink-0"
                                  onClick={() => handleCreateInvoiceForOverdue(student)}
                                  disabled={creatingInvoice === student.studentId}
                                >
                                  {creatingInvoice === student.studentId ? (
                                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                  ) : (
                                    <Plus className="w-3.5 h-3.5" />
                                  )}
                                  {t.payments.addInvoiceQuick}
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════════════
          DELETE CONFIRMATION
          ═══════════════════════════════════════════════════════════════════ */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.common.deleteConfirm}</AlertDialogTitle>
            <AlertDialogDescription>
              {t.common.deleteConfirmMsg} {t.common.cannotUndo}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t.common.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Create Promotion Dialog ──────────────────────────────────── */}
      <Dialog open={promoDialogOpen} onOpenChange={setPromoDialogOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col p-0 gap-0">
          <DialogHeader className="shrink-0 px-6 pt-5 pb-2">
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              {t.payments.promoCreateTitle}
            </DialogTitle>
            <DialogDescription>{t.payments.promoCreateDesc}</DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto min-h-0 px-6 py-3 space-y-4">
            {/* Name */}
            <div className="space-y-1.5">
              <Label>{t.payments.promoNameLabel} *</Label>
              <Input
                value={promoForm.nameAr}
                onChange={(e) => setPromoForm({ ...promoForm, nameAr: e.target.value, name: e.target.value, nameFr: e.target.value })}
                placeholder={t.payments.promoNamePlaceholder}
              />
            </div>

            {/* Type selector */}
            <div className="space-y-1.5">
              <Label>{t.payments.promoTypeLabel}</Label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'badge', label: t.payments.promoTypeBadge, icon: Tag, desc: t.payments.promoTypeBadgeDesc },
                  { value: 'percentage', label: t.payments.promoTypePercentage, icon: Percent, desc: t.payments.promoTypePercentDesc },
                  { value: 'fixed', label: t.payments.promoTypeFixed, icon: Gift, desc: t.payments.promoTypeFixedDesc },
                ].map((opt) => {
                  const OptIcon = opt.icon;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setPromoForm({ ...promoForm, type: opt.value as 'badge' | 'percentage' | 'fixed' })}
                      className={`flex flex-col items-center gap-1 p-3 rounded-lg border-2 text-xs transition-colors ${
                        promoForm.type === opt.value
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-muted bg-card hover:border-primary/30'
                      }`}
                    >
                      <OptIcon className="h-4 w-4" />
                      <span className="font-medium">{opt.label}</span>
                      <span className="text-[10px] opacity-60">{opt.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Value (for percentage/fixed) */}
            {promoForm.type !== 'badge' && (
              <div className="space-y-1.5">
                <Label>
                  {promoForm.type === 'percentage' ? t.payments.promoPercentValue : t.payments.promoFixedValue}
                </Label>
                <div className="relative">
                  <Input
                    type="number"
                    min="0"
                    max={promoForm.type === 'percentage' ? 100 : 99999}
                    value={promoForm.value || ''}
                    onChange={(e) => setPromoForm({ ...promoForm, value: Number(e.target.value) || 0 })}
                    dir="ltr"
                    className="text-left"
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    {promoForm.type === 'percentage' ? '%' : t.common.dh}
                  </span>
                </div>
              </div>
            )}

            {/* Color picker */}
            <div className="space-y-1.5">
              <Label>{t.payments.promoColorLabel}</Label>
              <div className="flex flex-wrap gap-2">
                {PROMO_COLOR_OPTIONS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setPromoForm({ ...promoForm, color })}
                    className={`w-7 h-7 rounded-full border-2 transition-transform ${
                      promoForm.color === color ? 'border-foreground scale-110' : 'border-transparent hover:scale-110'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            {/* Icon picker */}
            <div className="space-y-1.5">
              <Label>{t.payments.promoIconLabel}</Label>
              <div className="flex flex-wrap gap-2">
                {PROMO_ICON_OPTIONS.map((iconName) => {
                  const IconComp = PROMO_ICONS[iconName] || Tag;
                  return (
                    <button
                      key={iconName}
                      type="button"
                      onClick={() => setPromoForm({ ...promoForm, icon: iconName })}
                      className={`w-9 h-9 rounded-lg border-2 flex items-center justify-center transition-colors ${
                        promoForm.icon === iconName
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-muted bg-card hover:border-primary/30 text-muted-foreground'
                      }`}
                    >
                      <IconComp className="h-4 w-4" />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Preview */}
            <div className="space-y-1.5">
              <Label className="text-muted-foreground">{t.payments.promoPreview}</Label>
              <div className="flex items-center gap-2 p-3 rounded-lg border bg-muted/30">
                {(() => {
                  const PreviewIcon = PROMO_ICONS[promoForm.icon] || Tag;
                  return (
                    <Badge
                      className="text-xs px-2.5 py-1"
                      style={{
                        backgroundColor: promoForm.color + '20',
                        color: promoForm.color,
                        borderColor: promoForm.color + '40',
                      }}
                    >
                      <PreviewIcon className="h-3 w-3 inline me-1" />
                      {promoForm.nameAr || '...'}
                      {promoForm.type === 'percentage' && promoForm.value > 0 && ` -${promoForm.value}%`}
                      {promoForm.type === 'fixed' && promoForm.value > 0 && ` -${promoForm.value}`}
                    </Badge>
                  );
                })()}
              </div>
            </div>
          </div>

          <DialogFooter className="shrink-0 px-6 py-3 border-t">
            <Button variant="outline" onClick={() => setPromoDialogOpen(false)}>
              {t.common.cancel}
            </Button>
            <Button onClick={handlePromoCreate} disabled={!promoForm.nameAr.trim()}>
              <Plus className="h-4 w-4 me-1" />
              {t.common.add}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Create Pack Discount Dialog ─────────────────────────────── */}
      <Dialog open={packDialogOpen} onOpenChange={setPackDialogOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col p-0 gap-0">
          <DialogHeader className="shrink-0 px-6 pt-5 pb-2">
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-sky-600" />
              {t.payments.packManageTitle}
            </DialogTitle>
            <DialogDescription>{t.payments.packManageDesc}</DialogDescription>
          </DialogHeader>

          <div className="overflow-y-auto flex-1 min-h-0 px-6 py-3">
            <div className="grid gap-4">
              {/* Existing packs list */}
              {packDiscounts.length > 0 && (
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">{t.payments.currentPacks}</Label>
                  <div className="space-y-1">
                    {packDiscounts.map((pd) => (
                      <div key={pd.id} className="flex items-center justify-between px-3 py-2 rounded-lg border bg-muted/30 text-sm">
                        <div>
                          <span className="font-medium">{isAr ? pd.nameAr : pd.nameFr}</span>
                          <span className="text-muted-foreground ms-2">— {pd.months} {t.payments.packMonthsUnit}</span>
                          {pd.discountPercent > 0 && (
                            <span className="text-green-600 font-medium">-{pd.discountPercent}%</span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => handlePackDiscountDelete(pd.id)}
                          className="h-6 w-6 rounded-full bg-destructive/10 text-destructive hover:bg-destructive hover:text-white flex items-center justify-center transition-colors"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Separator />

              {/* New pack form */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold">{t.payments.packAddNew}</Label>
                <div className="space-y-1.5">
                  <Label className="text-xs">{t.payments.packNameLabel} *</Label>
                  <Input
                    placeholder={t.payments.packNamePlaceholder}
                    value={packForm.nameAr}
                    onChange={(e) => setPackForm({ ...packForm, name: e.target.value, nameAr: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">{t.payments.packMonthsLabel}</Label>
                    <Input
                      type="number"
                      min={2}
                      max={24}
                      value={packForm.months}
                      onChange={(e) => setPackForm({ ...packForm, months: Math.max(2, Number(e.target.value) || 2) })}
                      dir="ltr"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">{t.payments.packDiscountLabel}</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={packForm.discountPercent}
                      onChange={(e) => setPackForm({ ...packForm, discountPercent: Math.min(100, Math.max(0, Number(e.target.value) || 0)) })}
                      dir="ltr"
                    />
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground">{t.payments.packDiscountHint}</p>

                {/* Preview */}
                {packForm.nameAr && packForm.months >= 2 && (
                  <div className="bg-sky-50 border border-sky-200 rounded-lg p-3 text-xs space-y-1">
                    <div className="font-semibold text-sky-700">{t.payments.packPreview}:</div>
                    <div className="text-sky-800">
                      {t.payments.pack1} = {selectedStudent?.monthlyFee || 300} × {packForm.months} = <strong>{((selectedStudent?.monthlyFee || 300) * packForm.months).toLocaleString()} {t.common.dh}</strong>
                    </div>
                    {packForm.discountPercent > 0 && (
                      <>
                        <div className="text-green-600">
                          {t.payments.packSaving} = -{((selectedStudent?.monthlyFee || 300) * packForm.months * packForm.discountPercent / 100).toLocaleString()} {t.common.dh}
                        </div>
                        <div className="text-sky-700 font-semibold">
                          {t.payments.packPreviewDiscount} = {((selectedStudent?.monthlyFee || 300) * packForm.months * (100 - packForm.discountPercent) / 100).toLocaleString()} {t.common.dh}
                          <span className="font-normal ms-1">
                            ({Math.round((selectedStudent?.monthlyFee || 300) * (100 - packForm.discountPercent) / 100).toLocaleString()} {t.common.dh}/{t.common.month})
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="shrink-0 px-6 py-3 border-t">
            <Button variant="outline" onClick={() => setPackDialogOpen(false)}>
              {t.common.cancel}
            </Button>
            <Button
              onClick={handlePackDiscountCreate}
              disabled={!packForm.nameAr.trim() || packForm.months < 2}
              className="bg-sky-600 hover:bg-sky-700"
            >
              <Plus className="h-4 w-4 me-1" />
              {t.common.add}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
