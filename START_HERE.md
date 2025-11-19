# 🚀 START HERE - Quick Setup Guide

## ⚠️ IMPORTANT: First Time Setup

Your app has been refactored. Follow these steps to start using the new architecture:

## Step 1: Stop Any Running Instances

```bash
# Kill any running Electron processes
pkill -f electron
```

Or manually close all Electron windows.

## Step 2: Clean Build Artifacts

```bash
# Remove cached builds
rm -rf .vite
rm -rf out
```

Or use the provided script:
```bash
./restart-app.sh
```

## Step 3: Start the Application

```bash
npm start
```

## ✅ Verification

When the app starts, check the **terminal console** for:

```
✓ Built in XXXms
Database initialized
Services initialized
IPC handlers registered
```

If you see these messages, everything is working! ✅

## ❌ If You Get Errors

### Error: "Cannot read properties of undefined"

This means the app is still using old code. Follow these steps:

1. **Stop the app completely**
   ```bash
   pkill -f electron
   ```

2. **Clean everything**
   ```bash
   rm -rf .vite
   rm -rf out
   ```

3. **Verify configuration**
   ```bash
   grep "entry:" forge.config.ts
   ```
   Should show: `entry: 'src/backend/main.ts',`

4. **Restart**
   ```bash
   npm start
   ```

### Error: "Module not found"

Run:
```bash
npm install
npm run rebuild
npm start
```

### Still Having Issues?

See `TROUBLESHOOTING.md` for detailed solutions.

## 📖 Next Steps

Once the app is running:

1. **Test all features** - Use `TESTING_CHECKLIST.md`
2. **Read documentation** - Start with `REFACTORING_COMPLETE.md`
3. **Understand architecture** - Read `ARCHITECTURE.md`
4. **Quick reference** - Use `QUICK_REFERENCE.md` while coding

## 🎯 Quick Test

Once the app is running, open DevTools (F12) and run:

```javascript
// Test IPC communication
console.log('electronAPI:', window.electronAPI);
console.log('Methods:', Object.keys(window.electronAPI));

// Should show all 7 methods:
// checkActivation, validateActivationCode, savePanCredentials,
// getPanCredentials, getPanWithPassword, fetchUserProfile, getUserData
```

If you see all methods, you're good to go! ✅

## 📁 New File Structure

```
src/
├── backend/          # Main Process (Node.js)
│   ├── controllers/  # IPC handlers
│   ├── services/     # Business logic
│   ├── database/     # Data access
│   └── main.ts       # Entry point
├── frontend/         # Renderer Process (React)
│   └── services/     # API wrapper
└── shared/           # Shared code
    ├── types/        # TypeScript interfaces
    └── constants/    # Constants
```

## 🔄 What Changed?

- ✅ **Backend** - Organized into layers (controllers, services, repositories)
- ✅ **Frontend** - Clean API service for IPC calls
- ✅ **Shared** - Common types and constants
- ✅ **Documentation** - Comprehensive guides

## 💡 Using the New Architecture

### In Your Components (Recommended)

```typescript
import electronApiService from '../frontend/services/electron-api.service';

// Use the service
const userData = await electronApiService.getUserData(pan);
```

### Old Way (Still Works)

```typescript
// Direct IPC calls still work
const userData = await window.electronAPI.getUserData(pan);
```

## 🛠️ Common Commands

```bash
# Start development
npm start

# Build for production
npm run make

# Clear database
npm run clear-db

# Clear cache
npm run clear-cache

# Restart app (clean)
./restart-app.sh && npm start
```

## 📚 Documentation Files

| File | Purpose |
|------|---------|
| **START_HERE.md** | This file - Quick start |
| **REFACTORING_COMPLETE.md** | Overview of changes |
| **ARCHITECTURE.md** | Architecture details |
| **STRUCTURE.md** | Visual diagrams |
| **MIGRATION_GUIDE.md** | Migration steps |
| **QUICK_REFERENCE.md** | Developer reference |
| **TESTING_CHECKLIST.md** | Testing guide |
| **TROUBLESHOOTING.md** | Fix common issues |

## ✨ Benefits

- ✅ **Maintainable** - Clear structure, easy to find code
- ✅ **Scalable** - Easy to add new features
- ✅ **Testable** - Each layer can be tested independently
- ✅ **Type-Safe** - Shared types prevent errors
- ✅ **Professional** - Industry-standard architecture

## 🎊 Ready!

Your refactored codebase is ready. Start with:

```bash
npm start
```

Then explore the documentation and new structure.

---

**Need Help?** Check `TROUBLESHOOTING.md` or review the documentation files.

**Happy Coding! 🚀**
