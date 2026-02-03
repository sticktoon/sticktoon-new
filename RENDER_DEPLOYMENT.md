# Render Deployment Guide - StickToon Backend

## ✅ Changes Made

The backend server has been updated to properly listen on all network interfaces (`0.0.0.0`) which is required for Render deployment.

### Key Fix
- **File**: `backend/server.js`
- **Change**: Added `"0.0.0.0"` as hostname in `app.listen()`
- **Before**: `app.listen(port, () => { ... })`
- **After**: `app.listen(port, "0.0.0.0", () => { ... })`

## 🚀 Deployment Steps on Render

### 1. **Connect Your Repository**
- Go to [render.com](https://render.com)
- Click "New +" → "Web Service"
- Connect your GitHub repository
- Select the StickToon repository

### 2. **Configure the Service**

| Setting | Value |
|---------|-------|
| **Name** | sticktoon-backend |
| **Environment** | Node |
| **Region** | Singapore or nearest |
| **Branch** | main |
| **Build Command** | `npm install` |
| **Start Command** | `node server.js` |
| **Instance Type** | Free or Starter |

### 3. **Set Environment Variables**

Add these in the "Environment" section:

```env
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
GOOGLE_CLIENT_ID=your_google_client_id
BREVO_API_KEY=your_brevo_api_key
FROM_EMAIL=your_email@example.com
FROM_NAME=StickToon
CASHFREE_APP_ID=your_cashfree_app_id
WEBHOOK_BASE_URL=https://your-app.onrender.com
ADMIN_EMAIL=your_admin_email@example.com
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
NODE_ENV=production
```

**Important**: Do NOT set a `PORT` environment variable - Render will provide this automatically.

### 4. **Root Directory** (if needed)
If your `backend` folder is not in the root, set:
- **Root Directory**: `backend`

### 5. **Deploy**
- Click "Create Web Service"
- Wait for build to complete (~3-5 minutes)
- Check logs in real-time

## ✅ Verification Checklist

After deployment completes:

- [ ] Logs show: `🚀 Backend running on port [number]`
- [ ] Logs show: `✅ MongoDB connected`
- [ ] Visit your service URL + `/` → Should see "StickToon API is running 🚀"
- [ ] Health status is "Live" (green)

## 🔧 Troubleshooting

### Issue: Port scan timeout
**Solution**: The fix we applied should resolve this. The server now listens on `0.0.0.0` which is accessible externally.

### Issue: MongoDB connection fails
**Check**:
- MONGO_URI is correct and network access is allowed
- IP whitelist on MongoDB Atlas includes Render's IP range (or use 0.0.0.0/0 for testing)

### Issue: Logs show "Port already in use"
**Solution**: The app has fallback ports (5001-5005), so it should auto-retry. Check logs.

## 📝 Frontend Configuration

After backend is deployed, update your frontend `VITE_API_URL`:

**File**: `frontend/.env`
```env
VITE_API_URL=https://your-render-service.onrender.com
VITE_SUPER_ADMIN_EMAIL=sticktoon.xyz@gmail.com
VITE_GOOGLE_CLIENT_ID=1049182842994-ck7f4tdfou808vi856a5u43b5tb28nba.apps.googleusercontent.com
```

Then redeploy frontend on Vercel.

## 🎯 Important URLs After Deployment

- **Backend API**: `https://your-render-service.onrender.com`
- **Health Check**: `https://your-render-service.onrender.com/`
- **Admin Login**: `https://sticktoon-web.vercel.app/admin`

## 🔐 Security Notes

1. ✅ Super admin email is configured: `sticktoon.xyz@gmail.com`
2. ✅ Password is hashed with bcrypt
3. ✅ JWT tokens are used for authentication
4. ✅ Environment variables are NOT exposed in code
5. ⚠️ Consider adding HTTPS-only cookies in production

## 📊 Auto-Scaling (Optional)

If you have a Starter or Professional plan:
- Enable "Auto-scaling" for production stability
- Set Min instances: 1
- Set Max instances: 3

---

**Last Updated**: January 28, 2026
**Backend Status**: Ready for deployment ✅
