# Attendance System v2

Modern, offline-capable attendance tracking system built with Next.js and Tauri.

## Features

- ✨ **Attendance Tracking**: Mark attendance via manual entry or QR code scanning
- 📊 **Analytics Dashboard**: View statistics, charts, and prefect search
- 💾 **Offline-First**: SQLite database with full offline support
- 🔄 **Auto-Updates**: Seamless updates via GitHub Releases
- 🎨 **Modern UI**: Beautiful, responsive design with dark mode
- 🔐 **Secure**: Admin panel with PIN protection
- 📦 **Backup/Restore**: Export and import data with `.bbak` files

## Quick Start

### Prerequisites

- Node.js 18+
- Rust (latest stable)
- Windows OS (currently Windows-only build)

### Installation

1 **Install from Release:**
   - Download the latest installer from [Releases](https://github.com/YOUR_USERNAME/attendance-system/releases)
   - Run the `.exe` or `.msi` installer
   - Launch "Attendance System"

2. **Build from Source:**
   ```bash
   # Clone repository
   git clone https://github.com/YOUR_USERNAME/attendance-system.git
   cd attendance-system-v2

   # Install dependencies
   npm install

   # Run development server
   npm run tauri dev

   # Build production app
   npm run tauri build
   ```

## Usage

### Marking Attendance

1. **Manual Entry:**
   - Enter prefect number
   - Select role
   - Click "Mark Attendance"

2. **QR Code:**
   - Navigate to QR Scanner
   - Scan prefect QR code
   - Attendance marked automatically

### Admin Panel

**Default PIN:** `apple`

- View all attendance records
- Export data to CSV
- Search by prefect number
- View analytics and charts
- Bulk attendance entry
- Backup/restore data
- System monitoring

## Auto-Updates

The app automatically checks for updates:
- On startup (after 3 seconds)
- Updates download in background
- One-click install and restart
- No manual downloads needed

## Development

```bash
# Install dependencies
npm install

# Run Next.js development server
npm run dev

# Run Tauri development app
npm run tauri dev

# Type checking
npx tsc --noEmit

# Build for production
npm run tauri build
```

## Project Structure

```
├── app/                  # Next.js pages
├── components/           # React components
├── lib/                  # Utilities and business logic
├── src-tauri/            # Rust backend
│   ├── src/              # Rust source code
│   ├── tauri.conf.json   # Tauri configuration
│   └── Cargo.toml        # Rust dependencies
└── .github/workflows/    # CI/CD automation
```

## Tech Stack

- **Frontend**: Next.js 13, React, TypeScript, TailwindCSS
- **Desktop**: Tauri v1
- **Database**: SQLite (via rusqlite)
- **Charts**: Chart.js, Recharts
- **UI Components**: Radix UI, shadcn/ui
- **CI/CD**: GitHub Actions

## Documentation

- **[Auto-Update Guide](./AUTO_UPDATE_GUIDE.md)**: Complete setup for auto-updates
- **[Walkthrough](./path/to/walkthrough.md)**: Implementation details
- **[API Documentation](./API.md)**: Backend commands reference

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## License

MIT License - see LICENSE file for details

## Support

For issues or questions:
- Open an issue on GitHub
- Check the [Troubleshooting Guide](./AUTO_UPDATE_GUIDE.md#-troubleshooting)

## Roadmap

- [ ] Multi-platform support (macOS, Linux)
- [ ] Cloud sync (optional)
- [ ] Advanced analytics
- [ ] Export to PDF
- [ ] Custom themes

---

**Built with ❤️ using Tauri and Next.js**
