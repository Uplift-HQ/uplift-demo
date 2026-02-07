# Developer Setup Guide

## Quick Start

```bash
# 1. Clone repository
git clone https://github.com/your-org/uplift.git
cd uplift

# 2. Install dependencies
pnpm install

# 3. Set up database
createdb uplift
pnpm run db:migrate

# 4. Configure environment
cp .env.example .env
# Edit .env with your local values

# 5. Start development
pnpm run dev
```

---

## Prerequisites

### Required
| Tool | Version | Installation |
|------|---------|--------------|
| Node.js | 20+ | https://nodejs.org or `nvm install 20` |
| pnpm | 8+ | `npm install -g pnpm` |
| PostgreSQL | 15+ | https://postgresql.org or `brew install postgresql@15` |
| Git | 2.30+ | https://git-scm.com |

### Recommended
| Tool | Purpose | Installation |
|------|---------|--------------|
| Docker Desktop | Local containers | https://docker.com |
| VS Code | IDE | https://code.visualstudio.com |
| Postman | API testing | https://postman.com |
| TablePlus | Database GUI | https://tableplus.com |
| Expo Go | Mobile testing | App Store / Play Store |

---

## Project Structure

```
uplift/
├── src/                      # Backend API
│   ├── index.js             # Express app entry point
│   ├── routes/              # API route handlers
│   │   ├── auth.js          # Authentication endpoints
│   │   ├── scheduling.js    # Shifts, templates, forecasting
│   │   ├── time.js          # Clock in/out, timesheets
│   │   ├── skills.js        # Skills and career
│   │   ├── users.js         # User management
│   │   ├── billing.js       # Stripe integration
│   │   └── ...
│   ├── services/            # Business logic
│   │   ├── auth.js          # JWT, password hashing
│   │   ├── billing.js       # Subscription management
│   │   ├── notifications.js # Push/email notifications
│   │   └── ...
│   ├── middleware/          # Express middleware
│   │   └── index.js         # Auth, validation, rate limiting
│   └── lib/                 # Utilities
│       └── database.js      # PostgreSQL connection
│
├── portal/                   # Customer Portal (React)
│   ├── src/
│   │   ├── pages/           # Page components
│   │   ├── components/      # Reusable components
│   │   ├── lib/             # API client, auth context
│   │   └── styles/          # TailwindCSS
│   ├── index.html
│   └── vite.config.js
│
├── mobile/                   # Mobile App (React Native)
│   ├── App.tsx              # Entry point
│   ├── src/
│   │   ├── screens/         # Screen components
│   │   │   ├── worker/      # Worker-specific screens
│   │   │   └── manager/     # Manager-specific screens
│   │   ├── components/      # Reusable components
│   │   ├── services/        # API client, offline support
│   │   ├── hooks/           # Custom React hooks
│   │   └── navigation/      # React Navigation setup
│   └── app.config.js        # Expo configuration
│
│   └── ops/                 # Internal Ops Portal (apps/ops/)
│
├── database/
│   ├── schema.sql           # Full schema (reference)
│   └── migrations/          # Incremental migrations
│
├── tests/                   # Test suites
├── docs/                    # Documentation
├── brand/                   # Logo and brand assets
└── k8s/                     # Kubernetes manifests
```

---

## Environment Setup

### 1. Database

```bash
# macOS with Homebrew
brew install postgresql@15
brew services start postgresql@15

# Ubuntu/Debian
sudo apt install postgresql-15
sudo systemctl start postgresql

# Create database
createdb uplift

# Run migrations
pnpm run db:migrate
```

### 2. Environment Variables

Create `.env` in the root directory:

```bash
# Server
NODE_ENV=development
PORT=3000

# Database
DATABASE_URL=postgres://localhost:5432/uplift

# Authentication (generate with: openssl rand -base64 48)
JWT_SECRET=your-development-secret-key-at-least-64-characters-long
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Stripe (use test keys)
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Email (optional for dev)
SENDGRID_API_KEY=SG.xxx
EMAIL_FROM=dev@localhost

# CORS
CORS_ORIGINS=http://localhost:5173,http://localhost:5174
```

### 3. Stripe Setup (Optional)

For local Stripe webhook testing:

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks
stripe listen --forward-to localhost:3000/api/billing/webhooks/stripe
```

---

## Development Workflow

### Starting Services

```bash
# Terminal 1: Backend API
pnpm run dev

# Terminal 2: Customer Portal
cd portal && pnpm run dev

# Terminal 3: Mobile App
cd mobile && npx expo start
```

### Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm run dev` | Start API in development mode (nodemon) |
| `pnpm run start` | Start API in production mode |
| `pnpm run test` | Run test suite |
| `pnpm run lint` | Run ESLint |
| `pnpm run db:migrate` | Run database migrations |
| `pnpm run db:seed` | Seed database with demo data |

### Accessing Applications

| Application | URL | Default Login |
|-------------|-----|---------------|
| API | http://localhost:3000 | N/A |
| API Health | http://localhost:3000/health | N/A |
| Portal | http://localhost:5173 | admin@demo.com / Demo123! |
| Backoffice | http://localhost:5174 | superadmin@anthropic.com |
| Mobile | Expo Go app | Same as Portal |

---

## API Development

### Adding a New Endpoint

1. **Create/edit route file** in `src/routes/`:

```javascript
// src/routes/example.js
import { Router } from 'express';
import { authMiddleware, requireRole, validate } from '../middleware/index.js';
import { z } from 'zod';

const router = Router();
router.use(authMiddleware);

// Define validation schema
const createSchema = z.object({
  name: z.string().min(1).max(100),
  value: z.number().positive(),
});

// GET /api/example
router.get('/example', async (req, res) => {
  const { organizationId } = req.user;
  
  const result = await db.query(
    'SELECT * FROM examples WHERE organization_id = $1',
    [organizationId]
  );
  
  res.json({ examples: result.rows });
});

// POST /api/example
router.post('/example', validate(createSchema), async (req, res) => {
  const { organizationId, userId } = req.user;
  const { name, value } = req.body;
  
  const result = await db.query(
    `INSERT INTO examples (organization_id, name, value, created_by)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [organizationId, name, value, userId]
  );
  
  res.status(201).json({ example: result.rows[0] });
});

export default router;
```

2. **Register route** in `src/index.js`:

```javascript
import exampleRoutes from './routes/example.js';
// ...
app.use('/api', exampleRoutes);
```

3. **Add database migration** if needed:

```sql
-- database/migrations/YYYYMMDDHHMMSS_add_examples.sql
CREATE TABLE examples (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  name VARCHAR(100) NOT NULL,
  value DECIMAL(10,2) NOT NULL,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_examples_org ON examples(organization_id);
```

### Authentication Patterns

```javascript
// Public endpoint (no auth)
router.get('/public', async (req, res) => { ... });

// Authenticated (any logged-in user)
router.get('/protected', authMiddleware, async (req, res) => { ... });

// Role-restricted
router.get('/managers-only', requireRole(['manager', 'admin']), async (req, res) => { ... });

// Admin only
router.get('/admin-only', adminOnly, async (req, res) => { ... });

// Optional auth (works with or without token)
router.get('/optional', optionalAuth, async (req, res) => {
  if (req.user) {
    // Authenticated
  } else {
    // Anonymous
  }
});
```

### Error Handling

```javascript
// Automatic error wrapping
router.get('/example', asyncHandler(async (req, res) => {
  // Errors automatically caught and formatted
  const result = await someAsyncOperation();
  res.json(result);
}));

// Manual error responses
router.get('/example', async (req, res) => {
  if (!something) {
    return res.status(404).json({ error: 'Not found' });
  }
  
  if (!authorized) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  
  // Validation errors
  return res.status(400).json({ 
    error: 'Validation failed',
    details: { field: 'Error message' }
  });
});
```

---

## Portal Development

### Adding a New Page

1. **Create page component** in `portal/src/pages/`:

```jsx
// portal/src/pages/NewPage.jsx
import { useState, useEffect } from 'react';
import { exampleApi } from '../lib/api';

export default function NewPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const result = await exampleApi.list();
      setData(result.examples);
    } catch (error) {
      console.error('Failed to load:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">New Page</h1>
      {/* Content */}
    </div>
  );
}
```

2. **Add route** in `portal/src/App.jsx`:

```jsx
import NewPage from './pages/NewPage';

// In Routes:
<Route path="/new-page" element={<NewPage />} />
```

3. **Add navigation** in `portal/src/components/Layout.jsx`:

```jsx
const navigation = [
  // ...
  { name: 'New Page', href: '/new-page', icon: IconComponent },
];
```

### API Client Pattern

```javascript
// portal/src/lib/api.js

export const exampleApi = {
  list: () => request('GET', '/example'),
  get: (id) => request('GET', `/example/${id}`),
  create: (data) => request('POST', '/example', data),
  update: (id, data) => request('PATCH', `/example/${id}`, data),
  delete: (id) => request('DELETE', `/example/${id}`),
};
```

---

## Mobile Development

### Running on Device

```bash
# Start Expo
cd mobile && npx expo start

# Options:
# Press 'i' for iOS simulator
# Press 'a' for Android emulator
# Scan QR with Expo Go app for physical device
```

### Adding a New Screen

1. **Create screen** in `mobile/src/screens/`:

```tsx
// mobile/src/screens/NewScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { colors, typography, spacing } from '../theme';
import { api } from '../services/api';

export const NewScreen = ({ navigation }: any) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const result = await api.getExample();
      setData(result.examples);
    } catch (error) {
      console.error('Failed to load:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>New Screen</Text>
      {/* Content */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
    padding: spacing.lg,
  },
  title: {
    ...typography.h1,
    color: colors.slate900,
  },
});
```

2. **Add to navigation** in `mobile/src/navigation/AppNavigation.tsx`:

```tsx
import { NewScreen } from '../screens/NewScreen';

// In Stack.Navigator:
<Stack.Screen name="NewScreen" component={NewScreen} />
```

### Offline Support

```tsx
// Using offline hooks
import { useOffline, useOfflineSchedule } from '../hooks/useOffline';

const MyScreen = () => {
  const { isOnline, queueLength, sync } = useOffline();
  const { data, loading, fromCache, refresh } = useOfflineSchedule('2024-01-01', '2024-01-07');

  return (
    <View>
      {!isOnline && <OfflineBanner />}
      {fromCache && <Text>Showing cached data</Text>}
      {/* Content */}
    </View>
  );
};
```

---

## Testing

### Running Tests

```bash
# All tests
pnpm test

# Watch mode
pnpm test -- --watch

# Coverage
pnpm test -- --coverage

# Specific file
pnpm test -- tests/auth.test.js
```

### Writing Tests

```javascript
// tests/example.test.js
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/index.js';

describe('Example API', () => {
  let authToken;

  beforeAll(async () => {
    // Login to get token
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'password' });
    authToken = res.body.token;
  });

  it('should list examples', async () => {
    const res = await request(app)
      .get('/api/example')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.examples).toBeDefined();
    expect(Array.isArray(res.body.examples)).toBe(true);
  });

  it('should create example', async () => {
    const res = await request(app)
      .post('/api/example')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: 'Test', value: 100 });

    expect(res.status).toBe(201);
    expect(res.body.example.name).toBe('Test');
  });
});
```

---

## Code Style

### ESLint Configuration

```json
{
  "extends": ["eslint:recommended"],
  "env": {
    "node": true,
    "es2022": true
  },
  "parserOptions": {
    "ecmaVersion": 2022,
    "sourceType": "module"
  },
  "rules": {
    "no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
    "no-console": ["warn", { "allow": ["warn", "error"] }]
  }
}
```

### Prettier Configuration

```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100
}
```

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Files | kebab-case | `shift-templates.js` |
| Components | PascalCase | `ShiftCard.jsx` |
| Functions | camelCase | `getActiveShifts()` |
| Constants | SCREAMING_SNAKE | `MAX_RETRY_COUNT` |
| Database | snake_case | `employee_skills` |
| API endpoints | kebab-case | `/shift-templates` |

---

## Debugging

### VS Code Launch Configuration

```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug API",
      "program": "${workspaceFolder}/src/index.js",
      "runtimeArgs": ["--experimental-vm-modules"],
      "envFile": "${workspaceFolder}/.env"
    }
  ]
}
```

### Common Issues

**Port already in use:**
```bash
lsof -i :3000
kill -9 <PID>
```

**Database connection failed:**
```bash
# Check PostgreSQL is running
pg_isready

# Check connection string
psql $DATABASE_URL
```

**Module not found:**
```bash
# Clear and reinstall
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

---

## Git Workflow

### Branch Naming

```
feature/add-shift-templates
bugfix/clock-in-timezone
hotfix/security-patch
chore/update-dependencies
```

### Commit Messages

```
feat: add shift template functionality
fix: correct timezone handling in clock-in
docs: update API documentation
refactor: simplify auth middleware
test: add tests for billing service
chore: upgrade dependencies
```

### Pull Request Process

1. Create feature branch from `main`
2. Make changes with descriptive commits
3. Push and create PR
4. Request review from team member
5. Address feedback
6. Merge when approved and CI passes

---

## Getting Help

- **Documentation:** This folder and inline code comments
- **Team Chat:** #uplift-dev on Slack
- **Issues:** GitHub Issues
- **Architecture Questions:** Ask Diogo
