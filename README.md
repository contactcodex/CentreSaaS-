# Codex Centre - SaaS Management System

نظام إدارة مراكز التعليم والتكوين - SaaS

## Features

- 📊 **Dashboard** - لوحة تحكم شاملة
- 👥 **Students Management** - إدارة التلاميذ
- 👨‍🏫 **Teachers Management** - إدارة الأساتذة
- 💰 **Payments** - إدارة الأقساط والمدفوعات
- 📅 **Schedule** - جدول الحصص الأسبوعي
- 📚 **Services** - إدارة الخدمات والمواد
- 🚪 **Classrooms** - إدارة القاعات
- 📈 **Financial Reports** - التقارير المالية
- 👤 **User Management** - إدارة المستخدمين (Admin/Secretary)
- ⚙️ **Settings** - إعدادات المركز

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript 5
- **UI**: shadcn/ui + Tailwind CSS 4
- **Database**: PostgreSQL (Neon)
- **ORM**: Prisma
- **State**: Zustand
- **Auth**: Session-based (bcryptjs)
- **Charts**: Recharts

## Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/contactcodex/CentreSaaS-.git
cd CentreSaaS-
```

### 2. Install dependencies
```bash
npm install
```

### 3. Set up environment variables
```bash
cp .env.example .env
```
Edit `.env` with your Neon database credentials.

### 4. Push database schema
```bash
npx prisma db push
npx prisma generate
```

### 5. Run the development server
```bash
npm run dev
```

### 6. Setup (First time)
Open `http://localhost:3000` and create your admin account.

## Deploy to Vercel

1. Push to GitHub
2. Import project in [Vercel](https://vercel.com)
3. Add environment variables (DATABASE_URL, DIRECT_URL)
4. Deploy

## Language Support

- 🇲🇦 Arabic (عربي)
- 🇫🇷 French (Français)

---

**Codex** - SaaS Solutions Provider
