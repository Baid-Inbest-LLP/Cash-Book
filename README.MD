# Cash Book

Internal Cash Book application — a MERN monorepo scaffold that shares the same foundation as Mer-App: light/dark theme, navbar header, collapsible sidebar, authentication, company management, and settings (user management). Cash book domain features can be built on top of this base.

## Stack

- **Client:** React 19 + Vite, Mantine, Tailwind CSS, Redux Toolkit, React Router
- **Server:** Express 5, Mongoose 8, JWT auth (access + refresh)
- **DB:** MongoDB via `MONGODB_URI`
- **Tooling:** pnpm workspace

## Project structure

```
Cash-Book/
├── client/   # React app (Vite, port 5174)
└── server/   # Express API (port 5001)
```

## Getting started

```bash
pnpm install
pnpm dev          # runs client + server in parallel
```

- Client: http://localhost:5174
- API health: http://localhost:5001/api/v1/health

Configure environment variables in `server/.env` and `client/.env` (see the `.env.example` files).
Set `server/.env` with your MongoDB connection string before starting the app.

## Seeding

```bash
pnpm --filter server seed            # default users + companies (resets data)
pnpm --filter server seed:companies  # upsert companies/branches only
```

## Default accounts

Created automatically on first boot when the database is empty:

| Role       | Email                   | Password      |
| ---------- | ----------------------- | ------------- |
| Superadmin | superadmin@cashbook.com | super123      |
| Accountant | accountant@cashbook.com | accountant123 |

## Included modules

| Area      | Notes                                                                |
| --------- | -------------------------------------------------------------------- |
| Auth      | Login, forgot/reset password, JWT refresh, role-based access         |
| Layout    | Navbar header, collapsible gradient sidebar, light/dark theme toggle |
| Companies | CRUD for companies and branch locations, optional company stamp      |
| Settings  | User management (create/edit/deactivate/delete), change password     |
