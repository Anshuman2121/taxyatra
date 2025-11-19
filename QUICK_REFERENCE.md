# Quick Reference Card

## 📁 Where to Find Things

| What | Where |
|------|-------|
| IPC Handlers | `src/backend/controllers/` |
| Business Logic | `src/backend/services/` |
| Database Queries | `src/backend/database/repositories/` |
| API Calls | `src/backend/services/itr-api.service.ts` |
| Types | `src/shared/types/index.ts` |
| Constants | `src/shared/constants/index.ts` |
| Frontend API | `src/frontend/services/electron-api.service.ts` |
| Components | `src/components/` |

## 🔄 Data Flow

```
Component → Frontend Service → IPC → Controller → Service → Repository → Database
```

## 📝 Common Tasks

### Add New IPC Channel

1. Add to `shared/constants/index.ts`:
```typescript
export const IPC_CHANNELS = {
  MY_NEW_CHANNEL: 'my-new-channel'
};
```

2. Add handler in controller:
```typescript
ipcMain.handle(IPC_CHANNELS.MY_NEW_CHANNEL, async (_, param) => {
  return myService.myMethod(param);
});
```

3. Add to preload.ts:
```typescript
myNewChannel: (param) => ipcRenderer.invoke('my-new-channel', param)
```

4. Add to frontend service:
```typescript
async myNewChannel(param: string) {
  return this.api.myNewChannel(param);
}
```

### Add Database Query

In repository:
```typescript
async getById(id: string): Promise<MyType | null> {
  return this.getOne<MyType>('SELECT * FROM table WHERE id = ?', [id]);
}
```

### Add Business Logic

In service:
```typescript
async processData(input: string) {
  // Validate
  if (!input) throw new Error('Invalid input');
  
  // Get data
  const data = await this.repository.getData(input);
  
  // Process
  const result = this.transform(data);
  
  // Save
  await this.repository.save(result);
  
  return result;
}
```

### Use in Component

```typescript
import electronApiService from '../frontend/services/electron-api.service';

const MyComponent = () => {
  const fetchData = async () => {
    const data = await electronApiService.getUserData(pan);
    console.log(data);
  };
  
  return <button onClick={fetchData}>Fetch</button>;
};
```

## 🏗️ Layer Rules

| Layer | Can Call | Cannot Call |
|-------|----------|-------------|
| Controller | Service | Repository, Database |
| Service | Repository, External API | Controller |
| Repository | Database | Service, Controller |

## 📦 Import Patterns

```typescript
// Backend
import { getDatabase } from '../database/connection';
import authService from '../services/auth.service';
import { AuthRepository } from '../database/repositories/auth.repository';

// Frontend
import electronApiService from '../services/electron-api.service';

// Shared
import { User, BankAccount } from '../../shared/types';
import { IPC_CHANNELS, API_BASE_URL } from '../../shared/constants';
```

## 🎯 Key Files

| File | Purpose |
|------|---------|
| `backend/main.ts` | App initialization |
| `backend/controllers/auth.controller.ts` | Auth IPC handlers |
| `backend/controllers/user.controller.ts` | User IPC handlers |
| `backend/services/auth.service.ts` | Auth business logic |
| `backend/services/user.service.ts` | User business logic |
| `backend/services/itr-api.service.ts` | External API calls |
| `backend/services/puppeteer.service.ts` | Browser automation |
| `preload.ts` | IPC bridge |

## 🚀 Commands

```bash
# Development
npm start

# Build
npm run make

# Clear database
npm run clear-db

# Clear cache
npm run clear-cache
```

## 🔍 Debugging

### Check IPC Channel
```typescript
console.log('IPC Channel:', IPC_CHANNELS.GET_USER_DATA);
```

### Check Service
```typescript
console.log('Service result:', await userService.getUserData(pan));
```

### Check Repository
```typescript
const user = await userRepository.getUserByPan(pan);
console.log('DB result:', user);
```

## 📚 Documentation

- **ARCHITECTURE.md** - Full architecture details
- **STRUCTURE.md** - Visual diagrams
- **MIGRATION_GUIDE.md** - Migration steps
- **REFACTORING_SUMMARY.md** - What changed

## 💡 Tips

1. Always use shared types
2. Use constants for IPC channels
3. Keep controllers thin
4. Put business logic in services
5. Keep repositories focused on data access
6. Handle errors at each layer
7. Use async/await consistently

## ⚠️ Common Mistakes

❌ Accessing database directly from controller
✅ Use service → repository → database

❌ Business logic in repository
✅ Put business logic in service

❌ Hardcoded IPC channel names
✅ Use IPC_CHANNELS constants

❌ Direct window.electronAPI in multiple places
✅ Use electron-api.service.ts

## 🎨 Code Style

```typescript
// Service method
async getUserData(pan: string) {
  const repo = this.ensureRepository();
  const [user, accounts] = await Promise.all([
    repo.getUserByPan(pan),
    repo.getBankAccountsByPan(pan)
  ]);
  return { user, accounts };
}

// Repository method
async getUserByPan(pan: string): Promise<User | null> {
  return this.getOne<User>(
    'SELECT * FROM users WHERE pan = ?',
    [pan]
  );
}

// Controller handler
ipcMain.handle(IPC_CHANNELS.GET_USER_DATA, async (_, pan: string) => {
  try {
    const data = await userService.getUserData(pan);
    return { success: true, data };
  } catch (error) {
    console.error('Error:', error);
    return { success: false, message: error.message };
  }
});
```

---

**Keep this handy while developing! 📌**
