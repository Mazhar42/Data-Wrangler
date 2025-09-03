# Microsoft Authentication Setup Guide

## Overview
This guide explains how to set up Microsoft OAuth authentication for your Data Cleansing App.

## Prerequisites
- Azure account
- Access to Azure Portal (portal.azure.com)

## Step 1: Register Your Application in Azure

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory** > **App registrations**
3. Click **New registration**
4. Fill in the application details:
   - **Name**: Data Cleansing App
   - **Supported account types**: Accounts in any organizational directory and personal Microsoft accounts
   - **Redirect URI**: 
     - Type: Web
     - URL: `https://cleansing-app.netlify.app/auth/callback` (for production)
     - For local development, also add: `http://localhost:3000/auth/callback`

## Step 2: Configure Application Settings

After registration:

1. Note down the **Application (client) ID** from the Overview page
2. Go to **Certificates & secrets**
3. Click **New client secret**
4. Add a description and choose expiry period
5. Copy the **Value** (this is your client secret)

## Step 3: Set API Permissions

1. Go to **API permissions**
2. Click **Add a permission**
3. Select **Microsoft Graph**
4. Choose **Delegated permissions**
5. Add the following permissions:
   - `User.Read` (to read user profile)
6. Click **Grant admin consent** (if you're an admin)

## Step 4: Update Environment Variables

Update your `.env` file with the following values:

```env
# Microsoft OAuth Configuration
MICROSOFT_CLIENT_ID=your_application_client_id_here
MICROSOFT_CLIENT_SECRET=your_client_secret_here
MICROSOFT_TENANT_ID=common
MICROSOFT_REDIRECT_URI=https://cleansing-app.netlify.app/auth/callback

# JWT Configuration
JWT_SECRET_KEY=your_secure_random_jwt_secret_key_here
```

## Step 5: Database Migration

The new authentication system requires database schema changes. Run:

```bash
# Generate migration
alembic revision --autogenerate -m "Add user and project models"

# Apply migration
alembic upgrade head
```

## Frontend Integration

The frontend needs to be updated to:

1. Display Microsoft login button
2. Handle OAuth redirect
3. Store JWT tokens
4. Manage authentication state
5. Create project management UI

## API Endpoints

### Authentication
- `GET /auth/microsoft/url` - Get Microsoft OAuth login URL
- `POST /auth/microsoft/callback` - Handle OAuth callback
- `GET /auth/me` - Get current user info

### Projects
- `GET /projects` - List user's projects
- `POST /projects` - Create new project
- `GET /projects/{id}` - Get project details
- `PUT /projects/{id}` - Update project
- `DELETE /projects/{id}` - Delete project

### File Upload
- `POST /projects/{project_id}/upload` - Upload file to project (requires authentication)

## Security Notes

1. Keep your client secret secure
2. Use HTTPS in production
3. Set appropriate token expiration times
4. Implement proper CORS policies
5. Validate JWT tokens on every request

## Local Development

For local development, use:
- Redirect URI: `http://localhost:3000/auth/callback`
- Update CORS origins in `main.py`
- Use development environment variables
