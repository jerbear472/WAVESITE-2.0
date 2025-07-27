# 🚀 Run Enterprise Dashboard - Simple Steps

## Option 1: Quick Start (Recommended)

Open a new terminal and run these commands:

```bash
cd /Users/JeremyUys_1/Desktop/wavesite2/web
npm run dev
```

The server will start on either port 3000 or 3001.

## Option 2: Use the Start Script

```bash
cd /Users/JeremyUys_1/Desktop/wavesite2
./start-dashboard.sh
```

## Option 3: Manual Steps

1. **Open Terminal**

2. **Navigate to the web directory:**
   ```bash
   cd /Users/JeremyUys_1/Desktop/wavesite2/web
   ```

3. **Start the server:**
   ```bash
   npm run dev
   ```

4. **Look for this message:**
   ```
   ▲ Next.js 14.0.3
   - Local:        http://localhost:3000  (or 3001)
   
   ✓ Ready in XXXXms
   ```

5. **Open your browser and go to:**
   - If port 3000: http://localhost:3000/login
   - If port 3001: http://localhost:3001/login

## 📝 Login Credentials

- **Email:** enterprise@test.com
- **Password:** test123456

## 🔍 Check Which Port

To see which port the server is using:
```bash
lsof -nP -iTCP -sTCP:LISTEN | grep -E "(3000|3001)"
```

## 🛑 Stop the Server

Press `Ctrl+C` in the terminal where it's running.

## 💡 Troubleshooting

### "Module not found" errors
```bash
cd /Users/JeremyUys_1/Desktop/wavesite2/web
npm install
npm run dev
```

### Port already in use
Kill the process using the port:
```bash
# For port 3000
lsof -ti:3000 | xargs kill -9

# For port 3001
lsof -ti:3001 | xargs kill -9
```

### Can't find the server URL
Look in the terminal output for:
```
- Local:        http://localhost:XXXX
```
Where XXXX is the port number.

## 🎯 Direct Links (once running)

- **Login:** http://localhost:3000/login (or 3001)
- **Dashboard:** http://localhost:3000/enterprise/dashboard
- **Pricing:** http://localhost:3000/pricing

---

**Just run `npm run dev` in the web folder and open the URL it shows!**