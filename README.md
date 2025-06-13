# Ubuntu Web Terminal

Web terminal dengan autentikasi untuk akses root Ubuntu tanpa password sistem.

## 🔐 Keamanan

- **Root tanpa password**: Sistem root tidak memerlukan password
- **Autentikasi web**: Akses terminal dilindungi login web
- **Session management**: Session aman dengan timeout otomatis

## 🚀 Kredensial Default

**Web Authentication:**
- Username: `admin`
- Password: `admin123`

**Terminal Access:**
- Langsung sebagai root (tanpa password)

## 📋 Fitur

- ✅ Terminal berbasis web dengan xterm.js
- ✅ Akses root penuh tanpa password
- ✅ Autentikasi web yang aman
- ✅ Real-time terminal dengan WebSocket
- ✅ Responsive design
- ✅ Session management
- ✅ Terminal resize otomatis

## 🛠️ Deployment ke Render.com

1. **Fork/Clone repository ini**
2. **Login ke Render.com**
3. **New → Blueprint**
4. **Connect GitHub repository**
5. **Deploy otomatis dengan render.yaml**

## 🔧 Environment Variables

Set di Render.com dashboard:

```
WEB_USERNAME=your-username
WEB_PASSWORD=your-strong-password
SESSION_SECRET=your-random-secret
```

## 🌐 Akses

Setelah deployment:
- **Login**: `https://your-app.onrender.com/login`
- **Terminal**: `https://your-app.onrender.com/terminal`

## ⚠️ Keamanan Penting

1. **Ganti kredensial default** sebelum production
2. **Gunakan password yang kuat**
3. **Set SESSION_SECRET yang random**
4. **Monitor akses terminal**

## 🖥️ Penggunaan Terminal

Setelah login web, Anda akan memiliki:
- Akses root penuh (`whoami` = root)
- Home directory: `/root`
- Semua command Linux tersedia
- Install package dengan `apt`
- Akses ke seluruh filesystem

## 🚨 Peringatan

Tool ini memberikan akses root penuh ke sistem. Gunakan dengan hati-hati dan hanya untuk development/testing yang aman.
