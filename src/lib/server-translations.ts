// Server-side translations for API error messages
// These are used in API routes which can't use the client-side useT() hook

const messages: Record<string, { ar: string; fr: string }> = {
  // Auth
  emailPasswordRequired: { ar: 'البريد الإلكتروني وكلمة المرور مطلوبان', fr: 'Email et mot de passe requis' },
  invalidCredentials: { ar: 'بيانات الدخول غير صحيحة', fr: 'Identifiants incorrects' },
  accountDisabled: { ar: 'هذا الحساب معطل', fr: 'Ce compte est désactivé' },
  loginError: { ar: 'خطأ في تسجيل الدخول', fr: 'Erreur de connexion' },
  unauthorized: { ar: 'غير مصرح', fr: 'Non autorisé' },
  unauthorizedLogin: { ar: 'غير مصرح - يرجى تسجيل الدخول', fr: 'Non autorisé - Veuillez vous connecter' },
  adminOnly: { ar: 'غير مصرح - مدير فقط', fr: 'Non autorisé - Admin uniquement' },
  sessionExpired: { ar: 'جلسة منتهية الصلاحية', fr: 'Session expirée' },
  sessionError: { ar: 'خطأ في التحقق', fr: 'Erreur de vérification' },
  logoutError: { ar: 'خطأ في تسجيل الخروج', fr: 'Erreur de déconnexion' },
  setupAllFieldsRequired: { ar: 'جميع الحقول مطلوبة', fr: 'Tous les champs sont requis' },
  adminAlreadyExists: { ar: 'تم إنشاء المسؤول بالفعل', fr: "L'administrateur existe déjà" },
  adminCreated: { ar: 'تم إنشاء المسؤول بنجاح', fr: 'Administrateur créé avec succès' },
  adminCreateError: { ar: 'خطأ في إنشاء المسؤول', fr: "Erreur lors de la création de l'administrateur" },
  
  // Users
  fetchUsersError: { ar: 'خطأ في جلب المستخدمين', fr: 'Erreur de chargement des utilisateurs' },
  usersFieldsRequired: { ar: 'البريد الإلكتروني وكلمة المرور والاسم مطلوبون', fr: 'Email, mot de passe et nom requis' },
  emailAlreadyUsed: { ar: 'هذا البريد الإلكتروني مستخدم بالفعل', fr: 'Cet email est déjà utilisé' },
  createUserError: { ar: 'خطأ في إنشاء المستخدم', fr: "Erreur lors de la création de l'utilisateur" },
  userNotFound: { ar: 'المستخدم غير موجود', fr: 'Utilisateur non trouvé' },
  updateUserError: { ar: 'خطأ في تحديث المستخدم', fr: "Erreur lors de la mise à jour" },
  deleteUserError: { ar: 'خطأ في حذف المستخدم', fr: 'Erreur lors de la suppression' },
  
  // Backup
  backupCreated: { ar: 'تم إنشاء النسخة الاحتياطية بنجاح', fr: 'Sauvegarde créée avec succès' },
  backupCreateError: { ar: 'فشل إنشاء النسخة الاحتياطية', fr: 'Échec de la sauvegarde' },
  backupFetchError: { ar: 'فشل جلب النسخ الاحتياطية', fr: 'Échec du chargement des sauvegardes' },
  fileNameRequired: { ar: 'اسم الملف مطلوب', fr: 'Nom de fichier requis' },
  invalidFileName: { ar: 'اسم ملف غير صالح', fr: 'Nom de fichier invalide' },
  backupNotFound: { ar: 'النسخة الاحتياطية غير موجودة', fr: 'Sauvegarde non trouvée' },
  backupRestored: { ar: 'تم استعادة النسخة الاحتياطية بنجاح', fr: 'Sauvegarde restaurée avec succès' },
  backupRestoreError: { ar: 'فشل استعادة النسخة الاحتياطية', fr: 'Échec de la restauration' },
  
  // Generic
  error: { ar: 'خطأ', fr: 'Erreur' },
  noService: { ar: 'بدون خدمة', fr: 'Sans service' },
  noLevel: { ar: 'بدون مستوى', fr: 'Sans niveau' },
};

export function t(key: string, lang?: 'ar' | 'fr'): string {
  const entry = messages[key];
  if (!entry) return key;
  return lang ? entry[lang] : entry.ar;
}

// Month names for server-side
export const MONTH_LABELS_AR: Record<string, string> = {
  January: 'يناير', February: 'فبراير', March: 'مارس', April: 'أبريل',
  May: 'ماي', June: 'يونيو', July: 'يوليوز', August: 'غشت',
  September: 'شتنبر', October: 'أكتوبر', November: 'نونبر', December: 'دجنبر',
};

export const MONTH_LABELS_FR: Record<string, string> = {
  January: 'Janvier', February: 'Février', March: 'Mars', April: 'Avril',
  May: 'Mai', June: 'Juin', July: 'Juillet', August: 'Août',
  September: 'Septembre', October: 'Octobre', November: 'Novembre', December: 'Décembre',
};

// Day names
export const DAY_NAMES_AR: Record<string, string> = {
  '1': 'الأحد', '2': 'الإثنين', '3': 'الثلاثاء', '4': 'الأربعاء',
  '5': 'الخميس', '6': 'الجمعة', '7': 'السبت',
};

export const DAY_NAMES_FR: Record<string, string> = {
  '1': 'Dimanche', '2': 'Lundi', '3': 'Mardi', '4': 'Mercredi',
  '5': 'Jeudi', '6': 'Vendredi', '7': 'Samedi',
};
