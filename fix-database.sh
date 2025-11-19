#!/bin/bash

echo "🔧 Fixing Database Issues..."
echo ""

# Stop all electron processes
echo "1️⃣ Stopping Electron processes..."
pkill -f electron
sleep 2

# Find and remove corrupted database files
echo "2️⃣ Removing corrupted database files..."

# macOS location
DB_PATH="$HOME/Library/Application Support/taxyatra"
if [ -d "$DB_PATH" ]; then
    echo "   Found database directory: $DB_PATH"
    rm -f "$DB_PATH/taxyatra.db"
    rm -f "$DB_PATH/taxyatra.enc"
    echo "   ✅ Removed corrupted database files"
else
    echo "   ℹ️  Database directory not found (will be created on first run)"
fi

# Clean build artifacts
echo "3️⃣ Cleaning build artifacts..."
rm -rf .vite
rm -rf out

echo ""
echo "✅ Database fixed! Now run: npm start"
echo ""
