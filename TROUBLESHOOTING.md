# Troubleshooting Guide

## Error: "Cannot read properties of undefined (reading 'fetchUserProfile')"

This error means the IPC handlers are not registered. Here's how to fix it:

### Solution 1: Restart the Application

The app is likely still running with the old code. 

1. **Stop the application completely**
   - Close all Electron windows
   - In terminal, press `Ctrl+C` to stop the dev server
   - Kill any remaining processes:
     ```bash
     pkill -f electron
     ```

2. **Clear any cached builds**
   ```bash
   rm -rf .vite
   rm -rf out
   ```

3. **Restart the application**
   ```bash
   npm start
   ```

### Solution 2: Verify Configuration

Check that `forge.config.ts` is using the new main file:

```typescript
// Should be:
entry: 'src/backend/main.ts',

// NOT:
entry: 'src/main.ts',
```

### Solution 3: Check Console Logs

When the app starts, you should see:
- "Database initialized"
- "Services initialized"
- No errors about missing handlers

If you see errors, check:
1. All files in `src/backend/` exist
2. No TypeScript compilation errors
3. All imports are correct

### Solution 4: Verify IPC Handlers are Registered

Add this to `src/backend/main.ts` after registering handlers:

```typescript
// After registerAuthHandlers() and registerUserHandlers()
console.log('✅ All IPC handlers registered');
```

### Solution 5: Test IPC Communication

In your browser console (DevTools), run:

```javascript
// Test if electronAPI exists
console.log('electronAPI:', window.electronAPI);

// Test each method
console.log('Methods:', Object.keys(window.electronAPI));

// Should show:
// ['checkActivation', 'validateActivationCode', 'savePanCredentials', 
//  'getPanCredentials', 'getPanWithPassword', 'fetchUserProfile', 'getUserData']
```

### Solution 6: Rebuild Everything

If nothing works, do a clean rebuild:

```bash
# Stop the app
pkill -f electron

# Clean everything
rm -rf node_modules
rm -rf .vite
rm -rf out
rm package-lock.json

# Reinstall
npm install

# Rebuild native modules
npm run rebuild

# Start fresh
npm start
```

## Common Issues

### Issue: "Module not found"

**Cause:** Import paths are incorrect

**Fix:** Check all imports in the new backend files:
```typescript
// Correct imports
import { getDatabase } from '../database/connection';
import authService from '../services/auth.service';
import { IPC_CHANNELS } from '../../shared/constants';
```

### Issue: "Database not initialized"

**Cause:** Database initialization failed

**Fix:** Check console for database errors. Ensure:
1. Write permissions to userData folder
2. No corrupted database files
3. Encryption/decryption works

### Issue: "Service not initialized"

**Cause:** Services didn't initialize properly

**Fix:** Check that `main.ts` calls:
```typescript
await authService.initialize();
await userService.initialize();
```

### Issue: Build fails

**Cause:** TypeScript compilation errors

**Fix:**
1. Check for TypeScript errors: `npx tsc --noEmit`
2. Fix any type errors
3. Ensure all imports are correct

## Verification Steps

### 1. Check File Structure
```bash
ls -la src/backend/
ls -la src/backend/controllers/
ls -la src/backend/services/
ls -la src/backend/database/repositories/
```

All files should exist.

### 2. Check forge.config.ts
```bash
grep "entry:" forge.config.ts
```

Should show: `entry: 'src/backend/main.ts',`

### 3. Check for Running Processes
```bash
ps aux | grep electron
```

Kill any old processes.

### 4. Check Console Output

When starting, you should see:
```
✓ Built in XXXms
✓ Database initialized
✓ Services initialized
✓ IPC handlers registered
```

## Quick Fix Script

Run this to fix most issues:

```bash
#!/bin/bash

echo "🔧 Fixing TaxYatra..."

# Stop all electron processes
echo "Stopping Electron..."
pkill -f electron

# Clean build artifacts
echo "Cleaning build artifacts..."
rm -rf .vite
rm -rf out

# Verify configuration
echo "Checking configuration..."
if grep -q "src/backend/main.ts" forge.config.ts; then
    echo "✅ Configuration correct"
else
    echo "❌ Configuration incorrect - update forge.config.ts"
    exit 1
fi

# Start the app
echo "Starting application..."
npm start
```

Save as `fix.sh`, make executable with `chmod +x fix.sh`, and run with `./fix.sh`

## Still Not Working?

### Option 1: Use Old Main (Temporary Rollback)

Update `forge.config.ts`:
```typescript
entry: 'src/main.ts',  // Use old main temporarily
```

Then restart: `npm start`

### Option 2: Check Specific Files

Verify these files exist and have no errors:
- `src/backend/main.ts`
- `src/backend/controllers/auth.controller.ts`
- `src/backend/controllers/user.controller.ts`
- `src/backend/services/auth.service.ts`
- `src/backend/services/user.service.ts`
- `src/backend/services/puppeteer.service.ts`
- `src/shared/constants/index.ts`

### Option 3: Manual Verification

Add console.logs to verify execution:

In `src/backend/main.ts`:
```typescript
console.log('🚀 Starting backend main...');

app.on('ready', async () => {
  console.log('📱 App ready event');
  try {
    console.log('💾 Initializing database...');
    await initDatabase();
    console.log('✅ Database initialized');
    
    console.log('🔐 Initializing auth service...');
    await authService.initialize();
    console.log('✅ Auth service initialized');
    
    console.log('👤 Initializing user service...');
    await userService.initialize();
    console.log('✅ User service initialized');
    
    console.log('📡 Registering IPC handlers...');
    registerAuthHandlers();
    registerUserHandlers();
    console.log('✅ IPC handlers registered');
    
    console.log('🪟 Creating window...');
    createWindow();
    console.log('✅ Window created');
  } catch (error) {
    console.error('❌ Failed to initialize:', error);
  }
});
```

## Contact Points

If you're still stuck:
1. Check all console logs (both terminal and browser DevTools)
2. Verify file structure matches documentation
3. Ensure no TypeScript compilation errors
4. Try the clean rebuild (Solution 6)

## Prevention

To avoid this in the future:
1. Always stop the app before making changes
2. Clear build cache when changing main files
3. Verify configuration after updates
4. Check console logs on startup
