# Datel Clinic System (DCS)

A premium SaaS Clinic Management Platform — part of the HUDI SOFT ecosystem.

## Product Identity
- **Product**: Datel Clinic System
- **Type**: SaaS Rental / Subscription
- **Target**: Clinics, Medical Centers, Specialist Clinics
- **Ecosystem**: HUDI SOFT (independent product)

## Architecture

```
datel-clinic.system/
├── backend/          # Node.js + Express + PostgreSQL API
├── frontend/         # Next.js 15 + TypeScript + TailwindCSS + ShadCN
└── mobile/           # Capacitor (Android + iOS wrapper)
```

## Tech Stack

| Layer     | Technology                          |
|-----------|-------------------------------------|
| Frontend  | Next.js 15, TypeScript, TailwindCSS, ShadCN UI, Framer Motion |
| Backend   | Node.js, Express.js                 |
| Database  | PostgreSQL                          |
| Auth      | JWT + RBAC                          |
| Mobile    | Capacitor (Android + iOS)           |
| Licensing | HUDI-SOFT-COM-MAIN (shared)         |

## Roles
- `super_admin` — Full system access
- `clinic_manager` — Clinic-wide management
- `doctor` — Patients, consultations, prescriptions
- `receptionist` — Appointments, patient check-in
- `pharmacist` — Pharmacy module
- `lab_staff` — Laboratory module
- `accountant` — Billing, reports

## Subscription Plans
Trial → Monthly → Quarterly → Semi-Annual → Annual → Lifetime

Managed entirely by **HUDI-SOFT-COM-MAIN**.

## Quick Start

### Backend
```bash
cd backend
cp .env.example .env
npm install
npm run migrate
npm run seed
npm run dev
```

### Frontend
```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

### Mobile
```bash
cd frontend
npx cap add android
npx cap add ios
npx cap sync
npx cap open android
```
