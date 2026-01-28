# Admin Panel Setup Instructions

## 1. Create Admin User

Run this command from the project root directory to seed the admin user:

```bash
node backend/scripts/seedAdminUser.js
```

Or from the backend directory:

```bash
cd backend
node scripts/seedAdminUser.js
```

## 2. Admin Login

1. Go to the Login page (/)
2. Click "🛡️ Admin Portal"
3. Enter admin credentials:
   - Email: `admin@sticktoon.com`
   - Password: `Admin@123`
4. Click "Login as Admin"

## 3. Admin Dashboard Features

### 📊 Dashboard
- View total influencers, pending approvals, pending withdrawals
- See key statistics at a glance

### ✅ Influencer Approvals
- View all influencer signup requests
- Approve influencers (they can then generate promo codes)
- Reject influencers (they receive rejection email)
- Approved influencers can access full dashboard

### 💳 Withdrawal Requests
- View all withdrawal requests with status
- Approve withdrawals (move to "paid" status)
- Reject withdrawals
- Add transaction ID when marking as paid
- Influencer receives payment confirmation email

### 📦 Product Management
- Add new products (name, description, price, category, image)
- Edit existing products
- Delete products
- Upload product images

## 4. Influencer Workflow

1. **Signup**: Influencer signs up → Admin receives notification email
2. **Pending**: Influencer waits for admin approval (cannot login or access dashboard)
3. **Approved**: Admin approves → Influencer receives approval email
4. **Active**: Influencer can now:
   - Login to dashboard
   - Create promo codes
   - View earnings
   - Request withdrawals
5. **Withdrawal**: Influencer requests withdrawal → Admin reviews and approves

## 5. API Endpoints

### Admin Auth
- `POST /api/admin/login` - Admin login

### Admin Influencer Management
- `GET /api/admin/influencer-manage` - Get all influencers
- `GET /api/admin/influencer-manage/pending` - Get pending approvals
- `PATCH /api/admin/influencer-manage/:id/approve` - Approve influencer
- `PATCH /api/admin/influencer-manage/:id/reject` - Reject influencer

### Admin Withdrawal Management
- `GET /api/admin/influencer-manage/withdrawals/all` - Get all withdrawals
- `PATCH /api/admin/influencer-manage/withdrawals/:id/process` - Update withdrawal status

### Admin Stats
- `GET /api/admin/influencer-manage/stats/overview` - Get dashboard statistics

## 6. Troubleshooting

**Admin login not working?**
- Ensure admin user is seeded: `node scripts/seedAdminUser.js`
- Check that JWT_SECRET is set in .env
- Verify admin user exists in MongoDB

**Influencer approval email not sending?**
- Check BREVO_API_KEY is set in .env
- Verify ADMIN_EMAIL env variable is configured
- Check Brevo console for email delivery logs

**Withdrawal status not updating?**
- Ensure admin is logged in (token valid)
- Check withdrawal ID is correct
- Verify influencer withdrawal exists in database
