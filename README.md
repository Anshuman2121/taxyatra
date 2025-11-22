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

You can build the app for specific platforms or all at once.

**Build for All Platforms:**
```bash
npm run dist:all
```

**Build for Windows:**
```bash
npm run dist:win
```

**Build for Mac:**
```bash
npm run dist:mac
```

**Build for Linux:**
```bash
npm run dist:linux
```

### Where are the files?
After the build completes, go to the `dist_electron` folder in your project directory.

- **Windows:** You will find the `.exe` installer here (e.g., `TaxYatra Setup 1.0.0.exe`).
- **Mac:** You will find the `.dmg` file here (e.g., `TaxYatra-1.0.0.dmg`).
- **Linux:** You will find `.AppImage` and `.deb` files here.

## One-Line Setup (Future Reference)
```bash
npx create-electron-app@latest taxyatra --template=vite-typescript && cd taxyatra && npm install react react-dom @types/react @types/react-dom && npm install -D tailwindcss postcss autoprefixer @vitejs/plugin-react && npm install class-variance-authority clsx tailwind-merge lucide-react
```


