# Testing Checklist

## Pre-Testing Setup

- [ ] Run `npm install` to ensure all dependencies are installed
- [ ] Check that `forge.config.ts` points to `src/backend/main.ts`
- [ ] Backup your database if needed

## Build & Start

```bash
npm start
```

### Expected Behavior
- [ ] Application starts without errors
- [ ] No console errors in terminal
- [ ] Window opens successfully
- [ ] DevTools open (in development mode)

## Functional Testing

### 1. Database Initialization
- [ ] Database file is created in userData folder
- [ ] All tables are created successfully
- [ ] No database errors in console

### 2. Activation Flow (if enabled)
- [ ] Activation page loads
- [ ] Can enter activation code
- [ ] Activation code is validated
- [ ] Activation status is saved to database
- [ ] Redirects to home page after activation

### 3. User Management
- [ ] Can add new PAN credentials
- [ ] PAN credentials are saved to database
- [ ] Can view list of saved PANs
- [ ] Can select a PAN from the list

### 4. User Profile Fetching
- [ ] Can fetch user profile with PAN and password
- [ ] Puppeteer browser launches successfully
- [ ] Login process completes
- [ ] User data is saved to database
- [ ] Can retrieve saved user data

### 5. Navigation
- [ ] Can navigate between pages
- [ ] Back button works correctly
- [ ] Page state is maintained

### 6. Data Persistence
- [ ] Data persists after app restart
- [ ] Database encryption works on close
- [ ] Database decryption works on open

## Technical Verification

### IPC Communication
- [ ] All IPC channels work correctly
- [ ] Data is passed correctly between processes
- [ ] Error handling works for failed IPC calls

### Services
- [ ] Auth service initializes correctly
- [ ] User service initializes correctly
- [ ] API service can make external calls
- [ ] Puppeteer service can launch browser

### Database
- [ ] Connection is established
- [ ] Queries execute successfully
- [ ] Transactions work correctly
- [ ] Database closes properly on app quit

### Error Handling
- [ ] Invalid inputs are handled gracefully
- [ ] Network errors are caught and displayed
- [ ] Database errors don't crash the app
- [ ] User-friendly error messages are shown

## Console Checks

### No Errors For:
- [ ] Database initialization
- [ ] Service initialization
- [ ] IPC handler registration
- [ ] Component rendering
- [ ] API calls

### Expected Logs:
- [ ] "Database initialized"
- [ ] "Services initialized"
- [ ] "IPC handlers registered"
- [ ] API request/response logs (if enabled)

## Performance

- [ ] App starts in reasonable time (< 5 seconds)
- [ ] UI is responsive
- [ ] No memory leaks
- [ ] Database queries are fast

## Build Testing

```bash
npm run make
```

### Expected Behavior
- [ ] Build completes without errors
- [ ] Executable is created in `out/` folder
- [ ] Built app runs correctly
- [ ] All features work in production build

## Platform-Specific Testing

### macOS
- [ ] App icon displays correctly
- [ ] Menu bar works
- [ ] Keyboard shortcuts work
- [ ] App quits properly with Cmd+Q

### Windows (if applicable)
- [ ] Installer works
- [ ] App icon displays correctly
- [ ] Uninstaller works

### Linux (if applicable)
- [ ] Package installs correctly
- [ ] App runs without errors

## Regression Testing

Test all existing features to ensure nothing broke:

- [ ] All existing components render correctly
- [ ] All existing functionality works
- [ ] No new console errors
- [ ] Performance is same or better

## Edge Cases

- [ ] Empty database on first run
- [ ] Invalid PAN format
- [ ] Wrong password
- [ ] Network timeout
- [ ] Duplicate PAN entries
- [ ] Special characters in inputs
- [ ] Very long inputs

## Security

- [ ] Database is encrypted at rest
- [ ] Passwords are not logged
- [ ] Sensitive data is not exposed in DevTools
- [ ] IPC channels validate inputs

## Cleanup

- [ ] Temporary files are cleaned up
- [ ] Database is properly closed
- [ ] No zombie processes

## Known Issues to Check

Document any issues found:

```
Issue: [Description]
Steps to Reproduce:
1. 
2. 
3. 

Expected: [What should happen]
Actual: [What actually happens]
Severity: [Critical/High/Medium/Low]
```

## Sign-Off

- [ ] All critical features work
- [ ] No blocking bugs
- [ ] Performance is acceptable
- [ ] Ready for use

---

## Quick Test Script

Run this in your component to test the new architecture:

```typescript
// Test in browser console or component
const testNewArchitecture = async () => {
  console.log('Testing new architecture...');
  
  // Test 1: Check activation
  const isActivated = await window.electronAPI.checkActivation();
  console.log('✓ Activation check:', isActivated);
  
  // Test 2: Get PAN credentials
  const pans = await window.electronAPI.getPanCredentials();
  console.log('✓ PAN credentials:', pans);
  
  // Test 3: Get user data (if you have a PAN)
  if (pans.length > 0) {
    const userData = await window.electronAPI.getUserData(pans[0].pan);
    console.log('✓ User data:', userData);
  }
  
  console.log('All tests passed! ✅');
};

testNewArchitecture();
```

## Rollback Plan

If critical issues are found:

1. Stop the application
2. Update `forge.config.ts`:
   ```typescript
   entry: 'src/main.ts',  // Change back to old main
   ```
3. Restart: `npm start`
4. Document issues for fixing

---

**Test thoroughly before deploying to production! 🧪**
