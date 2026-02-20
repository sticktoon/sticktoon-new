# 🚀 Deployment Checklist for StickToon

## ✅ Before Pushing to GitHub

### 1. **Create Environment Files** (Local Development)
```bash
# Frontend
cp .env.example .env
# Edit .env with your local values

# Backend
cd backend
cp .env.example .env
# Edit .env with your database and API keys
```

### 2. **Test Locally**
```bash
# Start Backend
cd backend
npm install
npm start

# Start Frontend (in new terminal)
npm install
npm run dev
```

### 3. **Verify .gitignore**
Make sure these are in `.gitignore` (already done ✅):
- `.env`
- `backend/.env`
- `node_modules`
- `dist`

## 🌐 Production Deployment

### Backend (Render.com)

1. **Go to Render.com**
   - New Web Service
   - Connect your GitHub repo

2. **Settings:**
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Root Directory**: `backend`

3. **Environment Variables** (Set in Render Dashboard):
   ```env
   MONGO_URI=your_mongodb_atlas_uri
   JWT_SECRET=your_jwt_secret
   GOOGLE_CLIENT_ID=your_google_client_id
   BREVO_API_KEY=your_brevo_key
   FROM_EMAIL=noreply@sticktoon.shop
   FROM_NAME=StickToon
   CASHFREE_APP_ID=your_cashfree_app_id
   CASHFREE_SECRET_KEY=your_cashfree_secret
   RAZORPAY_KEY_ID=your_razorpay_key
   RAZORPAY_KEY_SECRET=your_razorpay_secret
   WEBHOOK_BASE_URL=https://your-app.onrender.com
   ADMIN_EMAIL=admin@sticktoon.shop
   NODE_ENV=production
   ```

4. **Run Database Index Script** (After first deployment):
   ```bash
   # In Render Shell or locally connected to production DB
   node scripts/addProductIndexes.js
   ```

### Frontend (Vercel)

1. **Go to Vercel.com**
   - Import your GitHub repo
   - Framework: Vite
   - Root Directory: `/` (root)

2. **Environment Variables** (Set in Vercel Dashboard):
   ```env
   VITE_API_URL=https://your-backend.onrender.com
   VITE_GOOGLE_CLIENT_ID=1049182842994-ck7f4tdfou808vi856a5u43b5tb28nba.apps.googleusercontent.com
   VITE_SUPER_ADMIN_EMAIL=sticktoon.xyz@gmail.com
   ```

3. **Deploy Settings:**
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

## 🔒 Security Checklist

- [ ] All `.env` files are in `.gitignore`
- [ ] MongoDB Atlas has IP whitelist configured (allow Render IPs or 0.0.0.0/0)
- [ ] JWT_SECRET is strong and random
- [ ] Payment gateway keys are from production accounts
- [ ] CORS origins in backend/server.js include your production domain

## 🧪 Post-Deployment Testing

1. **Backend Health Check:**
   - Visit: `https://your-backend.onrender.com/`
   - Should see: "StickToon API is running 🚀"

2. **Frontend Pages:**
   - [ ] Home page loads with badges
   - [ ] Categories page loads badges quickly
   - [ ] Badge detail page works
   - [ ] Admin login works
   - [ ] Cart and checkout work

3. **Performance:**
   - [ ] Images load with lazy loading
   - [ ] Badge loading is fast (optimized queries)
   - [ ] No console errors

## 🐛 Troubleshooting

### Images not loading?
- Check image paths start with `/badge/` or `/images/`
- Verify `public` folder is deployed with Vercel

### Backend slow?
- Run `node scripts/addProductIndexes.js` to add DB indexes
- Check MongoDB connection

### CORS errors?
- Add your Vercel domain to `backend/server.js` CORS origins
- Redeploy backend

## 📝 Quick Deploy Commands

```bash
# Push to GitHub
git add .
git commit -m "Performance optimizations for badge loading"
git push origin main

# Both Vercel and Render will auto-deploy on push (if configured)
```

## ✅ What's Already Optimized

1. ✅ Backend queries use `.lean()` for 5x faster reads
2. ✅ Database indexes for fast category filtering
3. ✅ Frontend lazy loading for images
4. ✅ Loading skeletons for better UX
5. ✅ Cache headers on API responses
6. ✅ Field selection (only fetches needed data)
7. ✅ CORS configured for production domains
8. ✅ Server listens on `0.0.0.0` (Render compatible)

---

**You're ready to deploy! 🚀**
