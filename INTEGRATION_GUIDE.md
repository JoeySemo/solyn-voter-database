# Solyn.org Integration Guide

This guide will help you connect your Solyn voter database project to GitHub, Vercel, and your custom domain (Solyn.org).

## 🎯 Overview

Your project is now configured with:
- **GitHub Actions** for automated deployment
- **Vercel** for hosting and custom domain management
- **Solyn.org** as your custom domain
- **Automated workflows** for database seeding and deployment

## 🚀 Quick Start

Run the automated setup script:

```bash
./setup-integrations.sh
```

This script will guide you through the entire setup process.

## 📋 Manual Setup Steps

### 1. GitHub Repository Setup

#### Create GitHub Repository
1. Go to [GitHub](https://github.com/new)
2. Name: `solyn-voter-database`
3. Make it public or private
4. Don't initialize with README (we already have one)

#### Connect Local Repository
```bash
git remote add origin https://github.com/YOUR_USERNAME/solyn-voter-database.git
git branch -M main
git push -u origin main
```

#### Configure GitHub Secrets
Go to: `https://github.com/YOUR_USERNAME/solyn-voter-database/settings/secrets/actions`

Add these secrets:
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anonymous key
- `GOOGLE_MAPS_API_KEY` - Your Google Maps API key
- `VERCEL_TOKEN` - Your Vercel API token
- `VERCEL_ORG_ID` - Your Vercel organization ID
- `VERCEL_PROJECT_ID` - Your Vercel project ID

### 2. Vercel Project Setup

#### Install Vercel CLI
```bash
npm install -g vercel
```

#### Deploy to Vercel
```bash
vercel
```

Follow the prompts to:
1. Link to your GitHub repository
2. Set up environment variables
3. Configure your custom domain

#### Get Vercel Credentials
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Navigate to Settings → Tokens
3. Create a new token
4. Copy your Organization ID and Project ID from the project settings

### 3. Custom Domain Configuration

#### Add Domain in Vercel
1. Go to your Vercel project dashboard
2. Navigate to Settings → Domains
3. Add `solyn.org`
4. Add `www.solyn.org`

#### Configure DNS Records
In your domain registrar's DNS settings, add:

**A Record:**
- Type: A
- Name: @
- Value: `76.76.19.19`

**CNAME Record:**
- Type: CNAME
- Name: www
- Value: `cname.vercel-dns.com`

#### SSL Certificate
Vercel will automatically provision SSL certificates for your domain.

## 🔄 Automated Workflows

### Deployment Workflow
- **Trigger**: Push to `main` branch
- **Actions**: 
  - Install dependencies
  - Run linting
  - Build application
  - Deploy to Vercel production

### Database Seeding Workflow
- **Trigger**: Manual (workflow_dispatch)
- **Actions**:
  - Seed production database
  - Notify completion

## 📊 Monitoring & Management

### GitHub Actions
Monitor deployments at: `https://github.com/YOUR_USERNAME/solyn-voter-database/actions`

### Vercel Dashboard
- **Analytics**: https://vercel.com/dashboard
- **Deployments**: View deployment history and logs
- **Performance**: Monitor Core Web Vitals

### Domain Management
- **DNS**: Manage through your domain registrar
- **SSL**: Automatically managed by Vercel
- **Redirects**: Configured in `vercel.json`

## 🔧 Configuration Files

### vercel.json
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "framework": "nextjs",
  "regions": ["iad1"],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Strict-Transport-Security",
          "value": "max-age=31536000; includeSubDomains"
        }
      ]
    }
  ],
  "domains": [
    "solyn.org",
    "www.solyn.org"
  ]
}
```

### GitHub Actions (.github/workflows/deploy.yml)
- Automated deployment on push to main
- Environment variable injection
- Build and deployment to Vercel

## 🛠️ Troubleshooting

### Common Issues

#### GitHub Actions Fail
1. Check secrets are properly configured
2. Verify environment variables
3. Check build logs for errors

#### Domain Not Working
1. Verify DNS records are correct
2. Check domain configuration in Vercel
3. Wait for DNS propagation (up to 48 hours)

#### Vercel Deployment Issues
1. Check build logs in Vercel dashboard
2. Verify environment variables
3. Test build locally: `npm run build`

### Useful Commands

```bash
# Test build locally
npm run build

# Check Vercel status
vercel ls

# View deployment logs
vercel logs

# Redeploy
vercel --prod
```

## 🔒 Security Considerations

### Environment Variables
- Never commit sensitive data to Git
- Use GitHub Secrets for production values
- Rotate API keys regularly

### Domain Security
- Enable HTTPS (automatic with Vercel)
- Configure security headers
- Monitor for unauthorized access

### Access Control
- Limit repository access
- Use branch protection rules
- Require pull request reviews

## 📈 Performance Optimization

### Vercel Optimizations
- Edge functions for API routes
- Automatic image optimization
- CDN distribution

### Monitoring
- Set up Vercel Analytics
- Monitor Core Web Vitals
- Track error rates

## 🎉 Success Checklist

- [ ] GitHub repository created and connected
- [ ] GitHub Actions workflows configured
- [ ] Vercel project deployed
- [ ] Custom domain (solyn.org) configured
- [ ] DNS records updated
- [ ] SSL certificate active
- [ ] First deployment successful
- [ ] Application accessible at https://solyn.org

## 📞 Support

If you encounter issues:

1. Check the troubleshooting section
2. Review Vercel and GitHub documentation
3. Check deployment logs
4. Contact the development team

## 🔗 Useful Links

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Supabase Documentation](https://supabase.com/docs)

---

**Your Solyn voter database is now fully integrated and ready for production! 🚀**
