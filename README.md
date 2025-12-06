# TaxYatra

A Tauri desktop app for tax filing assistance with React, TypeScript, and Tailwind CSS.

## Prerequisites

### All Platforms
- **Node.js 18+** - [Download](https://nodejs.org)
- **Rust** - [Install](https://rustup.rs)

### Windows Additional Requirements
- **Visual Studio Build Tools 2022** - [Download](https://visualstudio.microsoft.com/visual-cpp-build-tools/)

#### For Windows x64:
1. Install Build Tools, select "Desktop development with C++"
2. Ensure these are checked:
   - MSVC v143 x64/x86 build tools
   - Windows 10/11 SDK

#### For Windows ARM64 (Surface Pro, etc.):
1. Install Build Tools, go to "Individual Components"
2. Search and install:
   - MSVC v143 ARM64 build tools
   - Windows 11 SDK

---

## Quick Start

```bash
# Install dependencies
npm install
cd sidecar && npm install && cd ..

# Run in development mode
npm run dev
```

---

## Build for Production

### macOS
```bash
npm run build
```
Output: `backend/target/release/bundle/`

### Windows
Run from **Developer Command Prompt for VS 2022**:
```cmd
npm run build:windows
```
Output: `backend/target/release/bundle/nsis/TaxYatra_x.x.x_x64-setup.exe`

---

## Project Structure

```
taxyatra/
├── frontend/          # React UI (Vite)
│   ├── api/           # API layer (Tauri + WebSocket)
│   ├── components/    # UI components
│   └── pages/         # App pages
├── backend/           # Tauri Rust backend
│   ├── src/           # Rust code
│   ├── bin/           # Sidecar binaries
│   └── migrations/    # SQLite migrations
└── sidecar/           # Node.js sidecar (Puppeteer)
    └── services/      # Browser automation
```

---

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development mode |
| `npm run build` | Build for current platform |
| `npm run build:windows` | Build for Windows |
| `npm run build:sidecar` | Build sidecar only (macOS) |
| `npm run build:sidecar:all` | Build sidecar for all platforms |

---

## Troubleshooting

### Windows: "linker `link.exe` not found"
→ Use **Developer Command Prompt for VS 2022**, not PowerShell

### Windows ARM64: "library machine type 'x86' conflicts with ARM64"
→ Install ARM64 build tools (see Prerequisites above)

### macOS: Permission denied
→ Run `chmod +x backend/bin/*`

---

## License

MIT
