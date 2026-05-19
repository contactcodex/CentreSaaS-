'use client';

import { useAppStore, centreFetch, isExpired } from '@/store/store';
import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { useT } from '@/hooks/use-translation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Users,
  Phone,
  UserCheck,
  GraduationCap,
  Wallet,
  Loader2,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Layers,
  UserMinus,
  Sparkles,
  CircleCheck,
  CircleAlert,
  Check,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────

interface Enrollment {
  id: string;
  levelId: string;
  level: {
    id: string;
    name: string;
    nameAr: string;
    subject: { id: string; name: string; nameAr: string; service?: { id: string; nameAr: string } };
  };
  teacherId: string | null;
  teacher: { id: string; fullName: string } | null;
  monthlyFee?: number;
}

interface Student {
  id: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  levelId: string | null;
  level: {
    id: string;
    name: string;
    nameAr: string;
    subject: { name: string; nameAr: string; service?: { id: string; nameAr: string } };
  } | null;
  teacherId: string | null;
  teacher: { id: string; fullName: string } | null;
  parentName: string | null;
  parentPhone: string | null;
  monthlyFee: number;
  packMonths?: number;
  status: string;
  enrollmentDate: string;
  isPackPaid?: boolean;
  nextDueDate?: string | null;
  enrollments?: Enrollment[];
}

interface Service {
  id: string;
  name: string;
  nameAr: string;
  nameFr: string;
  description: string | null;
  icon: string | null;
  order: number;
  subjects: Subject[];
}

interface Subject {
  id: string;
  name: string;
  nameAr: string;
  nameFr?: string;
  levels: Level[];
  order: number;
}

interface Level {
  id: string;
  name: string;
  nameAr: string;
  nameFr?: string;
}

interface Teacher {
  id: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  status: string;
  subjects: {
    id: string;
    teacherId: string;
    subjectId: string;
    subject: { id: string; name: string; nameAr: string };
  }[];
}

interface FormState {
  fullName: string;
  phone: string;
  parentName: string;
  parentPhone: string;
  monthlyFee: string;
  packMonths: number;
  enrollmentDate: string;
}

type WizardStep = 1 | 2 | 3 | 4 | 5;

const initialForm: FormState = {
  fullName: '',
  phone: '',
  parentName: '',
  parentPhone: '',
  monthlyFee: '',
  packMonths: 1,
  enrollmentDate: new Date().toISOString().split('T')[0],
};

// ── Service icons map ──────────────────────────────────────────────────────

const serviceIcons: Record<string, React.ElementType> = {
  'Cours de Soutiens': GraduationCap,
  'Langues': BookOpen,
  'Informatique': Sparkles,
  'Préparation Concours': Layers,
};

// ── Color helpers ──────────────────────────────────────────────────────────

function getAvatarColor(name: string): string {
  const colors = [
    'bg-sky-100 text-sky-700',
    'bg-cyan-100 text-cyan-700',
    'bg-rose-100 text-rose-700',
    'bg-violet-100 text-violet-700',
    'bg-blue-100 text-blue-800',
    'bg-cyan-100 text-cyan-700',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

// ── Component ──────────────────────────────────────────────────────────────

export function StudentsView() {
  const t = useT();
  const { userRole } = useAppStore();
  const isAdmin = userRole === 'ADMIN';

  // ── Data state ──────────────────────────────────────────────────────────
  const [students, setStudents] = useState<Student[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // ── Table filter state (service → subject → level) ────────────────
  const [filterServiceId, setFilterServiceId] = useState('');
  const [filterSubjectId, setFilterSubjectId] = useState('');
  const [filterLevelId, setFilterLevelId] = useState('');

  // ── Wizard state ────────────────────────────────────────────────────────
  const [dialogOpen, setDialogOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState<WizardStep>(1);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedSubjects, setSelectedSubjects] = useState<Subject[]>([]);
  const [enrollmentLevels, setEnrollmentLevels] = useState<Record<string, Level>>({});
  const [enrollmentTeachers, setEnrollmentTeachers] = useState<Record<string, Teacher | null>>({});
  const [noTeacherFor, setNoTeacherFor] = useState<Record<string, boolean>>({});
  // Backward compat single-select fields (used in edit mode fallback)
  const [selectedLevel, setSelectedLevel] = useState<Level | null>(null);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [noTeacher, setNoTeacher] = useState(false);
  const [enrollmentFees, setEnrollmentFees] = useState<Record<string, string>>({});
  const [form, setForm] = useState<FormState>(initialForm);
  const [submitting, setSubmitting] = useState(false);

  // ── Ref for fullName input (auto-focus only once on step 5) ─────────────
  const fullNameInputRef = useRef<HTMLInputElement>(null);
  const prevStepRef = useRef<WizardStep>(1);

  useEffect(() => {
    if (wizardStep === 5 && prevStepRef.current !== 5) {
      // Only focus when transitioning TO step 5, not on re-renders
      setTimeout(() => fullNameInputRef.current?.focus(), 100);
    }
    prevStepRef.current = wizardStep;
  }, [wizardStep]);

  // ── Delete state ────────────────────────────────────────────────────────
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // ── Computed: student count per teacher ─────────────────────────────────
  const studentCountsMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const s of students) {
      if (s.enrollments && s.enrollments.length > 0) {
        for (const e of s.enrollments) {
          if (e.teacherId) {
            map[e.teacherId] = (map[e.teacherId] || 0) + 1;
          }
        }
      } else if (s.teacherId) {
        map[s.teacherId] = (map[s.teacherId] || 0) + 1;
      }
    }
    return map;
  }, [students]);

  // ── Computed: filter subjects dropdown based on selected service ───
  const filterSubjects = useMemo(() => {
    if (!filterServiceId) return [];
    const svc = services.find((s) => s.id === filterServiceId);
    return svc?.subjects || [];
  }, [filterServiceId, services]);

  // ── Computed: filter levels dropdown based on selected subject ──────
  const filterLevels = useMemo(() => {
    if (!filterSubjectId) return [];
    const svc = services.find((s) => s.id === filterServiceId);
    const subj = svc?.subjects.find((sub) => sub.id === filterSubjectId);
    return subj?.levels || [];
  }, [filterServiceId, filterSubjectId, services]);

  // ── Computed: displayed students after all filters ──────────────────
  const displayedStudents = useMemo(() => {
    return students.filter((s) => {
      if (filterServiceId) {
        const hasMatch = (s.enrollments?.length > 0)
          ? s.enrollments.some(e => e.level?.subject?.service?.id === filterServiceId)
          : s.level?.subject?.service?.id === filterServiceId;
        if (!hasMatch) return false;
      }
      if (filterSubjectId) {
        const hasMatch = (s.enrollments?.length > 0)
          ? s.enrollments.some(e => e.level?.subject?.id === filterSubjectId)
          : s.level?.subject?.id === filterSubjectId;
        if (!hasMatch) return false;
      }
      if (filterLevelId) {
        const hasMatch = (s.enrollments?.length > 0)
          ? s.enrollments.some(e => e.levelId === filterLevelId)
          : s.levelId === filterLevelId;
        if (!hasMatch) return false;
      }
      return true;
    });
  }, [students, filterServiceId, filterSubjectId, filterLevelId]);

  // Reset child filters when parent changes
  const handleFilterServiceChange = (v: string) => {
    setFilterServiceId(v);
    setFilterSubjectId('');
    setFilterLevelId('');
  };
  const handleFilterSubjectChange = (v: string) => {
    setFilterSubjectId(v);
    setFilterLevelId('');
  };

  // ── Computed: filtered subjects for step 2 ─────────────────────────────
  const filteredSubjects = useMemo(() => {
    if (!selectedService) return [];
    return selectedService.subjects || [];
  }, [selectedService]);

  // ── Computed: get deduplicated levels for a subject ─────────────────
  const getLevelsForSubject = useCallback((subject: Subject): Level[] => {
    const levels = subject.levels || [];
    const seen = new Map<string, Level>();
    for (const lvl of levels) {
      if (!seen.has(lvl.name)) {
        seen.set(lvl.name, lvl);
      }
    }
    return Array.from(seen.values());
  }, []);

  // ── Computed: get filtered teachers for a subject ───────────────────
  const getFilteredTeachers = useCallback((subjectId: string): Teacher[] => {
    return teachers.filter(
      (teacher) =>
        teacher.status === 'active' &&
        teacher.subjects.some((ts) => ts.subjectId === subjectId)
    );
  }, [teachers]);

  // ── Computed: check if "Next" button should be disabled ─────────────
  const isNextDisabled = useCallback((): boolean => {
    if (wizardStep === 2) {
      return selectedSubjects.length === 0;
    }
    if (wizardStep === 3) {
      return selectedSubjects.some((sub) => !enrollmentLevels[sub.id]);
    }
    if (wizardStep === 4) {
      return selectedSubjects.some((sub) => {
        const hasTeacher = enrollmentTeachers[sub.id] !== undefined && enrollmentTeachers[sub.id] !== null;
        const isSkipped = noTeacherFor[sub.id] === true;
        return !hasTeacher && !isSkipped;
      });
    }
    return false;
  }, [wizardStep, selectedSubjects, enrollmentLevels, enrollmentTeachers, noTeacherFor]);

  // ── Data fetching ──────────────────────────────────────────────────────

  const fetchStudents = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      const res = await centreFetch(`/api/students?${params.toString()}`);
      if (!res.ok) throw new Error();
      const json = await res.json();
      setStudents(json);
    } catch { if (!isExpired()) toast.error(t.common.fetchError); } finally {
      setLoading(false);
    }
  }, [search, statusFilter, t.common.fetchError]);

  const fetchServices = useCallback(async () => {
    try {
      const res = await centreFetch('/api/services');
      if (!res.ok) throw new Error();
      const json = await res.json();
      setServices(json);
    } catch { if (!isExpired()) toast.error(t.common.fetchError); }
  }, [t.common.fetchError]);

  const fetchTeachers = useCallback(async () => {
    try {
      const res = await centreFetch('/api/teachers');
      if (!res.ok) throw new Error();
      const json = await res.json();
      setTeachers(json);
    } catch { if (!isExpired()) toast.error(t.common.fetchError); }
  }, [t.common.fetchError]);

  useEffect(() => {
    setLoading(true);
    fetchStudents();
  }, [fetchStudents]);

  useEffect(() => {
    fetchServices();
    fetchTeachers();
  }, [fetchServices, fetchTeachers]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(true);
      fetchStudents();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // ── Wizard navigation ──────────────────────────────────────────────────

  const resetWizard = useCallback(() => {
    setWizardStep(1);
    setSelectedService(null);
    setSelectedSubjects([]);
    setEnrollmentLevels({});
    setEnrollmentTeachers({});
    setNoTeacherFor({});
    setSelectedLevel(null);
    setSelectedTeacher(null);
    setNoTeacher(false);
    setEnrollmentFees({});
    setForm({ ...initialForm });
    setEditingStudent(null);
  }, []);

  const handleOpenDialog = (student?: Student) => {
    if (student) {
      // Edit mode: pre-fill everything and open to step 5
      setEditingStudent(student);
      setForm({
        fullName: student.fullName,
        phone: student.phone || '',
        parentName: student.parentName || '',
        parentPhone: student.parentPhone || '',
        monthlyFee: student.monthlyFee ? String(student.monthlyFee) : '',
        packMonths: student.packMonths || 1,
        enrollmentDate: student.enrollmentDate
          ? new Date(student.enrollmentDate).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0],
      });

      // Check if student has enrollments (multi-subject)
      if (student.enrollments && student.enrollments.length > 0) {
        const enrollments = student.enrollments;

        // Build unique subjects map from enrollments
        const subjectsMap = new Map<string, Subject>();
        const levelsMap: Record<string, Level> = {};
        const teachersMap: Record<string, Teacher | null> = {};
        const noTeacherMap: Record<string, boolean> = {};
        let svcId: string | undefined;

        for (const e of enrollments) {
          if (e.level?.subject) {
            svcId = e.level.subject.service?.id;
            if (!subjectsMap.has(e.level.subject.id)) {
              // Find the full subject from services data
              const svc = services.find((s) => s.id === svcId);
              const fullSubject = svc?.subjects.find((sub) => sub.id === e.level.subject.id);
              subjectsMap.set(e.level.subject.id, {
                id: e.level.subject.id,
                name: e.level.subject.name,
                nameAr: e.level.subject.nameAr,
                nameFr: '',
                levels: fullSubject?.levels || [],
                order: 0,
              });
            }
            levelsMap[e.level.subject.id] = {
              id: e.level.id,
              name: e.level.name,
              nameAr: e.level.nameAr,
              nameFr: '',
            };

            if (e.teacherId && e.teacher) {
              teachersMap[e.level.subject.id] = {
                id: e.teacher.id,
                fullName: e.teacher.fullName,
                phone: null,
                email: null,
                status: 'active',
                subjects: [],
              };
              noTeacherMap[e.level.subject.id] = false;
            } else {
              teachersMap[e.level.subject.id] = null;
              noTeacherMap[e.level.subject.id] = true;
            }
          }
        }

        const svc = services.find((s) => s.id === svcId);
        setSelectedService(svc || null);
        setSelectedSubjects(Array.from(subjectsMap.values()));
        setEnrollmentLevels(levelsMap);
        setEnrollmentTeachers(teachersMap);
        setNoTeacherFor(noTeacherMap);
        // Load per-enrollment fees
        const feesMap: Record<string, string> = {};
        for (const e of enrollments) {
          if (e.level?.subject) {
            feesMap[e.level.subject.id] = e.monthlyFee ? String(e.monthlyFee) : '';
          }
        }
        setEnrollmentFees(feesMap);

        // Backward compat
        const firstEnrollment = enrollments[0];
        if (firstEnrollment?.level) {
          setSelectedLevel({
            id: firstEnrollment.level.id,
            name: firstEnrollment.level.name,
            nameAr: firstEnrollment.level.nameAr,
            nameFr: '',
          });
        }
        if (firstEnrollment?.teacherId && firstEnrollment.teacher) {
          setSelectedTeacher({
            id: firstEnrollment.teacher.id,
            fullName: firstEnrollment.teacher.fullName,
            phone: null,
            email: null,
            status: 'active',
            subjects: [],
          });
          setNoTeacher(false);
        } else if (enrollments.some(e => e.teacherId)) {
          setSelectedTeacher(null);
          setNoTeacher(false);
        } else {
          setSelectedTeacher(null);
          setNoTeacher(true);
        }
      } else {
        // Fallback: use old single-subject fields
        if (student.level?.subject) {
          const svc = services.find(
            (s) => s.id === student.level?.subject?.service?.id
          );
          setSelectedService(svc || null);
          const fullSubject = svc?.subjects.find(
            (sub) => sub.id === student.level?.subject?.id
          );
          const subj = {
            id: student.level.subject.id,
            name: student.level.subject.name,
            nameAr: student.level.subject.nameAr,
            nameFr: '',
            levels: fullSubject?.levels || [],
            order: 0,
          };
          setSelectedSubjects([subj]);
          setSelectedSubject_global(subj);
          setSelectedLevel({
            id: student.level.id,
            name: student.level.name,
            nameAr: student.level.nameAr,
            nameFr: '',
          });
          setEnrollmentLevels({ [student.level.subject.id]: { id: student.level.id, name: student.level.name, nameAr: student.level.nameAr, nameFr: '' } });
        } else {
          setSelectedService(null);
          setSelectedSubjects([]);
          setSelectedLevel(null);
          setEnrollmentLevels({});
        }
        if (student.teacherId && student.teacher) {
          const subId = student.level?.subject?.id;
          setSelectedTeacher({
            id: student.teacher.id,
            fullName: student.teacher.fullName,
            phone: null,
            email: null,
            status: 'active',
            subjects: [],
          });
          setNoTeacher(false);
          if (subId) {
            setEnrollmentTeachers({ [subId]: { id: student.teacher.id, fullName: student.teacher.fullName, phone: null, email: null, status: 'active', subjects: [] } });
            setNoTeacherFor({ [subId]: false });
          }
        } else {
          setSelectedTeacher(null);
          setNoTeacher(!student.teacherId);
          const subId = student.level?.subject?.id;
          if (subId) {
            setEnrollmentTeachers({ [subId]: null });
            setNoTeacherFor({ [subId]: true });
          }
        }
      }
      setWizardStep(5);
    } else {
      // Add mode: start from step 1
      resetWizard();
    }
    setDialogOpen(true);
  };

  // Helper for backward compat to set a single subject
  const setSelectedSubject_global = (subject: Subject | null) => {
    if (subject) {
      setSelectedSubjects([subject]);
    } else {
      setSelectedSubjects([]);
    }
  };

  const handleSelectService = (service: Service) => {
    setSelectedService(service);
    setSelectedSubjects([]);
    setEnrollmentLevels({});
    setEnrollmentTeachers({});
    setNoTeacherFor({});
    setSelectedLevel(null);
    setSelectedTeacher(null);
    setNoTeacher(false);
    setWizardStep(2);
  };

  const handleToggleSubject = (subject: Subject) => {
    setSelectedSubjects((prev) => {
      const exists = prev.some((s) => s.id === subject.id);
      if (exists) {
        // Remove subject and its related level/teacher data
        const newSubjects = prev.filter((s) => s.id !== subject.id);
        setEnrollmentLevels((prevLevels) => {
          const { [subject.id]: _, ...rest } = prevLevels;
          return rest;
        });
        setEnrollmentTeachers((prevTeachers) => {
          const { [subject.id]: __, ...rest } = prevTeachers;
          return rest;
        });
        setNoTeacherFor((prevNo) => {
          const { [subject.id]: ___, ...rest } = prevNo;
          return rest;
        });
        return newSubjects;
      } else {
        return [...prev, subject];
      }
    });
  };

  const handleSelectLevelForSubject = (subjectId: string, level: Level) => {
    setEnrollmentLevels((prev) => ({ ...prev, [subjectId]: level }));
  };

  const handleSelectTeacherForSubject = (subjectId: string, teacher: Teacher | null) => {
    setEnrollmentTeachers((prev) => ({ ...prev, [subjectId]: teacher }));
    if (teacher === null) {
      setNoTeacherFor((prev) => ({ ...prev, [subjectId]: true }));
    } else {
      setNoTeacherFor((prev) => ({ ...prev, [subjectId]: false }));
    }
  };

  const handleSkipAllTeachers = () => {
    const newNoTeacherFor: Record<string, boolean> = {};
    const newEnrollmentTeachers: Record<string, Teacher | null> = {};
    for (const sub of selectedSubjects) {
      newNoTeacherFor[sub.id] = true;
      newEnrollmentTeachers[sub.id] = null;
    }
    setNoTeacherFor(newNoTeacherFor);
    setEnrollmentTeachers(newEnrollmentTeachers);
  };

  const handleNextStep = () => {
    if (wizardStep < 5) {
      setWizardStep((wizardStep + 1) as WizardStep);
    }
  };

  const goToStep = (step: WizardStep) => {
    if (step < wizardStep) {
      setWizardStep(step);
    }
  };

  // ── Submit ─────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!form.fullName.trim()) {
      toast.error(t.students.nameRequired);
      return;
    }
    if (selectedSubjects.length === 0) {
      toast.error(t.students.selectLevel);
      return;
    }
    const allHaveLevels = selectedSubjects.every((sub) => enrollmentLevels[sub.id]);
    if (!allHaveLevels) {
      toast.error(t.students.selectLevel);
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        fullName: form.fullName.trim(),
        phone: form.phone || null,
        parentName: form.parentName || null,
        parentPhone: form.parentPhone || null,
        packMonths: form.packMonths || 1,
        enrollments: selectedSubjects.map((sub) => ({
          levelId: enrollmentLevels[sub.id].id,
          teacherId: noTeacherFor[sub.id] ? null : (enrollmentTeachers[sub.id]?.id || null),
          monthlyFee: parseFloat(enrollmentFees[sub.id]) || 0,
        })),
        status: editingStudent?.status || 'active',
        enrollmentDate: form.enrollmentDate || new Date().toISOString(),
      };

      const url = editingStudent ? `/api/students/${editingStudent.id}` : '/api/students';
      const method = editingStudent ? 'PUT' : 'POST';
      const res = await centreFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error();

      toast.success(editingStudent ? t.common.updateSuccess : t.common.addSuccess);
      setDialogOpen(false);
      resetWizard();
      fetchStudents();
    } catch { if (!isExpired()) toast.error(t.common.saveError); } finally {
      setSubmitting(false);
    }
  };

  // ── Delete ─────────────────────────────────────────────────────────────

  const handleDelete = async (id: string) => {
    try {
      const res = await centreFetch(`/api/students/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      toast.success(t.common.deleteSuccess);
      fetchStudents();
    } catch { if (!isExpired()) toast.error(t.common.deleteError); } finally {
      setDeletingId(null);
    }
  };

  // ── Toggle status ─────────────────────────────────────────────────────

  const handleToggleStatus = async (student: Student) => {
    const newStatus = student.status === 'active' ? 'inactive' : 'active';
    try {
      // Preserve ALL enrollments to avoid deleting them during status toggle
      const enrollments = (student.enrollments && student.enrollments.length > 0)
        ? student.enrollments.map((e) => ({
            levelId: e.levelId,
            teacherId: e.teacherId,
            monthlyFee: e.monthlyFee || 0,
          }))
        : [];

      // Get levelId and teacherId from first enrollment or existing values for backward compat
      let levelId = student.levelId;
      let teacherId = student.teacherId;
      if (enrollments.length > 0) {
        levelId = enrollments[0].levelId;
        teacherId = enrollments[0].teacherId;
      }

      const res = await centreFetch(`/api/students/${student.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: student.fullName,
          phone: student.phone,
          email: student.email,
          address: student.address,
          levelId,
          teacherId,
          parentName: student.parentName,
          parentPhone: student.parentPhone,
          monthlyFee: student.monthlyFee,
          status: newStatus,
          enrollmentDate: student.enrollmentDate,
          enrollments,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success(newStatus === 'active' ? t.students.toggleActive : t.students.toggleInactive);
      fetchStudents();
    } catch { if (!isExpired()) toast.error(t.students.toggleError); }
  };

  // ── Step indicator config ─────────────────────────────────────────────

  const steps = [
    { num: 1 as WizardStep, icon: Layers, label: t.students.step1Title },
    { num: 2 as WizardStep, icon: BookOpen, label: t.students.step2Title },
    { num: 3 as WizardStep, icon: GraduationCap, label: t.students.step3Title },
    { num: 4 as WizardStep, icon: UserCheck, label: t.students.step4Title },
    { num: 5 as WizardStep, icon: Users, label: t.students.step5Title },
  ];

  // ── Render helpers ────────────────────────────────────────────────────

  function getStatusBadge(status: string) {
    if (status === 'active') {
      return (
        <Badge className="bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100">
          {t.common.active}
        </Badge>
      );
    }
    return (
      <Badge className="bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-100">
        {t.common.inactive}
      </Badge>
    );
  }

  function StepIndicator() {
    return (
      <div className="px-8 pt-4 pb-2">
        <div className="flex items-center justify-between">
          {steps.map((step, idx) => {
            const isCompleted = step.num < wizardStep;
            const isCurrent = step.num === wizardStep;
            const Icon = step.icon;
            return (
              <div key={step.num} className="flex items-center flex-1">
                <button
                  type="button"
                  onClick={() => isCompleted && goToStep(step.num)}
                  disabled={!isCompleted}
                  className={`flex flex-col items-center gap-1 transition-all ${
                    isCompleted
                      ? 'cursor-pointer hover:opacity-80'
                      : 'cursor-default'
                  }`}
                >
                  <div
                    className={`h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      isCurrent
                        ? 'bg-sky-600 text-white shadow-md shadow-sky-200'
                        : isCompleted
                          ? 'bg-sky-100 text-sky-700'
                          : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <span
                    className={`text-[10px] hidden sm:block ${
                      isCurrent
                        ? 'text-sky-700 font-semibold'
                        : isCompleted
                          ? 'text-sky-600'
                          : 'text-gray-400'
                    }`}
                  >
                    {step.label}
                  </span>
                </button>
                {idx < steps.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-2 transition-colors ${
                      step.num < wizardStep ? 'bg-sky-300' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  function StepContent() {
    switch (wizardStep) {
      case 1:
        return (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-muted-foreground">
              {t.students.servicesAvailable}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {services.map((svc) => {
                const Icon = serviceIcons[svc.name] || Layers;
                const isSelected = selectedService?.id === svc.id;
                const subjectCount = svc.subjects?.length || 0;
                return (
                  <Card
                    key={svc.id}
                    className={`cursor-pointer transition-all hover:shadow-md hover:border-sky-300 ${
                      isSelected
                        ? 'border-sky-500 bg-sky-50 shadow-md ring-1 ring-sky-200'
                        : 'border-border hover:bg-muted/50'
                    }`}
                    onClick={() => handleSelectService(svc)}
                  >
                    <CardContent className="p-4 flex items-center gap-4">
                      <div
                        className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 ${
                          isSelected
                            ? 'bg-sky-100 text-sky-700'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        <Icon className="h-6 w-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{svc.nameAr}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {subjectCount} {t.students.subjectCount}
                        </p>
                      </div>
                      <ChevronLeft
                        className={`h-5 w-5 shrink-0 transition-colors ${
                          isSelected ? 'text-sky-600' : 'text-muted-foreground'
                        }`}
                      />
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            {services.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Layers className="h-10 w-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">{t.common.noData}</p>
              </div>
            )}
          </div>
        );

      case 2:
        return (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => goToStep(1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <h4 className="text-sm font-semibold text-muted-foreground">
                  {t.students.subjectsAvailable}
                </h4>
              </div>
              {selectedSubjects.length > 0 && (
                <Badge className="bg-cyan-100 text-cyan-700 border-cyan-200 text-xs">
                  {selectedSubjects.length} {t.students.subjectCount}
                </Badge>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {filteredSubjects.map((subj) => {
                const isSelected = selectedSubjects.some((s) => s.id === subj.id);
                return (
                  <Card
                    key={subj.id}
                    className={`cursor-pointer transition-all hover:shadow-md relative ${
                      isSelected
                        ? 'border-cyan-500 bg-cyan-50 shadow-md ring-1 ring-cyan-200'
                        : 'border-border hover:border-cyan-300 hover:bg-cyan-50/50'
                    }`}
                    onClick={() => handleToggleSubject(subj)}
                  >
                    <CardContent className="p-3 text-center relative">
                      {/* Checkmark overlay */}
                      {isSelected && (
                        <div className="absolute top-1.5 start-1.5 h-5 w-5 rounded-full bg-emerald-500 flex items-center justify-center z-10">
                          <Check className="h-3 w-3 text-white" strokeWidth={3} />
                        </div>
                      )}
                      <div
                        className={`h-10 w-10 rounded-lg mx-auto mb-2 flex items-center justify-center ${
                          isSelected
                            ? 'bg-cyan-100 text-cyan-700'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        <BookOpen className="h-5 w-5" />
                      </div>
                      <p
                        className={`text-xs font-medium leading-tight ${
                          isSelected ? 'text-cyan-800' : ''
                        }`}
                      >
                        {subj.nameAr}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {subj.levels?.length || 0} {t.services.levelsLabel}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            {filteredSubjects.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <BookOpen className="h-10 w-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">{t.services.noSubjects}</p>
              </div>
            )}
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => goToStep(2)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <h4 className="text-sm font-semibold text-muted-foreground">
                {t.students.levelsAvailable}
              </h4>
            </div>
            {selectedSubjects.map((subj, subIdx) => {
              const levels = getLevelsForSubject(subj);
              const selectedLvl = enrollmentLevels[subj.id];
              return (
                <div key={subj.id} className="space-y-2">
                  {subIdx > 0 && <div className="border-t border-dashed my-2" />}
                  <h4 className="text-sm font-semibold flex items-center gap-2 text-cyan-700">
                    <BookOpen className="h-4 w-4" />
                    {subj.nameAr}
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {levels.map((lvl) => {
                      const isSelected = selectedLvl?.id === lvl.id;
                      return (
                        <Card
                          key={lvl.id}
                          className={`cursor-pointer transition-all hover:shadow-md ${
                            isSelected
                              ? 'border-sky-500 bg-sky-50 shadow-md ring-1 ring-sky-200'
                              : 'border-border hover:border-sky-300 hover:bg-sky-50/50'
                          }`}
                          onClick={() => handleSelectLevelForSubject(subj.id, lvl)}
                        >
                          <CardContent className="p-3 text-center">
                            <div
                              className={`h-10 w-10 rounded-lg mx-auto mb-2 flex items-center justify-center ${
                                isSelected
                                  ? 'bg-sky-100 text-sky-700'
                                  : 'bg-muted text-muted-foreground'
                              }`}
                            >
                              <GraduationCap className="h-5 w-5" />
                            </div>
                            <p
                              className={`text-xs font-medium leading-tight ${
                                isSelected ? 'text-sky-800' : ''
                              }`}
                            >
                              {lvl.nameAr}
                            </p>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                  {levels.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-2">
                      {t.services.noLevels}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => goToStep(3)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <h4 className="text-sm font-semibold text-muted-foreground">
                  {t.students.teachersAvailable}
                </h4>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleSkipAllTeachers}
                className="gap-1 text-violet-600 hover:text-violet-800 text-xs h-7"
              >
                <UserMinus className="h-3 w-3" />
                {t.students.skipAll}
              </Button>
            </div>
            {selectedSubjects.map((subj, subIdx) => {
              const teachers = getFilteredTeachers(subj.id);
              const selectedTchr = enrollmentTeachers[subj.id];
              const isNoTeacher = noTeacherFor[subj.id] === true;
              const isResolved = isNoTeacher || (selectedTchr !== undefined && selectedTchr !== null);
              return (
                <div key={subj.id} className="space-y-2">
                  {subIdx > 0 && <div className="border-t border-dashed my-2" />}
                  <h4 className="text-sm font-semibold flex items-center gap-2 text-cyan-700">
                    <BookOpen className="h-4 w-4" />
                    {subj.nameAr}
                    {isResolved && (
                      <Check className="h-4 w-4 text-emerald-500" />
                    )}
                  </h4>

                  {/* Without teacher option */}
                  <Card
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      isNoTeacher
                        ? 'border-violet-500 bg-violet-50 shadow-md ring-1 ring-violet-200'
                        : 'border-border hover:border-violet-300'
                    }`}
                    onClick={() => handleSelectTeacherForSubject(subj.id, null)}
                  >
                    <CardContent className="p-3 flex items-center gap-3">
                      <div
                        className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${
                          isNoTeacher
                            ? 'bg-violet-100 text-violet-700'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        <UserMinus className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <p
                          className={`text-sm font-medium ${
                            isNoTeacher ? 'text-violet-800' : ''
                          }`}
                        >
                          {t.students.withoutTeacher}
                        </p>
                      </div>
                      {isNoTeacher && (
                        <div className="h-5 w-5 rounded-full bg-violet-500 flex items-center justify-center">
                          <Check className="h-3 w-3 text-white" strokeWidth={3} />
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Teacher list */}
                  <div className="space-y-2">
                    {teachers.map((teacher) => {
                      const isSelected = selectedTchr?.id === teacher.id && !isNoTeacher;
                      const count = studentCountsMap[teacher.id] || 0;
                      return (
                        <Card
                          key={teacher.id}
                          className={`cursor-pointer transition-all hover:shadow-md ${
                            isSelected
                              ? 'border-sky-500 bg-sky-50 shadow-md ring-1 ring-sky-200'
                              : 'border-border hover:border-sky-300'
                          }`}
                          onClick={() => handleSelectTeacherForSubject(subj.id, teacher)}
                        >
                          <CardContent className="p-3 flex items-center gap-3">
                            <div
                              className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                                isSelected
                                  ? 'bg-sky-100 text-sky-700'
                                  : getAvatarColor(teacher.fullName)
                              }`}
                            >
                              {teacher.fullName.charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p
                                className={`text-sm font-medium truncate ${
                                  isSelected ? 'text-sky-800' : ''
                                }`}
                              >
                                {teacher.fullName}
                              </p>
                              {teacher.phone && (
                                <p className="text-xs text-muted-foreground truncate" dir="ltr">
                                  {teacher.phone}
                                </p>
                              )}
                            </div>
                            <Badge
                              variant="secondary"
                              className={`shrink-0 text-xs ${
                                count > 0
                                  ? 'bg-sky-100 text-sky-700'
                                  : 'bg-gray-100 text-gray-500'
                              }`}
                            >
                              {count} {t.students.studentCountLabel}
                            </Badge>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>

                  {teachers.length === 0 && !isNoTeacher && (
                    <div className="text-center py-6 text-muted-foreground">
                      <UserCheck className="h-8 w-8 mx-auto mb-1 opacity-30" />
                      <p className="text-xs">{t.common.noData}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );

      case 5:
        return (
          <div className="space-y-4">
            {/* Summary badges - multi-subject */}
            <div className="flex flex-wrap gap-2 p-3 rounded-lg bg-muted/50 border">
              {selectedService && (
                <Badge variant="outline" className="gap-1 text-xs">
                  <Layers className="h-3 w-3" />
                  {selectedService.nameAr}
                </Badge>
              )}
              {selectedSubjects.map((sub) => {
                const lvl = enrollmentLevels[sub.id];
                const tchr = enrollmentTeachers[sub.id];
                const isNoTchr = noTeacherFor[sub.id] === true;
                return (
                  <Badge
                    key={sub.id}
                    variant="outline"
                    className="gap-1 text-xs border-sky-300 text-sky-700 flex-wrap"
                  >
                    <BookOpen className="h-3 w-3" />
                    {sub.nameAr}
                    {lvl && (
                      <>
                        <span className="mx-0.5">—</span>
                        <GraduationCap className="h-3 w-3" />
                        {lvl.nameAr}
                      </>
                    )}
                    {!isNoTchr && tchr ? (
                      <>
                        <span className="mx-0.5">—</span>
                        <UserCheck className="h-3 w-3" />
                        {tchr.fullName}
                      </>
                    ) : (
                      <>
                        <span className="mx-0.5">—</span>
                        <UserMinus className="h-3 w-3" />
                        {t.students.withoutTeacher}
                      </>
                    )}
                  </Badge>
                );
              })}
            </div>

            {/* Back to change selections */}
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={() => goToStep(2)}
              >
                <Pencil className="h-3 w-3" />
                {t.common.edit}
              </Button>
            </div>

            {/* Personal Info */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-sky-600" />
                {t.students.personalInfo}
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="fullName">
                    {t.students.fullName} <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="fullName"
                    value={form.fullName}
                    onChange={(e) => setForm((prev) => ({ ...prev, fullName: e.target.value }))}
                    placeholder={t.students.fullNamePlaceholder}
                    ref={fullNameInputRef}
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="phone">{t.common.phone}</Label>
                  <Input
                    id="phone"
                    value={form.phone}
                    onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                    placeholder={t.students.phonePlaceholder}
                    dir="ltr"
                  />
                </div>
              </div>
            </div>

            {/* Parent Info */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <Users className="h-4 w-4 text-sky-600" />
                {t.students.parentInfo}
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="parentName">{t.students.parentName}</Label>
                  <Input
                    id="parentName"
                    value={form.parentName}
                    onChange={(e) => setForm((prev) => ({ ...prev, parentName: e.target.value }))}
                    placeholder={t.students.parentNamePlaceholder}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="parentPhone">{t.students.parentPhone}</Label>
                  <Input
                    id="parentPhone"
                    value={form.parentPhone}
                    onChange={(e) => setForm((prev) => ({ ...prev, parentPhone: e.target.value }))}
                    placeholder={t.students.parentPhonePlaceholder}
                    dir="ltr"
                  />
                </div>
              </div>
            </div>

            {/* Enrollment Date */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-sky-600" />
                {t.students.enrollmentDateLabel}
              </h4>
              <div className="space-y-1.5">
                <Label htmlFor="enrollmentDate">{t.students.enrollmentDateLabel}</Label>
                <Input
                  id="enrollmentDate"
                  type="date"
                  value={form.enrollmentDate}
                  onChange={(e) => setForm((prev) => ({ ...prev, enrollmentDate: e.target.value }))}
                  max={new Date().toISOString().split('T')[0]}
                  dir="ltr"
                  className="text-left"
                />
              </div>
            </div>

            {/* Monthly Fee per Subject - Admin only */}
            {isAdmin && selectedSubjects.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <Wallet className="h-4 w-4 text-cyan-600" />
                {t.students.monthlyFeeSection}
              </h4>
              <div className="space-y-2">
                {selectedSubjects.map((sub) => {
                  const fee = enrollmentFees[sub.id] || '';
                  const teacherName = noTeacherFor[sub.id]
                    ? t.students.withoutTeacher
                    : enrollmentTeachers[sub.id]?.fullName || '—';
                  return (
                    <div key={sub.id} className="p-3 rounded-lg border bg-card space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <BookOpen className="h-4 w-4 text-cyan-600" />
                          <span className="text-sm font-medium">{sub.nameAr}</span>
                          {enrollmentLevels[sub.id] && (
                            <Badge variant="outline" className="text-[10px] border-sky-200 text-sky-700">
                              {enrollmentLevels[sub.id].nameAr}
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">{teacherName}</span>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">{t.students.monthlyFeeLabel}</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={fee}
                          onChange={(e) =>
                            setEnrollmentFees((prev) => ({ ...prev, [sub.id]: e.target.value }))
                          }
                          placeholder="0"
                          dir="ltr"
                          className="text-left h-9"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              {/* Total Fee */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-cyan-50 border border-cyan-200">
                <span className="text-sm font-semibold text-cyan-800">{t.students.totalFee}</span>
                <span className="text-lg font-bold text-cyan-700" dir="ltr">
                  {selectedSubjects.reduce((sum, sub) => sum + (parseFloat(enrollmentFees[sub.id]) || 0), 0).toLocaleString('ar-MA')} {t.common.dh}
                </span>
              </div>
              {/* Pack Type (Langues only) */}
              {selectedService?.id === 'service_langues' && (
                <div className="space-y-1.5">
                  <Label>{t.payments.packType}</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { value: 1, label: t.payments.pack1 },
                      { value: 3, label: t.payments.pack3 },
                      { value: 6, label: t.payments.pack6 },
                      { value: 9, label: t.payments.pack9 },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() =>
                          setForm((prev) => ({ ...prev, packMonths: opt.value }))
                        }
                        className={`px-3 py-2 rounded-lg border-2 text-sm font-medium transition-colors ${
                          form.packMonths === opt.value
                            ? 'border-sky-500 bg-sky-50 text-sky-700'
                            : 'border-muted bg-card hover:border-sky-200 hover:bg-sky-50/50 text-foreground'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            )}
          </div>
        );

      default:
        return null;
    }
  }

  // ── Main render ───────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Users className="h-5 w-5" />
          <span className="text-sm">
            {displayedStudents.length} {t.students.studentCount}
          </span>
          {(filterServiceId || filterSubjectId || filterLevelId) && (
            <button
              onClick={() => { setFilterServiceId(''); setFilterSubjectId(''); setFilterLevelId(''); }}
              className="text-xs text-sky-600 hover:text-sky-800 underline"
            >
              {t.students.resetFilters}
            </button>
          )}
        </div>
        <Button onClick={() => handleOpenDialog()} className="gap-2">
          <Plus className="h-4 w-4" />
          {t.students.addStudent}
        </Button>
      </div>

      {/* Search & Filters */}
      <Card>
        <CardContent className="p-4">
          <Tabs value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setLoading(true); }}>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute end-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t.students.searchPlaceholder}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="ps-9"
                  />
                </div>
                <TabsList>
                  <TabsTrigger value="all">{t.common.all}</TabsTrigger>
                  <TabsTrigger value="active">{t.common.active}</TabsTrigger>
                  <TabsTrigger value="inactive">{t.common.inactive}</TabsTrigger>
                </TabsList>
              </div>
              {/* Service / Subject / Level filters */}
              <div className="flex flex-wrap gap-2">
                <select
                  value={filterServiceId}
                  onChange={(e) => handleFilterServiceChange(e.target.value)}
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                >
                  <option value="">{t.students.allServices}</option>
                  {services.map((svc) => (
                    <option key={svc.id} value={svc.id}>{svc.nameAr}</option>
                  ))}
                </select>
                {filterSubjects.length > 0 && (
                  <select
                    value={filterSubjectId}
                    onChange={(e) => handleFilterSubjectChange(e.target.value)}
                    className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                  >
                    <option value="">{t.students.allSubjects}</option>
                    {filterSubjects.map((subj) => (
                      <option key={subj.id} value={subj.id}>{subj.nameAr}</option>
                    ))}
                  </select>
                )}
                {filterLevels.length > 0 && (
                  <select
                    value={filterLevelId}
                    onChange={(e) => setFilterLevelId(e.target.value)}
                    className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                  >
                    <option value="">{t.students.allLevels}</option>
                    {filterLevels.map((lvl) => (
                      <option key={lvl.id} value={lvl.id}>{lvl.nameAr}</option>
                    ))}
                  </select>
                )}
                {(filterServiceId || filterSubjectId || filterLevelId) && (
                  <Badge className="bg-sky-100 text-sky-700 border-sky-200 h-9 px-3 font-medium">
                    {displayedStudents.length} {t.students.studentCount}
                  </Badge>
                )}
              </div>
            </div>
          </Tabs>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : displayedStudents.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">{t.students.noStudents}</p>
              <p className="text-sm mt-1">{t.students.addFirst}</p>
            </div>
          ) : (
            <div className="max-h-[500px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-start">{t.students.fullName}</TableHead>
                    <TableHead className="text-start hidden md:table-cell">{t.students.level}</TableHead>
                    <TableHead className="text-start hidden lg:table-cell">{t.students.teacher}</TableHead>
                    <TableHead className="text-start hidden md:table-cell">{t.common.phone}</TableHead>
                                    {isAdmin && (
                    <TableHead className="text-start hidden sm:table-cell">{t.students.fee}</TableHead>
                    )}
                    {isAdmin && (
                    <TableHead className="text-center">{t.students.paymentCol}</TableHead>
                    )}
                    <TableHead className="text-start">{t.common.status}</TableHead>
                    <TableHead className="text-start hidden lg:table-cell">{t.students.enrollment}</TableHead>
                    <TableHead className="text-start">{t.common.actions}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayedStudents.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell className="font-medium text-start">
                        <div className="flex items-center gap-2">
                          <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${getAvatarColor(student.fullName)}`}>
                            {student.fullName.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{student.fullName}</p>
                            {student.parentName && (
                              <p className="text-xs text-muted-foreground truncate">
                                {t.students.guardian}{student.parentName}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-start hidden md:table-cell">
                        {student.enrollments && student.enrollments.length > 0 ? (
                          <div className="flex flex-col gap-0.5">
                            {student.enrollments.map((e) => (
                              <div key={e.id} className="text-xs">
                                <span className="text-muted-foreground">{e.level?.subject?.nameAr}</span>
                                <span className="mx-0.5">—</span>
                                <span className="font-medium">{e.level?.nameAr}</span>
                              </div>
                            ))}
                          </div>
                        ) : student.level ? (
                          <div className="text-sm">
                            <span className="text-muted-foreground">{student.level.subject?.nameAr}</span>
                            <span className="mx-1">—</span>
                            <span className="font-medium">{student.level.nameAr}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-start hidden lg:table-cell">
                        {student.enrollments && student.enrollments.length > 0 ? (() => {
                          const teachersWithSubject = student.enrollments
                            .filter((e) => e.teacherId && e.teacher)
                            .map((e) => ({
                              name: e.teacher!.fullName,
                              subject: e.level?.subject?.nameAr || '',
                            }));
                          if (teachersWithSubject.length === 0) {
                            return <span className="text-muted-foreground text-sm">{t.students.withoutTeacher}</span>;
                          }
                          // Deduplicate teachers (a teacher might appear in multiple enrollments for same subject)
                          const seen = new Set<string>();
                          const uniqueTeachers = teachersWithSubject.filter((t) => {
                            const key = `${t.name}-${t.subject}`;
                            if (seen.has(key)) return false;
                            seen.add(key);
                            return true;
                          });
                          return (
                            <div className="flex flex-col gap-0.5">
                              {uniqueTeachers.map((t, idx) => (
                                <div key={idx} className="flex items-center gap-1.5 text-sm">
                                  <div className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${getAvatarColor(t.name)}`}>
                                    {t.name.charAt(0)}
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="font-medium leading-tight">{t.name}</span>
                                    {t.subject && (
                                      <span className="text-[10px] text-muted-foreground leading-tight">{t.subject}</span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          );
                        })() : student.teacher ? (
                          <div className="flex items-center gap-1.5 text-sm">
                            <div className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${getAvatarColor(student.teacher.fullName)}`}>
                              {student.teacher.fullName.charAt(0)}
                            </div>
                            <span>{student.teacher.fullName}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">{t.students.withoutTeacher}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-start hidden md:table-cell">
                        <div className="flex items-center gap-1 text-sm">
                          <Phone className="h-3 w-3 text-muted-foreground" />
                          {student.phone || '—'}
                        </div>
                      </TableCell>
                      {isAdmin && (
                      <TableCell className="text-start hidden sm:table-cell">
                        {student.enrollments && student.enrollments.length > 0 ? (
                          <div className="flex flex-col gap-0.5">
                            {student.enrollments.map((e, idx) => (
                              <span key={e.id || idx} className="text-xs" dir="ltr">
                                {(e.monthlyFee || 0) > 0 ? (
                                  <Badge className="bg-cyan-100 text-cyan-700 border-cyan-200 hover:bg-cyan-100 font-medium text-[10px] px-1.5">
                                    {e.level?.subject?.nameAr}:
                                    {e.monthlyFee?.toLocaleString('ar-MA')} {t.common.dh}
                                  </Badge>
                                ) : null}
                              </span>
                            ))}
                          </div>
                        ) : student.monthlyFee > 0 ? (
                          <Badge className="bg-cyan-100 text-cyan-700 border-cyan-200 hover:bg-cyan-100 font-medium">
                            {student.monthlyFee.toLocaleString('ar-MA')} {t.common.dh}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                      )}
                      {isAdmin && (
                      <TableCell className="text-center">
                        {student.isPackPaid ? (
                          <div className="flex items-center justify-center gap-1" title={t.students.packPaid}>
                            <CircleCheck className="h-5 w-5 text-blue-500" />
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-1" title={student.nextDueDate ? `${t.students.nextDueDate}: ${student.nextDueDate}` : t.students.notPaidYet}>
                            <CircleAlert className="h-5 w-5 text-red-400" />
                          </div>
                        )}
                      </TableCell>
                      )}
                      <TableCell className="text-start">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={student.status === 'active'}
                            onCheckedChange={() => handleToggleStatus(student)}
                          />
                          {getStatusBadge(student.status)}
                        </div>
                      </TableCell>
                      <TableCell className="text-start hidden lg:table-cell text-sm">
                        {student.enrollmentDate
                          ? new Date(student.enrollmentDate).toLocaleDateString('ar-MA')
                          : '—'}
                      </TableCell>
                      <TableCell className="text-start">
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleOpenDialog(student)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <AlertDialog open={deletingId === student.id} onOpenChange={(open) => setDeletingId(open ? student.id : null)}>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>{t.common.deleteConfirm}</AlertDialogTitle>
                                <AlertDialogDescription>
                                  {t.students.deleteConfirmMsg} &quot;{student.fullName}&quot;? {t.common.cannotUndo}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(student.id)}
                                  className="bg-destructive text-white hover:bg-destructive/90"
                                >
                                  {t.common.delete}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
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
          REGISTRATION WIZARD DIALOG
          ═══════════════════════════════════════════════════════════════════ */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setDialogOpen(false);
            resetWizard();
          }
        }}
      >
        <DialogContent className="sm:max-w-lg flex flex-col p-0 gap-0 max-h-[90vh]">
          {/* Header */}
          <DialogHeader className="px-8 pt-6 pb-2 shrink-0">
            <DialogTitle>
              {editingStudent ? t.students.editStudent : t.students.addStudent}
            </DialogTitle>
            <DialogDescription>
              {editingStudent ? t.students.editDesc : t.students.addDesc}
            </DialogDescription>
          </DialogHeader>

          {/* Step indicator */}
          {editingStudent ? null : StepIndicator()}

          {/* Body - scrollable */}
          <div className="flex-1 overflow-y-auto px-8 pb-4 min-h-0">
            {StepContent()}
          </div>

          {/* Footer - sticky */}
          <DialogFooter className="px-8 py-4 border-t shrink-0">
            <div className="flex items-center justify-between w-full gap-2">
              {/* Left side: back / skip / skip all */}
              <div>
                {wizardStep === 4 && !editingStudent && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleSkipAllTeachers}
                    className="gap-1 text-muted-foreground ms-2"
                  >
                    {t.students.skipAll}
                    <ChevronLeft className="h-3 w-3" />
                  </Button>
                )}
                {wizardStep > 1 && wizardStep < 5 && !editingStudent && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => goToStep((wizardStep - 1) as WizardStep)}
                    className="gap-1"
                  >
                    {t.common.back}
                    <ChevronRight className="h-3 w-3" />
                  </Button>
                )}
              </div>

              {/* Right side: cancel + save / next */}
              <div className="flex items-center gap-2">
                {editingStudent && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button type="button" variant="outline" className="text-destructive hover:text-destructive gap-1">
                        <Trash2 className="h-4 w-4" />
                        {t.common.delete}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{t.common.deleteConfirm}</AlertDialogTitle>
                        <AlertDialogDescription>
                          {t.students.deleteConfirmMsg} &quot;{editingStudent.fullName}&quot;? {t.common.cannotUndo}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => {
                            handleDelete(editingStudent.id);
                            setDialogOpen(false);
                            resetWizard();
                          }}
                          className="bg-destructive text-white hover:bg-destructive/90"
                        >
                          {t.common.delete}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setDialogOpen(false);
                    resetWizard();
                  }}
                >
                  {t.common.cancel}
                </Button>
                {wizardStep === 5 && (
                  <Button
                    type="button"
                    onClick={handleSubmit}
                    disabled={submitting || !form.fullName.trim() || selectedSubjects.length === 0 || selectedSubjects.some((sub) => !enrollmentLevels[sub.id])}
                    className="gap-1"
                  >
                    {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    {editingStudent ? t.common.saveChanges : t.students.addStudent}
                  </Button>
                )}
                {wizardStep >= 2 && wizardStep < 5 && !editingStudent && (
                  <Button
                    type="button"
                    onClick={handleNextStep}
                    disabled={isNextDisabled()}
                    className="gap-1"
                  >
                    {t.common.next}
                    <ChevronLeft className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
