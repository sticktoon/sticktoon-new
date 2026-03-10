# Fix Google OAuth "redirect_uri_mismatch" Error

## Problem
Error 400: redirect_uri_mismatch - Google OAuth is blocking sign-in

## Solution Steps

### 1. Go to Google Cloud Console
Visit: https://console.cloud.google.com/

### 2. Navigate to Credentials
- Click on your project (or select it from the dropdown)
- Go to **APIs & Services** → **Credentials**
- Find and click on your OAuth 2.0 Client ID:
  ```
  1049182842994-ck7f4tdfou808vi856a5u43b5tb28nba
  ```

### 3. Add Authorized JavaScript Origins
Scroll to **Authorized JavaScript origins** section and add:
```
http://localhost:5173
http://127.0.0.1:5173
https://sticktoon-website.onrender.com
```

### 4. Add Authorized Redirect URIs
Scroll to **Authorized redirect URIs** section and add:
```
http://localhost:5173
http://localhost:5173/
http://127.0.0.1:5173
http://127.0.0.1:5173/
https://sticktoon-website.onrender.com
https://sticktoon-website.onrender.com/
```

### 5. Save Changes
Click the **SAVE** button at the bottom

### 6. Wait & Test
- Wait 1-2 minutes for changes to propagate
- Refresh your app and try Google login again

## Notes
- The error happens because Google OAuth requires pre-registered redirect URLs
- All URLs where users will be redirected after login must be whitelisted
- Changes may take a few minutes to take effect
