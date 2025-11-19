#!/bin/bash

# Start PostgreSQL service
brew services start postgresql@15

# Wait for PostgreSQL to start
sleep 2

# Create admin user (ignore if exists)
psql postgres -c "CREATE USER admin WITH PASSWORD 'admin' CREATEDB;" 2>/dev/null || true

# Create taxyatra database (ignore if exists)
psql postgres -c "CREATE DATABASE taxyatra OWNER admin;" 2>/dev/null || true

echo "✅ PostgreSQL setup complete!"
echo "Database: taxyatra"
echo "User: admin"
echo "Password: admin"
echo "Host: localhost"
echo "Port: 5432"
