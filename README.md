# ☕ KapeGuid — Coffee Shop Customer System

A QR code-based customer management system for cafés, built with **Next.js**, **Supabase**, and deployed on **Vercel**.

---

## Features

- 📊 **Dashboard** — live stats, today's visits, top regulars, real-time updates
- 📷 **QR Scanner** — scan customer QR codes to check them in instantly
- 👥 **Customer Management** — add, edit, deactivate, and view full profiles
- 🎫 **QR Code Generator** — auto-generates a unique QR code per customer (downloadable)
- 📅 **Visit History** — full log of every visit per customer
- 🔴 **Real-time** — dashboard updates live via Supabase Realtime

---

## Setup Guide

### 1. Supabase

1. Go to [supabase.com](https://supabase.com) and create a new project
2. In the **SQL Editor**, run the contents of `lib/schema.sql`
3. Copy your **Project URL** and **anon/public API key** from *Settings → API*

### 2. Environment Variables

Create a `.env.local` file in the root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

### 3. Local Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Deploy to Vercel via GitHub

1. Push this project to a GitHub repository
2. Go to [vercel.com](https://vercel.com) → **New Project** → import your GitHub repo
3. Add the environment variables in Vercel's project settings:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_APP_URL`
4. Click **Deploy** — that's it!

Every `git push` to `main` will auto-deploy to Vercel.

---

## Project Structure

```
kapeguid/
├── app/
│   ├── page.tsx              # Home / landing
│   ├── dashboard/page.tsx    # Dashboard with live stats
│   ├── scan/page.tsx         # QR code scanner
│   ├── customers/page.tsx    # Customer list & management
│   └── api/
│       ├── customers/route.ts
│       ├── scan/route.ts
│       └── visits/route.ts
├── components/
│   ├── Navbar.tsx
│   ├── AddCustomerModal.tsx
│   └── CustomerDetailModal.tsx
├── lib/
│   ├── supabase.ts           # Supabase client & types
│   └── schema.sql            # Database schema
└── .env.local.example
```

---

## Tech Stack

| | Tool |
|---|---|
| Framework | Next.js 14 (App Router) |
| Database | Supabase (PostgreSQL) |
| Hosting | Vercel |
| QR Scanning | html5-qrcode |
| QR Generation | qrcode |
| Styling | Tailwind CSS |
