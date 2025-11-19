# TaxYatra - Project Structure

## Directory Tree

```
taxyatra/
│
├── src/
│   │
│   ├── backend/                          # MAIN PROCESS (Node.js)
│   │   │
│   │   ├── controllers/                  # IPC Request Handlers
│   │   │   ├── auth.controller.ts        # → Activation, PAN credentials
│   │   │   └── user.controller.ts        # → User profile, data fetching
│   │   │
│   │   ├── services/                     # Business Logic Layer
│   │   │   ├── auth.service.ts           # → Authentication logic
│   │   │   ├── user.service.ts           # → User data orchestration
│   │   │   ├── itr-api.service.ts        # → ITR Portal API calls
│   │   │   └── puppeteer.service.ts      # → Browser automation
│   │   │
│   │   ├── database/                     # Data Access Layer
│   │   │   ├── repositories/             # Database Operations
│   │   │   │   ├── base.repository.ts    # → Common DB methods
│   │   │   │   ├── auth.repository.ts    # → Auth data access
│   │   │   │   └── user.repository.ts    # → User data access
│   │   │   ├── connection.ts             # → DB init/close
│   │   │   └── encryption.ts             # → DB encryption
│   │   │
│   │   ├── config/                       # Configuration
│   │   │   └── database.config.ts        # → DB paths
│   │   │
│   │   ├── main.ts                       # ⭐ Main Process Entry
│   │   └── index.ts                      # Exports
│   │
│   ├── frontend/                         # RENDERER PROCESS (React)
│   │   └── services/
│   │       └── electron-api.service.ts   # → IPC wrapper for components
│   │
│   ├── shared/                           # SHARED CODE
│   │   ├── types/
│   │   │   └── index.ts                  # → TypeScript interfaces
│   │   ├── constants/
│   │   │   └── index.ts                  # → IPC channels, URLs
│   │   └── index.ts                      # Exports
│   │
│   ├── components/                       # React Components (existing)
│   │   ├── ui/
│   │   ├── ActivationPage.tsx
│   │   ├── HomePage.tsx
│   │   └── ...
│   │
│   ├── preload.ts                        # Preload Script (IPC bridge)
│   ├── renderer.ts                       # Renderer Entry
│   └── App.tsx                           # React Root
│
├── ARCHITECTURE.md                       # Architecture documentation
├── MIGRATION_GUIDE.md                    # Migration instructions
├── STRUCTURE.md                          # This file
└── README.md                             # Setup instructions
```

## Layer Responsibilities

### 🔷 Controllers Layer
**Purpose:** Handle IPC communication
- Receive requests from renderer process
- Validate input parameters
- Call appropriate service methods
- Return responses

**Example:**
```typescript
ipcMain.handle('get-user-data', async (_, pan: string) => {
  return userService.getUserData(pan);
});
```

### 🔷 Services Layer
**Purpose:** Business logic and orchestration
- Implement business rules
- Coordinate between repositories and external APIs
- Handle complex operations
- Error handling and logging

**Example:**
```typescript
async getUserData(pan: string) {
  const user = await this.userRepository.getUserByPan(pan);
  const bankAccounts = await this.userRepository.getBankAccountsByPan(pan);
  return { user, bankAccounts };
}
```

### 🔷 Repository Layer
**Purpose:** Data access
- Execute SQL queries
- CRUD operations
- Type-safe database operations
- No business logic

**Example:**
```typescript
async getUserByPan(pan: string): Promise<User | null> {
  return this.getOne<User>('SELECT * FROM users WHERE pan = ?', [pan]);
}
```

### 🔷 Frontend Service Layer
**Purpose:** Abstract IPC calls
- Wrapper around window.electronAPI
- Type-safe method calls
- Centralized API access

**Example:**
```typescript
async getUserData(pan: string) {
  return this.api.getUserData(pan);
}
```

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     RENDERER PROCESS                         │
│                                                              │
│  ┌──────────────┐                                           │
│  │   React      │                                           │
│  │  Component   │                                           │
│  └──────┬───────┘                                           │
│         │                                                    │
│         ↓                                                    │
│  ┌──────────────────────┐                                   │
│  │ electron-api.service │  (Frontend Service)               │
│  └──────────┬───────────┘                                   │
│             │                                                │
└─────────────┼────────────────────────────────────────────────┘
              │
              │ IPC Channel
              │
┌─────────────┼────────────────────────────────────────────────┐
│             ↓                                                 │
│      ┌─────────────┐                                         │
│      │ Controller  │  (IPC Handler)                          │
│      └──────┬──────┘                                         │
│             │                                                 │
│             ↓                                                 │
│      ┌─────────────┐                                         │
│      │   Service   │  (Business Logic)                       │
│      └──────┬──────┘                                         │
│             │                                                 │
│        ┌────┴────┐                                           │
│        ↓         ↓                                            │
│  ┌──────────┐  ┌──────────┐                                 │
│  │Repository│  │ External │                                  │
│  │          │  │   API    │                                  │
│  └────┬─────┘  └──────────┘                                 │
│       │                                                       │
│       ↓                                                       │
│  ┌──────────┐                                                │
│  │ Database │                                                │
│  └──────────┘                                                │
│                                                               │
│                     MAIN PROCESS                             │
└───────────────────────────────────────────────────────────────┘
```

## File Relationships

```
main.ts
  ├─→ initDatabase()
  ├─→ authService.initialize()
  ├─→ userService.initialize()
  ├─→ registerAuthHandlers()
  └─→ registerUserHandlers()

auth.controller.ts
  └─→ authService
        └─→ authRepository
              └─→ database

user.controller.ts
  ├─→ userService
  │     ├─→ userRepository
  │     │     └─→ database
  │     └─→ itrApiService
  │           └─→ External API
  └─→ puppeteerService
        └─→ Browser Automation
```

## Module Dependencies

```
Controllers
    ↓ depends on
Services
    ↓ depends on
Repositories / External APIs
    ↓ depends on
Database / HTTP
```

**Rule:** Higher layers can depend on lower layers, but not vice versa.

## Quick Reference

| Layer | Location | Purpose | Depends On |
|-------|----------|---------|------------|
| **Controllers** | `backend/controllers/` | IPC handlers | Services |
| **Services** | `backend/services/` | Business logic | Repositories, APIs |
| **Repositories** | `backend/database/repositories/` | Data access | Database |
| **Frontend Services** | `frontend/services/` | IPC wrapper | window.electronAPI |
| **Shared** | `shared/` | Types & constants | Nothing |

## Communication Flow

1. **User Action** → React Component
2. **Component** → Frontend Service (electron-api.service)
3. **Frontend Service** → IPC Channel
4. **IPC Channel** → Backend Controller
5. **Controller** → Backend Service
6. **Service** → Repository or External API
7. **Repository** → Database
8. **Response flows back** through the same chain

## Key Principles

✅ **Single Responsibility**: Each file has one clear purpose
✅ **Separation of Concerns**: UI, logic, and data are separated
✅ **Dependency Injection**: Services receive dependencies
✅ **Type Safety**: Shared types across layers
✅ **Testability**: Each layer can be tested independently
✅ **Maintainability**: Easy to locate and modify code
