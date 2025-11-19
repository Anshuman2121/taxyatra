#!/bin/bash

echo "🔧 Restarting TaxYatra Application..."
echo ""

# Stop all electron processes
echo "1️⃣ Stopping Electron processes..."
pkill -f electron
sleep 2

# Clean build artifacts
echo "2️⃣ Cleaning build artifacts..."
rm -rf .vite
rm -rf out

# Verify configuration
echo "3️⃣ Checking configuration..."
if grep -q "src/backend/main.ts" forge.config.ts; then
    echo "   ✅ Configuration correct (using src/backend/main.ts)"
else
    echo "   ⚠️  Configuration may be incorrect"
    echo "   Expected: entry: 'src/backend/main.ts'"
fi

echo ""
echo "4️⃣ Starting application..."
echo "   Run: npm start"
echo ""
echo "✅ Ready to start!"
