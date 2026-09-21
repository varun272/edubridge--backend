# EduBridge Backend (MERN)

Production API for EduBridge institute workspaces — MongoDB Atlas + Mongoose + Express + TypeScript.

## Stack

- **MongoDB Atlas** (cloud database)
- **Mongoose** ODM with ObjectId references
- **Express + TypeScript** (feature-based architecture)
- **JWT** auth with role-scoped memberships (`admin` | `teacher` | `parent`)

## Setup

1. Create a free cluster on [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Database Access → create a DB user
3. Network Access → allow your IP (or `0.0.0.0/0` for dev)
4. Connect → Drivers → copy the connection string
5. Put it in `.env` as `MONGODB_URI`

```env
MONGODB_URI=mongodb+srv://USER:PASS@CLUSTER.mongodb.net/edubridge?retryWrites=true&w=majority
```

```bash
cd "edubridge backend"
npm install
npm run setup    # seed demo admin (skips if data exists)
npm run dev      # http://localhost:4000
```

Seed login (after setup):

- Email: `admin@greenwood.edu`
- Password: `password123`
- List institutions: `GET /api/institutions`

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | API with hot reload |
| `npm run build` / `npm start` | Production build |
| `npm run db:seed` / `npm run setup` | Seed demo workspace |
| `npm test` | API integration suite (needs `MONGODB_URI`) |

## Architecture

```
src/
  config/          env.ts · database.ts
  models/          reusable Mongoose schemas (ObjectId refs + indexes + timestamps)
  features/        auth · institutions · students · classes · …
  lib/             auth helpers, mail, activity
  middleware/
```

## Auth header

```
Authorization: Bearer <jwt>
```

JWT carries `sub`, `email`, `institutionId`, `role` — every query is tenant-scoped.

Dev OTP is fixed to `123456` when `DEV_OTP` is set (see `.env`).
