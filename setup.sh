#!/bin/bash

echo "🚀 Setting up OMW CRM Project..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if PostgreSQL is installed and running
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL is not installed. Please install PostgreSQL first."
    exit 1
fi

echo "📋 Installing dependencies..."

# Install backend dependencies
echo "🔧 Installing backend dependencies..."
cd backend
npm install

# Install frontend dependencies
echo "🎨 Installing frontend dependencies..."
cd ../frontend
npm install

echo "✅ Dependencies installed successfully!"

echo "🗄️ Database setup..."
echo "Please make sure:"
echo "1. PostgreSQL is running"
echo "2. You have created a database (e.g., 'omw_crm')"
echo "3. You have set up your .env file in the backend directory"
echo ""
echo "Example .env file:"
echo "DATABASE_URL=postgresql://username:password@localhost:5432/omw_crm"
echo "JWT_SECRET=your-super-secure-jwt-secret-here"
echo "PORT=3002"
echo ""
echo "After setting up your .env file, run:"
echo "cd backend && npm run migrate"
echo ""
echo "Then start the servers:"
echo "Backend: cd backend && npm run dev"
echo "Frontend: cd frontend && npm run dev"
echo ""
echo "🎉 Setup complete! Your CRM will be available at http://localhost:5174"