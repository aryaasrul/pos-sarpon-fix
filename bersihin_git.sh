#!/bin/bash

echo "⚠️  INI AKAN MENGHAPUS SEMUA KONFIGURASI GIT DAN FILE GIT TERKAIT!"
read -p "Lanjutkan? (y/n): " confirm
if [[ "$confirm" != "y" ]]; then
  echo "❌ Dibatalkan."
  exit 1
fi

# Step 1: Hapus remote
if git rev-parse --git-dir > /dev/null 2>&1; then
  echo "🔗 Menghapus remote GitHub..."
  git remote remove origin 2>/dev/null
else
  echo "📁 Bukan repo git aktif, lanjut..."
fi

# Step 2: Hapus folder .git
if [ -d ".git" ]; then
  echo "🗑 Menghapus folder .git..."
  rm -rf .git
else
  echo "✅ Tidak ada folder .git"
fi

# Step 3: Hapus file .gitignore & .gitattributes
echo "🧼 Menghapus .gitignore dan .gitattributes..."
rm -f .gitignore .gitattributes

# Step 4: Bersihkan folder .vscode (opsional)
if [ -d ".vscode" ]; then
  read -p "Hapus folder .vscode juga? (y/n): " delvscode
  if [[ "$delvscode" == "y" ]]; then
    echo "🧹 Menghapus folder .vscode..."
    rm -rf .vscode
  else
    echo "📁 Folder .vscode dipertahankan."
  fi
fi

echo "🎉 Selesai. Folder ini sekarang bebas dari Git & GitHub."