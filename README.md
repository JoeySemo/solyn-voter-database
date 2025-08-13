# Solyn - Democratic Party Tools

> An open-source voter database and canvassing tool to help Democratic Party organizing efforts in Wentzville, Missouri.

## 🎯 Project Purpose

Solyn provides a comprehensive suite of tools for Democratic Party organizers and volunteers:

- **Voter Database**: Search, filter, and analyze voter information
- **Route Optimizer**: Create optimized walking routes for canvassing using Google Maps
- **CAPES**: Campaign management and planning tools (coming soon)

## ✨ Features

### Voter Database (`/the-van`)
- 🔍 **Advanced Search**: Search by name, ID, address, or political party
- 🎯 **Smart Filtering**: Filter by precinct, split, target voter status, and party affiliation
- 📊 **Comprehensive Data**: View voter demographics, voting history, and target status
- 📄 **Pagination**: Efficiently browse through 72,000+ voter records
- 🎨 **Responsive Design**: Works seamlessly on desktop and mobile devices

### Route Optimizer (`/route-optimizer`)
- 🗺️ **Google Maps Integration**: Uses Google Maps Directions API for route optimization
- 🚶 **Walking Routes**: Optimized for door-to-door canvassing
- 📱 **Mobile Friendly**: Direct links to Google Maps for navigation
- 📊 **CSV Export**: Download optimized routes for offline reference
- 🔍 **Address Detection**: Automatically extracts addresses from voter database pages

### CAPES (`/minivan`)
- 🚧 **Under Development**: Campaign management and planning tools coming soon

## 🛠️ Tech Stack

- **Frontend**: Next.js 15, React, TypeScript
- **Styling**: Tailwind CSS, shadcn/ui components
- **Database**: Supabase (PostgreSQL)
- **Deployment**: Vercel
- **Maps**: Google Maps Directions API

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Google Maps API key (for route optimization)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/JoeySemo/solyn-voter-database.git
   cd solyn-voter-database
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Edit `.env.local` and add your configuration:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   GOOGLE_MAPS_API_KEY=your_google_maps_api_key
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure

```
solyn-app/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   ├── voters/        # Voter data endpoints
│   │   └── voters/filters/ # Filter options endpoint
│   ├── the-van/           # Voter Database page
│   ├── route-optimizer/   # Route optimization tool
│   ├── minivan/           # CAPES (coming soon)
│   └── page.tsx           # Homepage
├── components/            # Reusable UI components
│   └── ui/               # shadcn/ui components
├── lib/                  # Utility functions
│   ├── supabaseClient.ts # Supabase configuration
│   └── utils.ts          # Helper functions
└── public/               # Static assets
```

## 🔧 Configuration

### Supabase Setup
1. Create a new project at [supabase.com](https://supabase.com)
2. Create a table named `Wentzville Voters` with your voter data
3. Copy your project URL and anon key to `.env.local`

### Google Maps API
1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Enable the "Directions API"
3. Create an API key and add it to `.env.local`

## 🚀 Deployment & Integration

This project is fully integrated with GitHub, Vercel, and custom domain (Solyn.org):

### Quick Setup
Run the automated integration script:
```bash
./setup-integrations.sh
```

### Manual Setup
1. **GitHub Integration**
   - Push your code to GitHub
   - Configure GitHub Actions workflows
   - Add required secrets

2. **Vercel Deployment**
   - Import the repository in Vercel
   - Add environment variables in Vercel dashboard
   - Configure custom domain (Solyn.org)

3. **Domain Configuration**
   - Add DNS records for Solyn.org
   - Configure SSL certificates
   - Set up redirects

### Automated Workflows
- **Deployment**: Every push to `main` triggers production deployment
- **Database Seeding**: Manual workflow for database updates
- **Preview Deployments**: Created for pull requests

### Access Your Application
- **Production**: https://solyn.org
- **GitHub**: https://github.com/YOUR_USERNAME/solyn-voter-database
- **Vercel Dashboard**: https://vercel.com/dashboard

For detailed setup instructions, see [INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md).

## 🔒 Security & Privacy

### Data Handling
- **Public Data Only**: This tool only works with publicly available voter registration data
- **No Sensitive Information**: We do not store or display sensitive personal information
- **Local Processing**: Address extraction and route optimization happen client-side

### Political Use
This tool is designed for Democratic Party organizing efforts. Users are responsible for:
- Complying with local campaign finance laws
- Following voter contact regulations
- Respecting voter privacy preferences

## 🤝 Contributing

We welcome contributions! Here's how you can help:

1. **Fork the repository**
2. **Create a feature branch** (`git checkout -b feature/amazing-feature`)
3. **Commit your changes** (`git commit -m 'Add amazing feature'`)
4. **Push to the branch** (`git push origin feature/amazing-feature`)
5. **Open a Pull Request**

### Development Guidelines
- Follow TypeScript best practices
- Use conventional commit messages
- Test your changes thoroughly
- Update documentation as needed

## 📋 Roadmap

### Phase 1: Core Features ✅
- [x] Voter database with search and filtering
- [x] Route optimization for canvassing
- [x] Responsive design and mobile support

### Phase 2: Enhanced Features 🚧
- [ ] CAPES campaign management tools
- [ ] Advanced analytics and reporting
- [ ] Volunteer management system
- [ ] Integration with voter file systems

### Phase 3: Advanced Features 📋
- [ ] Predictive modeling for voter turnout
- [ ] Advanced route optimization algorithms
- [ ] Mobile app for field operations
- [ ] Real-time collaboration features

## 🐛 Known Issues

- Route optimization requires a valid Google Maps API key
- Large voter datasets may take time to load initially
- Some address formats may not be detected by the regex pattern

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built for Democratic Party organizing efforts
- Inspired by the need for better canvassing tools
- Powered by open-source technologies

## 📞 Support

For questions or support:
- Create an issue on GitHub
- Contact the development team
- Check the documentation in this README

---

**Built with ❤️ for Democratic organizing**
