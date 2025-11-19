# Quick Fix Guide

## ✅ Database Issue - FIXED!

The corrupted database has been removed. You're ready to start fresh.

## 🚀 Start the Application

```bash
npm start
```

The app will create a fresh database on first run.

---

## What Was Fixed

1. ✅ Stopped all Electron processes
2. ✅ Removed corrupted database files:
   - `taxyatra.db`
   - `taxyatra.enc`
3. ✅ Cleaned build artifacts

---

## If You Get Errors Again

### Error: "SQLITE_NOTADB: file is not a database"

Run the fix script:
```bash
./fix-database.sh
npm start
```

### Error: "Cannot read properties of undefined"

The app is using old code. Restart:
```bash
pkill -f electron
rm -rf .vite
npm start
```

### Error: "Module not found"

Reinstall dependencies:
```bash
npm install
npm run rebuild
npm start
```

---

## Complete Clean Start

If you want to start completely fresh:

```bash
# 1. Stop everything
pkill -f electron

# 2. Remove database
./fix-database.sh

# 3. Clean build
rm -rf .vite
rm -rf out
rm -rf node_modules

# 4. Reinstall
npm install
npm run rebuild

# 5. Start
npm start
```

---

## Verification

When the app starts successfully, you should see:

```
✓ Built in XXXms
Database initialized
Services initialized
IPC handlers registered
```

And in the browser console (F12):
```javascript
console.log(window.electronAPI);
// Should show all 7 methods
```

---

## Database Location

Your database is stored at:
```
macOS: ~/Library/Application Support/taxyatra/
Windows: %APPDATA%/taxyatra/
Linux: ~/.config/taxyatra/
```

Files:
- `taxyatra.db` - Unencrypted (only while app is running)
- `taxyatra.enc` - Encrypted (when app is closed)

---

## Quick Commands

```bash
# Fix database issues
./fix-database.sh

# Restart app clean
./restart-app.sh

# Start development
npm start

# Clear database (dev tool)
npm run clear-db
```

---

## Prevention

To avoid database corruption:

1. **Always close the app properly** (don't force quit)
2. **Let the app finish closing** (wait for process to end)
3. **Don't manually edit database files**
4. **Use the clear-db script** for testing

---

## Next Steps

1. ✅ Database is fixed
2. ✅ Run `npm start`
3. ✅ Test all features
4. ✅ Read documentation

---

## Documentation

- **START_HERE.md** - Quick start guide
- **TROUBLESHOOTING.md** - Detailed troubleshooting
- **ARCHITECTURE.md** - Architecture details
- **QUICK_REFERENCE.md** - Developer reference

---

**You're all set! Run `npm start` to begin. 🚀**
