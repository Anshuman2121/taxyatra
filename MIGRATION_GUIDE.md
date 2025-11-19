# Migration Guide

## Overview

Your codebase has been refactored to follow industry-standard architecture patterns with clear separation between:
- **Backend** (Main Process)
- **Frontend** (Renderer Process)  
- **Shared** (Common code)

## What Changed

### File Structure

**Old:**
```
src/
├── main.ts (everything mixed together)
├── database/
├── services/
└── components/
```

**New:**
```
src/
├── backend/          # Main process
│   ├── controllers/  # IPC handlers
│   ├── services/     # Business logic
│   ├── database/     # Data layer
│   └── config/       # Configuration
├── frontend/         # Renderer process
│   └── services/     # Frontend API wrapper
└── shared/           # Shared types & constants
```

## Step-by-Step Migration

### Step 1: Update Component Imports (Optional)

If you want to use the new service layer in your components:

**Old way:**
```typescript
const userData = await window.electronAPI.getUserData(pan);
```

**New way (recommended):**
```typescript
import electronApiService from '../frontend/services/electron-api.service';

const userData = await electronApiService.getUserData(pan);
```

### Step 2: Move Components to Frontend (Optional)

You can optionally move your components:

```bash
# Move components to frontend folder
mv src/components src/frontend/components
```

Then update imports in `App.tsx`:
```typescript
// Old
import { HomePage } from './components/HomePage';

// New
import { HomePage } from './frontend/components/HomePage';
```

### Step 3: Test the Application

```bash
npm start
```

## Key Files to Know

### Backend Entry Point
- `src/backend/main.ts` - Main process entry (replaces old `src/main.ts`)

### Controllers (IPC Handlers)
- `src/backend/controllers/auth.controller.ts` - Authentication
- `src/backend/controllers/user.controller.ts` - User operations

### Services (Business Logic)
- `src/backend/services/auth.service.ts`
- `src/backend/services/user.service.ts`
- `src/backend/services/itr-api.service.ts`
- `src/backend/services/puppeteer.service.ts`

### Repositories (Database)
- `src/backend/database/repositories/auth.repository.ts`
- `src/backend/database/repositories/user.repository.ts`

### Frontend Service
- `src/frontend/services/electron-api.service.ts` - Use this in components

### Shared
- `src/shared/types/index.ts` - TypeScript interfaces
- `src/shared/constants/index.ts` - IPC channels, URLs, config

## What Still Works

- All existing functionality remains the same
- `window.electronAPI` still works in components
- All IPC channels work exactly as before
- Database operations work the same
- Your existing components don't need changes

## Benefits of New Structure

1. **Clear Separation**: Backend, Frontend, and Shared code are separated
2. **Maintainable**: Easy to find and modify code
3. **Testable**: Each layer can be tested independently
4. **Scalable**: Easy to add new features
5. **Type-Safe**: Shared types prevent errors

## Adding New Features

### Example: Add a new API endpoint

1. **Add type** (if needed):
```typescript
// src/shared/types/index.ts
export interface NewFeature {
  id: string;
  name: string;
}
```

2. **Add IPC channel**:
```typescript
// src/shared/constants/index.ts
export const IPC_CHANNELS = {
  // ... existing
  GET_NEW_FEATURE: 'get-new-feature'
};
```

3. **Add repository method**:
```typescript
// src/backend/database/repositories/feature.repository.ts
async getFeature(id: string): Promise<NewFeature | null> {
  return this.getOne<NewFeature>('SELECT * FROM features WHERE id = ?', [id]);
}
```

4. **Add service method**:
```typescript
// src/backend/services/feature.service.ts
async getFeature(id: string) {
  return this.featureRepository.getFeature(id);
}
```

5. **Add controller handler**:
```typescript
// src/backend/controllers/feature.controller.ts
ipcMain.handle(IPC_CHANNELS.GET_NEW_FEATURE, async (_, id: string) => {
  return featureService.getFeature(id);
});
```

6. **Add frontend service method**:
```typescript
// src/frontend/services/electron-api.service.ts
async getNewFeature(id: string): Promise<NewFeature | null> {
  return this.api.getNewFeature(id);
}
```

7. **Use in component**:
```typescript
import electronApiService from '../services/electron-api.service';

const feature = await electronApiService.getNewFeature(id);
```

## Troubleshooting

### Build Errors

If you get build errors, ensure:
1. `forge.config.ts` points to `src/backend/main.ts`
2. All imports are correct
3. Run `npm install` to ensure dependencies

### Runtime Errors

If the app doesn't start:
1. Check console for errors
2. Verify database initialization
3. Check IPC channel names match

### Import Errors

If you get "Cannot find module":
1. Check file paths in imports
2. Ensure TypeScript paths are correct
3. Restart your IDE/editor

## Rollback (If Needed)

If you need to rollback:
1. The old `src/main.ts` is still there
2. Update `forge.config.ts` to point back to `src/main.ts`
3. The new files don't interfere with old code

## Next Steps

1. Test all existing functionality
2. Gradually migrate components to use `electron-api.service.ts`
3. Add new features using the new architecture
4. Consider adding tests for each layer

## Questions?

Refer to `ARCHITECTURE.md` for detailed architecture documentation.
