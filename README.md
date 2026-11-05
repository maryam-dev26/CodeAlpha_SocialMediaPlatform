# Vynkverse

Vynkverse is a developer learning and peer-support community platform. Members share learning journeys, ask for help, showcase projects, and recommend useful resources.

This repository contains the client and server as two independent applications.

## Tech stack

- **Client:** React, TypeScript, Vite, Tailwind CSS v4, React Router (added in a later step)
- **Server:** Node.js, Express.js (JavaScript)
- **Database:** MongoDB with Mongoose (added in a later step)
- **Auth:** JWT and bcrypt (added in a later step)

## Project structure

```
social-media-platform/
├── client/                     # React + TypeScript frontend
│   ├── public/                 # Static public assets
│   └── src/
│       ├── assets/             # Imported images and styles used by components
│       ├── components/         # Reusable UI grouped by feature
│       │   ├── common/         # Button, Input, Modal, Avatar, Spinner
│       │   ├── layout/         # Navbar, Sidebar, Footer
│       │   ├── post/           # PostCard, PostForm, PostList
│       │   └── comment/        # CommentList, CommentForm
│       ├── context/            # React context (auth state)
│       ├── hooks/              # Reusable custom hooks
│       ├── layouts/            # Page shells (main layout, auth layout)
│       ├── pages/              # Route-level screens
│       │   └── auth/           # Login and register pages
│       ├── routes/             # Route table and protected routes
│       ├── services/           # HTTP/API calls
│       ├── types/              # Shared TypeScript interfaces
│       ├── utils/              # Pure helper functions
│       ├── App.tsx
│       ├── index.css           # Tailwind entry point
│       └── main.tsx
├── server/                     # Express API
│   ├── src/
│   │   ├── config/             # Database and environment configuration
│   │   ├── controllers/        # Request handlers
│   │   ├── middleware/         # Auth, validation, error handling
│   │   ├── models/             # Mongoose models
│   │   ├── routes/             # Express route definitions
│   │   ├── utils/              # Shared server helpers
│   │   ├── app.js              # Express app setup
│   │   └── server.js           # Env loading and server startup
│   └── .env.example            # Environment variable template
├── .gitignore
└── README.md
```

## Prerequisites

- Node.js 20 or newer
- npm 10 or newer
- MongoDB running locally or a MongoDB Atlas connection string (needed from the database step onward)

## Setup and run

Install and run the client:

```bash
cd client
npm install
npm run dev
```

The client runs at `http://localhost:5173`.

Install and run the server:

```bash
cd server
npm install
cp .env.example .env
npm run dev
```

On Windows Command Prompt, use `copy .env.example .env` instead of `cp`.

The server runs at `http://localhost:5000`.

During development the Vite dev server proxies requests beginning with `/api` to `http://localhost:5000`, so the client can call the API with relative paths such as `/api/posts`.

## Environment variables

Create `server/.env` from `server/.env.example`. The placeholder keys are:

| Variable | Purpose |
| --- | --- |
| `PORT` | Port the Express server listens on |
| `MONGO_URI` | MongoDB connection string |
| `JWT_SECRET` | Secret used to sign authentication tokens |
| `JWT_EXPIRES_IN` | Token lifetime, for example `7d` |
| `CLIENT_URL` | Allowed client origin for CORS |

Never commit `server/.env`. Only `.env.example` belongs in version control.

## Current status

Day 1 sets up the project skeleton only. Database models, authentication, APIs, and product features are intentionally not implemented yet. The planned data model includes users, posts with four types (`journey`, `help`, `showcase`, `resource`), comments, and follows.
