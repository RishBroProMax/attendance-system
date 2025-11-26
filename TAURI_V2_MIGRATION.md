# Tauri v2 Migration - CRITICAL UPDATES

## ⚠️ IMPORTANT CHANGES

The project has been **updated to Tauri v2**. This required significant configuration changes:

### Files Updated for Tauri v2:

1. **`src-tauri/tauri.conf.json`** - Complete rewrite for v2 schema
   - New `$schema` property
   - Moved `identifier`, `productName`, `version` to root
   - Changed `devPath` → `devUrl`
   - Changed `distDir` → `frontendDist`
   - Restructured `plugins` section for updater

2. **`src-tauri/Cargo.toml`** - Updated dependencies
   - `tauri = "2"` instead of `"1"`
   - `tauri-build = "2"`
   - Plugins now separate: `tauri-plugin-dialog`, `tauri-plugin-notification`, `tauri-plugin-updater`

3. **`src-tauri/src/main.rs`** - Plugin initialization
   - Plugins must be explicitly initialized
   - `.plugin(tauri_plugin_updater::Builder::new().build())`

4. **`.github/workflows/release.yml`** - Updated environment variables
   - `TAURI_SIGNING_PRIVATE_KEY` (was `TAURI_PRIVATE_KEY`)
   - `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` (was `TAURI_KEY_PASSWORD`)

### Key Signing Changes (Tauri v2):

**Generate keys:**
```bash
npm run tauri signer generate -- -w ~/.tauri/attendance-system.key
```

**GitHub Secrets needed:**
- `TAURI_PRIVATE_KEY` → Add the private key here
- `TAURI_KEY_PASSWORD` → Add password (if you set one during generation)

### Testing Locally:

```bash
# Install dependencies
npm install

# Development
npm run tauri:dev

# Production build
npm run tauri:build
```

### Next Steps:

1. ✅ Configuration files updated to Tauri v2
2. ⏳ Run `npm install` to update node_modules
3. ⏳ Generate signing keys
4. ⏳ Update GitHub Secrets
5. ⏳ Replace `YOUR_USERNAME/attendance-system` in configs
6. ⏳ Test build locally
7. ⏳ Push tag to trigger workflow

---

**All configurations are now compatible with Tauri v2.9.4!**
