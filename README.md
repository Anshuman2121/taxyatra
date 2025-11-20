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
