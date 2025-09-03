# Authentication Setup Guide

This application supports three authentication methods:
1. Email/Password authentication
2. Microsoft OAuth
3. Google OAuth

## Environment Configuration

### Backend (.env file in backend/)

```bash
# Database
DATABASE_URL=postgresql://username:password@host:port/database_name

# JWT Configuration
JWT_SECRET_KEY=your_secure_jwt_secret_here_min_32_chars

# Microsoft OAuth Configuration
MICROSOFT_CLIENT_ID=your_microsoft_client_id
MICROSOFT_CLIENT_SECRET=your_microsoft_client_secret
MICROSOFT_TENANT_ID=common
MICROSOFT_REDIRECT_URI=https://your-domain.com/auth/callback

# Google OAuth Configuration  
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=https://your-domain.com/auth/google/callback

# Optional
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2
```

### Frontend (.env file in frontend/)

```bash
VITE_BACKEND_URL=https://your-backend-api-url.com
```

## Setting up Microsoft OAuth

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to "Azure Active Directory" > "App registrations" > "New registration"
3. Fill in:
   - Name: Your app name
   - Supported account types: "Accounts in any organizational directory and personal Microsoft accounts"
   - Redirect URI: Web - `https://your-domain.com/auth/callback`
4. After creation:
   - Note down the "Application (client) ID" → Use as `MICROSOFT_CLIENT_ID`
   - Go to "Certificates & secrets" > "New client secret" → Use as `MICROSOFT_CLIENT_SECRET`
   - Go to "API permissions" > "Add a permission" > "Microsoft Graph" > "Delegated permissions" > Add "User.Read"

## Setting up Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Go to "APIs & Services" > "Credentials"
4. Click "Create Credentials" > "OAuth 2.0 Client IDs"
5. Configure OAuth consent screen first if prompted
6. Application type: "Web application"
7. Authorized redirect URIs: `https://your-domain.com/auth/google/callback`
8. Note down:
   - Client ID → Use as `GOOGLE_CLIENT_ID`
   - Client Secret → Use as `GOOGLE_CLIENT_SECRET`

## JWT Secret Key

Generate a secure secret key (minimum 32 characters):

```bash
# Using Python
python -c "import secrets; print(secrets.token_urlsafe(32))"

# Using OpenSSL
openssl rand -base64 32
```

## Deployment URLs

### Development
- Frontend: `http://localhost:3000` or `http://localhost:5173`
- Backend: `http://localhost:8000`

### Production
- Frontend: `https://cleansing-app.netlify.app`
- Backend: `https://data-cleansing-jf11.onrender.com`

Make sure to update the redirect URIs in both OAuth providers when switching between development and production.

## Testing the Authentication

1. Start the backend server:
   ```bash
   cd backend
   uvicorn app.main:app --reload
   ```

2. Start the frontend:
   ```bash
   cd frontend
   npm run dev
   ```

3. Visit the login page and test:
   - Email/password registration and login
   - Microsoft OAuth login
   - Google OAuth login

## Troubleshooting

### Common Issues

1. **Invalid redirect URI**: Make sure the redirect URIs in your OAuth providers match exactly with your environment variables and deployed URLs.

2. **CORS errors**: Ensure your backend CORS configuration includes your frontend domain.

3. **OAuth provider errors**: Check that your client IDs and secrets are correct and that the OAuth apps have the necessary permissions.

4. **JWT errors**: Ensure your JWT secret key is set and is at least 32 characters long.

5. **Database connection**: Verify your DATABASE_URL is correct and the database is accessible.

### Debug Tips

- Check browser network tab for failed API calls
- Check backend logs for authentication errors
- Verify environment variables are loaded correctly
- Test OAuth providers with their respective debug tools
