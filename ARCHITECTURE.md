# TaxYatra - Refactored Architecture

## Project Structure

```
src/
├── backend/                    # Main Process (Node.js)
│   ├── controllers/           # IPC Handlers
│   │   ├── auth.controller.ts
│   │   └── user.controller.ts
│   ├── services/              # Business Logic
│   │   ├── auth.service.ts
│   │   ├── user.service.ts
│   │   ├── itr-api.service.ts
│   │   └── puppeteer.service.ts
│   ├── database/              # Database Layer
│   │   ├── repositories/      # Data Access Layer
│   │   │   ├── base.repository.ts
│   │   │   ├── auth.repository.ts
│   │   │   └── user.repository.ts
│   │   ├── connection.ts      # DB Connection Management
│   │   └── encryption.ts      # DB Encryption
│   ├── config/                # Configuration
│   │   └── database.config.ts
│   └── main.ts                # Main Process Entry Point
│
├── frontend/                   # Renderer Process (React)
│   ├── components/            # React Components (existing)
│   └── services/              # Frontend Services
│       └── electron-api.service.ts
│
├── shared/                     # Shared Code
│   ├── types/                 # TypeScript Interfaces
│   │   └── index.ts
│   └── constants/             # Constants & Config
│       └── index.ts
│
├── preload.ts                 # Preload Script
└── renderer.ts                # Renderer Entry Point
```

## Architecture Layers

### 1. Backend (Main Process)

#### Controllers
- Handle IPC communication
- Validate input
- Call appropriate services
- Return responses to renderer

**Files:**
- `auth.controller.ts` - Authentication & activation handlers
- `user.controller.ts` - User profile & data handlers

#### Services
- Business logic layer
- Orchestrate operations
- Call repositories and external APIs
- Handle errors

**Files:**
- `auth.service.ts` - Authentication logic
- `user.service.ts` - User data management
- `itr-api.service.ts` - ITR portal API calls
- `puppeteer.service.ts` - Browser automation

#### Database Layer

**Repositories:**
- Data access layer
- CRUD operations
- SQL queries
- Type-safe database operations

**Files:**
- `base.repository.ts` - Base class with common DB operations
- `auth.repository.ts` - Authentication data access
- `user.repository.ts` - User data access

**Connection:**
- `connection.ts` - Database initialization & connection management
- `encryption.ts` - Database encryption/decryption

#### Config
- `database.config.ts` - Database paths and configuration

### 2. Frontend (Renderer Process)

#### Services
- `electron-api.service.ts` - Wrapper for IPC calls to backend

#### Components
- Existing React components remain in `src/components/`
- Use `electron-api.service.ts` instead of direct `window.electronAPI` calls

### 3. Shared

#### Types
- TypeScript interfaces shared between frontend and backend
- User, BankAccount, Jurisdiction, LoginResponse, etc.

#### Constants
- IPC channel names
- API URLs
- Database configuration
- Shared across frontend and backend

## Data Flow

### Example: Fetching User Data

```
Frontend Component
    ↓
electron-api.service.ts (Frontend Service)
    ↓
IPC Channel
    ↓
user.controller.ts (Backend Controller)
    ↓
user.service.ts (Backend Service)
    ↓
user.repository.ts (Database Repository)
    ↓
SQLite Database
```

### Example: External API Call

```
Frontend Component
    ↓
electron-api.service.ts
    ↓
IPC Channel
    ↓
user.controller.ts
    ↓
user.service.ts
    ↓
itr-api.service.ts (External API)
    ↓
ITR Portal API
```

## Key Benefits

1. **Separation of Concerns**
   - Controllers handle IPC
   - Services handle business logic
   - Repositories handle data access

2. **Maintainability**
   - Clear structure
   - Easy to locate code
   - Single responsibility principle

3. **Testability**
   - Each layer can be tested independently
   - Mock dependencies easily

4. **Scalability**
   - Easy to add new features
   - Modular architecture

5. **Type Safety**
   - Shared types between frontend and backend
   - Compile-time error checking

## Migration Guide

### Old Code
```typescript
// In main.ts
ipcMain.handle('get-user-data', async (_, pan: string) => {
  const db = getDatabase();
  // Direct database query
});
```

### New Code
```typescript
// In user.controller.ts
ipcMain.handle(IPC_CHANNELS.GET_USER_DATA, async (_, pan: string) => {
  return userService.getUserData(pan);
});

// In user.service.ts
async getUserData(pan: string) {
  return this.userRepository.getUserByPan(pan);
}

// In user.repository.ts
async getUserByPan(pan: string): Promise<User | null> {
  return this.getOne<User>('SELECT * FROM users WHERE pan = ?', [pan]);
}
```

## Usage Examples

### Frontend Component
```typescript
import electronApiService from '../services/electron-api.service';

// In your component
const userData = await electronApiService.getUserData(pan);
```

### Adding New Feature

1. **Add type** in `shared/types/index.ts`
2. **Add IPC channel** in `shared/constants/index.ts`
3. **Create repository method** in appropriate repository
4. **Create service method** using repository
5. **Create controller handler** using service
6. **Add frontend service method** in `electron-api.service.ts`
7. **Use in component**

## Best Practices

1. **Never access database directly from controllers**
2. **Use repositories for all database operations**
3. **Keep business logic in services**
4. **Use shared types for type safety**
5. **Use constants for IPC channel names**
6. **Handle errors at each layer appropriately**
7. **Keep controllers thin - delegate to services**
