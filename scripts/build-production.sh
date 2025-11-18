#!/bin/bash
# Build script com variáveis de ambiente do Firebase

echo "🔧 Building with Firebase environment variables..."

# Export Firebase variables
export VITE_FIREBASE_API_KEY="AIzaSyBg_EFchQ75sbbegkJtIdlyflZxuZki2DU"
export VITE_FIREBASE_PROJECT_ID="mvp1precos"
export VITE_FIREBASE_APP_ID="1:288807210289:web:c5d7e8f9a0b1c2d3e4f5g6"
export VITE_FIREBASE_AUTH_DOMAIN="mvp1precos.firebaseapp.com"
export VITE_FIREBASE_STORAGE_BUCKET="mvp1precos.firebasestorage.app"
export VITE_FIREBASE_MESSAGING_SENDER_ID="288807210289"
export VITE_WSS_URL="wss://buscadorpxt.com.br/"

# Clean old build
echo "🗑️  Removing old build..."
rm -rf dist/public

# Build
echo "📦 Building..."
npm run build

# Check if build was successful
if [ $? -eq 0 ]; then
    echo "✅ Build completed successfully!"
    echo "🔄 Restart PM2 with: pm2 restart buscadorpxt"
else
    echo "❌ Build failed!"
    exit 1
fi
