# Complete Auto-Update System – Setup & Usage Guide

## 📦 What Has Been Implemented

### ✅ Part 1: Tauri Configuration
- **File**: `src-tauri/tauri.conf.json`
- Updater enabled with GitHub Releases endpoint
- Public key placeholder for signature verification
- Version set to 1.0.0

### ✅ Part 2: Rust Backend  
- **File**: `src-tauri/Cargo.toml`
- Added `updater` feature to Tauri dependency
- Version set to 1.0.0
- All required dependencies configured

### ✅ Part 3: Frontend Integration
- **`lib/network.ts`**: Online/offline detection utilities
- **`lib/updater.ts`**: Tauri updater API wrappers
- **`components/ui/update-dialog.tsx`**: Update notification UI with progress bar
- **`components/ui/update-checker.tsx`**: Startup update check component
- **`app/layout.tsx`**: Integrated UpdateChecker for automatic checks

### ✅ Part 4: GitHub Actions CI/CD
- **File**: `.github/workflows/release.yml`
- Automated build on push to `main` and tags
- Builds Next.js + Tauri for Windows
- Signs installers with private key
- Creates GitHub Releases automatically
- Generates `latest.json` for updater

### ✅ Part 5: Documentation
- Setup instructions
- Update signing explanation
- Version bump workflow
- Example `latest.json`

---

## 🔐 STEP 1: Generate Update Signing Keys

**Run this command locally:**

```bash
npm run tauri signer generate -- -w ~/.tauri/attendance-system.key
```

**Expected Output:**
```
Your keypair was generated successfully
Private: dW50cnVzdGVkIGNvbW1lbnQ6IHJzaWdu...
Public: dW50cnVzdGVkIGNvbW1lbnQ6IG1pbmlz...

Your secret key was saved to: /Users/you/.tauri/attendance-system.key
```

### Critical Actions:

1. **Copy Private Key** → Save to GitHub Secrets
   - Go to: `https://github.com/YOUR_USERNAME/YOUR_REPO/settings/secrets/actions`
   - Create secret named: `TAURI_PRIVATE_KEY`
   - Paste the ENTIRE private key string

2. **Copy Public Key** → Update `tauri.conf.json`
   - Open: `src-tauri/tauri.conf.json`
   - Find: `"pubkey": "REPLACE_WITH_YOUR_PUBLIC_KEY_FROM_TAURI_SIGNER_GENERATE"`
   - Replace with your actual public key

3. **Backup Private Key** → Store securely:
   - Password manager (1Password, LastPass, etc.)
   - Encrypted vault
   - **NEVER** commit to git!

---

## ⚙️ STEP 2: Configure GitHub Repository

### 2.1 Update Repository Name

Replace `YOUR_USERNAME/attendance-system` in these files:

**`.github/workflows/release.yml`** (line 130):
```yaml
url: "https://github.com/YOUR_USERNAME/YOUR_REPO/releases/download/..."
```

**`src-tauri/tauri.conf.json`** (line 68):
```json
"endpoints": [
  "https://github.com/YOUR_USERNAME/YOUR_REPO/releases/latest/download/latest.json"
]
```

### 2.2 Enable GitHub Actions

1. Go to: `https://github.com/YOUR_USERNAME/YOUR_REPO/settings/actions`
2. Under "Actions permissions":
   - Select: **"Allow all actions and reusable workflows"**
   - Click **"Save"**

3. Under "Workflow permissions":
   - Select: **"Read and write permissions"**
   - Check: **"Allow GitHub Actions to create and approve pull requests"**
   - Click **"Save"**

---

## 🚀 STEP 3: Create Your First Release

### 3.1 Verify Versions Match

Ensure version is `1.0.0` in all three files:

- `package.json` → `"version": "1.0.0"`
- `src-tauri/Cargo.toml` → `version = "1.0.0"`
- `src-tauri/tauri.conf.json` → `"version": "1.0.0"`

### 3.2 Commit and Tag

```bash
git add .
git commit -m "chore: release v1.0.0"
git tag v1.0.0
git push origin main
git push origin v1.0.0
```

### 3.3 Monitor Build

1. Go to: `https://github.com/YOUR_USERNAME/YOUR_REPO/actions`
2. Watch the **"Release"** workflow
3. Wait ~10-15 minutes for completion

### 3.4 Verify Release

Go to: `https://github.com/YOUR_USERNAME/YOUR_REPO/releases`

**You should see:**
- ✅ Release `v1.0.0`
- ✅ `.exe` installer (NSIS)
- ✅ `.msi` installer
- ✅ `latest.json`
- ✅ `.sig` signature files

---

## 🔄 STEP 4: Test Auto-Update

### 4.1 Install v1.0.0

1. Download the installer from GitHub Releases
2. Run the installer
3. Launch the app

### 4.2 Create v1.0.1

```bash
# Update versions in all 3 files to 1.0.1
npm version patch

#Commit and push
git add .
git commit -m "chore: release v1.0.1"
git tag v1.0.1
git push origin main --tags
```

### 4.3 Wait for Build

Wait for GitHub Actions to complete the `v1.0.1` build.

### 4.4 Test Update Flow

In the running v1.0.0 app:
1. Wait 3 seconds (auto-check on startup)
2. **OR** manually restart the app
3. Verify "Update Available" dialog appears
4. Click **"Download and Install"**
5. Watch progress bar
6. App restarts automatically with v1.0.1

---

## 📁 Complete Folder Structure

```
attendance-system-v2/
├── .github/
│   └── workflows/
│       └── release.yml ✅ CI/CD workflow
├── app/
│   ├── layout.tsx ✅ Updated with UpdateChecker
│   ├── admin/
│   │   └── page.tsx
│   └── ...
├── components/
│   └── ui/
│       ├── update-dialog.tsx ✅ Update UI
│       └── update-checker.tsx ✅ Startup check
├── lib/
│   ├── network.ts ✅ Online detection
│   ├── updater.ts ✅ Update API
│   └── ...
├── src-tauri/
│   ├── Cargo.toml ✅ v1.0.0, updater feature
│   ├── tauri.conf.json ✅ Updater config
│   ├── installer.nsi
│   └── src/
│       ├── main.rs
│       ├── commands.rs
│       └── db.rs
├── package.json ✅ v1.0.0
├── latest.json.example ✅ Example manifest
└── README.md
```

---

## 🔐 How Update Signing Works

### Build Time (GitHub Actions):
1. **Tauri builds the app**
2. **Signs with private key** (from GitHub Secrets)
3. **Generates `.sig` file**
4. **Uploads to GitHub Releases**

### Update Time (User's App):
1. **App checks for updates**
2. **Downloads `latest.json`**
3. **Verifies signature** using public key in `tauri.conf.json`
4. **If valid** → downloads and installs
5. **If invalid** → rejects update (security!)

### Security Guarantee:
- Only updates signed with YOUR private key can install
- Prevents tampering and man-in-the-middle attacks
- Signature verification happens **before** download

---

## 📝 Version Bump Instructions

### Patch Release (1.0.0 → 1.0.1):
```bash
npm version patch
git add .
git commit -m "chore: release v1.0.1"
git tag v1.0.1
git push origin main --tags
```

### Minor Release (1.0.0 → 1.1.0):
```bash
npm version minor
git add .
git commit -m "feat: release v1.1.0"
git tag v1.1.0
git push origin main --tags
```

### Major Release (1.0.0 → 2.0.0):
```bash
npm version major
git add .
git commit -m "feat!: release v2.0.0"
git tag v2.0.0
git push origin main --tags
```

---

## 🐛 Troubleshooting

### ❌ "Invalid signature" error
**Solution:**
- Verify public key in `tauri.conf.json` matches your generated key
- Ensure `TAURI_PRIVATE_KEY` in GitHub Secrets is complete

### ❌ GitHub Actions fails
**Solution:**
- Check workflow permissions (Step 2.2)
- Verify `TAURI_PRIVATE_KEY` secret exists
- Review Actions logs for specific errors

### ❌ Update not detected
**Solution:**
- Verify `latest.json` exists in GitHub Releases
- Check app actually has internet connection
- Ensure new version > installed version

### ❌ Build fails locally
**Solution:**
```bash
# Clean and rebuild
rm -rf node_modules .next
npm install
npm run build
npm run tauri build
```

---

## ✅ Production Readiness Checklist

Before releasing to production:

- [ ] Private key stored in GitHub Secrets
- [ ] Public key added to `tauri.conf.json`
- [ ] Repository name updated in all files
- [ ] All placeholders replaced
- [ ] Workflow permissions configured correctly
- [ ] Test update flow works (v1.0.0 → v1.0.1)
- [ ] Version numbers consistent across files
- [ ] Release notes prepared
- [ ] Private key backed up securely

---

## 🎉 What Users Will Experience

1. **First Install**: Download installer from GitHub Releases
2. **App Launches**: Automatic update check after 3 seconds
3. **Update Available**: Dialog appears with version info
4. **One Click**: "Download and Install" button
5. **Progress Bar**: Real-time download progress
6. **Auto Restart**: App relaunches with new version

**No manual downloads. No confusion. Just seamless updates.**

---

## 📚 Additional Resources

- Tauri Updater Docs: https://tauri.app/v1/guides/distribution/updater
- GitHub Actions Docs: https://docs.github.com/en/actions
- Semantic Versioning: https://semver.org/

---

**🚀 You're all set! Your app now has enterprise-grade auto-updates.**
