# EdAI Accelerator Landing Page - Deployment Guide

This guide will help you deploy the EdAI Accelerator landing page with database connectivity using Vercel.

## Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **GitHub Account**: For code repository
3. **Node.js**: Version 18+ installed locally

## Setup Steps

### 1. Install Dependencies

```bash
npm install
```

### 2. Initialize Git Repository (if not already done)

```bash
git init
git add .
git commit -m "Initial commit: EdAI Accelerator landing page with database"
```

### 3. Push to GitHub

Create a new repository on GitHub and push your code:

```bash
git remote add origin https://github.com/YOUR_USERNAME/edai-accelerator-landing.git
git branch -M main
git push -u origin main
```

### 4. Deploy to Vercel

#### Option A: Through Vercel Dashboard
1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Click "New Project"
3. Import your GitHub repository
4. Vercel will automatically detect the configuration

#### Option B: Using Vercel CLI
```bash
npm install -g vercel
vercel login
vercel
```

Follow the prompts and accept the default settings.

### 5. Add Database Storage

1. In your Vercel dashboard, go to your project
2. Navigate to the "Storage" tab
3. Click "Create Database"
4. Select "Postgres"
5. Choose your plan (Hobby is free for development)
6. Click "Create"

Vercel will automatically add the necessary environment variables to your project.

### 6. Set Up Database Schema

After your database is created:

1. Go to your Vercel project dashboard
2. Click on the "Storage" tab
3. Click on your Postgres database
4. Click "Query" or "Browse"
5. Run the SQL from `schema.sql` to create the tables
6. To apply policy updates later, run the migration scripts in `migrations/`

Example to update age/grade policy to 11–18 and 6–12:

```sql
-- Run this in your Vercel Postgres console
\i migrations/2025-11-09_update_age_grade.sql
```

Alternatively, you can use a database client like pgAdmin or DBeaver to connect and run the schema.

### 7. Test the Deployment

1. Visit your deployed URL (provided by Vercel)
2. Test the form submission
3. Check the database to ensure data is being stored

## Environment Variables

The following environment variables are automatically provided by Vercel when you add Postgres storage:

- `POSTGRES_URL`
- `POSTGRES_PRISMA_URL` 
- `POSTGRES_URL_NON_POOLING`
- `POSTGRES_USER`
- `POSTGRES_HOST`
- `POSTGRES_PASSWORD`
- `POSTGRES_DATABASE`

## Local Development

To run the project locally with database connectivity:

1. Copy environment variables from Vercel:
   ```bash
   vercel env pull .env.local
   ```

2. Start the development server:
   ```bash
   vercel dev
   ```

This will run your site locally at `http://localhost:3000` with full database connectivity.

## Database Management

### Viewing Applications

To view submitted applications, you can:

1. Use Vercel's database browser in the dashboard
2. Connect with a PostgreSQL client using the connection string
3. Create an admin interface (optional future enhancement)

### Example Query to View Applications

```sql
SELECT 
    id,
    parent_name,
    parent_email,
    teen_name,
    teen_age,
    teen_grade,
    application_status,
    submitted_at
FROM applications 
ORDER BY submitted_at DESC;
```

## Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Ensure your database is properly set up in Vercel
   - Check that environment variables are available
   - Verify the schema has been created

2. **CORS Issues**
   - The API includes CORS headers, but if you have issues, check the `vercel.json` configuration

3. **Form Submission Fails**
   - Check the browser console for error messages
   - Verify the API endpoint is accessible at `/api/submit-application`
   - Check Vercel function logs in the dashboard

### Viewing Logs

1. Go to your Vercel project dashboard
2. Click on "Functions" tab
3. Click on `submit-application.js` to view logs

## Security Considerations

1. **Data Validation**: The API includes comprehensive server-side validation
2. **SQL Injection**: Using Vercel's SQL template literals prevents SQL injection
3. **Rate Limiting**: Consider adding rate limiting for production use
4. **Input Sanitization**: All inputs are trimmed and validated

## Cost Considerations

- **Vercel Hobby Plan**: Free tier includes:
  - 100GB bandwidth
  - 100 serverless function executions per day
  - Custom domains

- **Postgres Database**: 
  - Hobby plan: Free with limits
  - Pro plan: $20/month for higher limits

## Monitoring

Set up monitoring for:
- Form submission success/failure rates
- Database connection issues
- API response times

You can use Vercel Analytics or integrate with services like Sentry for error monitoring.

## Future Enhancements

Consider adding:
- Admin dashboard to view applications
- Email notifications for new applications
- Application status updates
- Automated email responses
- Analytics tracking
- A/B testing for conversion optimization