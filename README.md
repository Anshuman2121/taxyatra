# TaxYatra

Electron app with React, TypeScript, Tailwind CSS, and shadcn/ui.

## Setup Commands

### Initial Setup
```bash
npx create-electron-app@latest taxyatra --template=vite-typescript
```

### Install Dependencies
```bash
npm install react react-dom @types/react @types/react-dom
npm install -D tailwindcss postcss autoprefixer @vitejs/plugin-react
npm install class-variance-authority clsx tailwind-merge lucide-react
```

### Add shadcn/ui Components
```bash
npx shadcn@latest add button
```

## Development

### Start Development Server
```bash
npm start
```

### Build for Production
```bash
npm run make
```

## One-Line Setup (Future Reference)
```bash
npx create-electron-app@latest taxyatra --template=vite-typescript && cd taxyatra && npm install react react-dom @types/react @types/react-dom && npm install -D tailwindcss postcss autoprefixer @vitejs/plugin-react && npm install class-variance-authority clsx tailwind-merge lucide-react
```


### To build

npm run dist:win
npm run dist:mac

npm run dist:all


choco install wixtoolset
npm run make:win-msi

### Fixing Windows ARM64 Build Warning

If you see this warning when building on Windows ARM64:
```
Unable to extract icon from exe. Please provide an explicit icon via parameter.
Error: Cannot find module '@bitdisaster/exe-icon-extractor'
```

**To fix it permanently:**

1. Open **Visual Studio Installer** on your Windows VM
2. Click **Modify** on your Visual Studio 2022 Build Tools
3. Go to the **Individual components** tab
4. Search for and check:
   - `C++ Clang Compiler for Windows`
   - `C++ Clang-cl for v143 build tools (ARM64)`
   - `MSBuild support for LLVM (clang-cl) toolset`
5. Click **Modify** to install
6. After installation, in your project directory run:
   ```cmd
   rmdir /s /q node_modules
   del package-lock.json
   npm install
   ```

The warning occurs because `@bitdisaster/exe-icon-extractor` (an optional dependency) requires ClangCL to compile on ARM64. Once installed, the warning will disappear and all builds will complete silently.