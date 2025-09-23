# EdAI Accelerator - Render Deployment Guide

This guide will help you deploy the EdAI Accelerator landing page on Render with PostgreSQL database.

## 🚀 **Why Render?**

- **Simple Deployment**: Git-based deployment with zero configuration
- **Built-in PostgreSQL**: Free PostgreSQL database included
- **Automatic HTTPS**: SSL certificates automatically managed
- **Great Free Tier**: Generous limits for small projects
- **Full-Stack Ready**: Perfect for our Express.js + PostgreSQL setup

## 📋 **Prerequisites**

1. **Render Account**: Sign up at [render.com](https://render.com)
2. **GitHub Repository**: Your code should be pushed to GitHub
3. **Project Structure**: We've set up Express.js server for Render

## 🔧 **Deployment Steps**

### **Step 1: Create PostgreSQL Database**

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **"New +"** → **"PostgreSQL"**
3. Fill in details:
   - **Name**: `edai-accelerator-db`
   - **Database**: `edai_accelerator`
   - **User**: `admin` (or your choice)
   - **Region**: Choose closest to your users
   - **Plan**: **Free** (sufficient for development)
4. Click **"Create Database"**
5. **Save the connection details** - you'll need them for the web service

### **Step 2: Set Up Database Schema**

After your database is created:

1. In Render dashboard, click on your database
2. Go to **"Connect"** tab
3. Copy the **"External Database URL"**
4. Use a PostgreSQL client (like pgAdmin, DBeaver, or psql) to connect
5. Run the SQL from our `schema.sql` file:

```sql
-- Copy and paste the entire contents of schema.sql here
-- This creates the applications table with proper constraints
```

### **Step 3: Deploy Web Service**

1. In Render dashboard, click **"New +"** → **"Web Service"**
2. Connect your GitHub repository: `https://github.com/aidrisedai/edai-accelerator-landing-.git`
3. Fill in service details:
   - **Name**: `edai-accelerator`
   - **Region**: Same as your database
   - **Branch**: `main`
   - **Root Directory**: Leave empty
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: **Free** (sufficient for development)

### **Step 4: Configure Environment Variables**

In the web service settings, add these environment variables:

1. **DATABASE_URL**: Copy from your PostgreSQL database connection info
   - Format: `postgresql://username:password@hostname:port/database`
   - Example: `postgresql://admin:password123@dpg-abc123-a.oregon-postgres.render.com:5432/edai_accelerator`

2. **NODE_ENV**: `production`

### **Step 5: Deploy**

1. Click **"Create Web Service"**
2. Render will automatically:
   - Clone your repository
   - Install dependencies (`npm install`)
   - Start your server (`npm start`)
   - Provide you with a public URL

## 🌐 **Your Live Site**

After deployment, you'll get a URL like:
`https://edai-accelerator.onrender.com`

## 🔍 **Testing the Deployment**

1. Visit your deployed URL
2. Fill out the application form
3. Submit the form
4. Check your database to confirm data was saved
5. Monitor the logs in Render dashboard for any errors

## 📊 **Database Management**

### **Viewing Data**

Connect to your database using the connection string and run:

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

### **Database Tools**

Recommended PostgreSQL clients:
- **pgAdmin** (Free, full-featured)
- **DBeaver** (Free, lightweight)
- **TablePlus** (Paid, very user-friendly)
- **psql** (Command line)

## 🔧 **Local Development**

To run locally:

```bash
# Install dependencies
npm install

# Set environment variable
export DATABASE_URL="your_local_or_render_database_url"

# Start server
npm run dev
```

Visit `http://localhost:3000` to test locally.

## 📈 **Monitoring & Logs**

In Render dashboard:

1. **Logs**: Click on your web service → "Logs" tab
2. **Metrics**: Monitor CPU, memory, and response times
3. **Events**: See deployment history and events

## 💰 **Cost Breakdown (Free Tier)**

- **Web Service**: 750 hours/month (sufficient for always-on)
- **PostgreSQL**: 1GB storage, 1GB RAM
- **Bandwidth**: 100GB/month
- **Custom Domain**: Supported
- **SSL Certificate**: Automatic and free

## 🚨 **Troubleshooting**

### **Common Issues**

1. **Database Connection Error**
   - Verify DATABASE_URL is correct
   - Ensure database is in same region as web service
   - Check database is running (not sleeping)

2. **Build Failed**
   - Check logs in Render dashboard
   - Ensure `package.json` has correct dependencies
   - Verify Node.js version compatibility

3. **Form Submission Not Working**
   - Check API endpoint is accessible at `/api/submit-application`
   - Verify CORS settings
   - Check database schema exists

### **Debug Commands**

Add these endpoints to your server for debugging:

```javascript
// Add to server.js for debugging
app.get('/debug/db', async (req, res) => {
    try {
        const result = await pool.query('SELECT NOW()');
        res.json({ database_time: result.rows[0], status: 'connected' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
```

## 🔐 **Security**

Render provides:
- **Automatic HTTPS**: All traffic encrypted
- **Environment Variables**: Securely stored
- **Private Networking**: Database not exposed to internet
- **DDoS Protection**: Built-in protection

## 📱 **Custom Domain (Optional)**

To use a custom domain:
1. In web service settings → "Settings" tab
2. Add your custom domain
3. Configure DNS records as shown
4. SSL certificate automatically provisioned

## 🔄 **Continuous Deployment**

Render automatically deploys when you push to GitHub:

```bash
# Make changes to your code
git add .
git commit -m "Update landing page"
git push origin main

# Render automatically detects and deploys
```

## 🆙 **Scaling Up**

When ready to scale:
- **Starter Plan**: $7/month (better performance)
- **Standard Plan**: $25/month (more resources)
- **PostgreSQL Pro**: $20/month (more storage, connections)

Your current setup will work great on the free tier for development and initial launch!