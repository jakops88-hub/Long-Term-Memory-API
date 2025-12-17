# SDK Deployment Guide

## ✅ SDK Status: Ready for Build

All source files are complete and ready to compile.

## 📦 Files Created

```
sdk/
├── package.json          # NPM package configuration
├── tsconfig.json         # TypeScript compiler config
├── README.md             # Comprehensive documentation
├── .npmignore            # NPM publishing exclusions
├── example.js            # Usage example
└── src/
    ├── index.ts          # Main export file
    ├── client.ts         # MemVault client class (300+ lines)
    ├── types.ts          # TypeScript interfaces
    └── errors.ts         # Custom error classes
```

## 🚀 Build & Test Locally

### 1. Install Dependencies

```bash
cd sdk
npm install
```

This will install:
- `typescript@^5.0.0`
- `@types/node@^20.0.0`

### 2. Build

```bash
npm run build
# or
npx tsc
```

This compiles TypeScript to JavaScript in `dist/` folder:
- `dist/index.js` - Main entry point
- `dist/client.js` - Client implementation
- `dist/types.js` - Type definitions
- `dist/errors.js` - Error classes
- `dist/*.d.ts` - TypeScript declaration files

### 3. Test Locally

```bash
# Set your API key
export MEMVAULT_API_KEY="sk_test_memvault_production_key_2025_abc123def456ghi789jkl012mno345pqr"

# Run example
node example.js
```

Expected output:
```
🚀 MemVault SDK Example

1️⃣ Getting user info...
   User ID: user_test_memvault_2025
   Credits: 1000

2️⃣ Adding memory...
   Job ID: job_abc123
   Status: queued
   ⏳ Waiting for memory to process...

3️⃣ Searching memories...
   Found 5 memories
   Latest: "Team meeting on December 17, 2024: Decided to launch SDK first..."

4️⃣ Asking a question...
   Answer: We decided to launch the SDK first, followed by the Slack bot.
   Confidence: 0.92
   Sources: 3 memories

5️⃣ Listing API keys...
   Total keys: 1
   - Test Key (sk_test_memvault_pro...)

✅ All tests passed!
```

## 📤 Publish to NPM

### First Time Setup

1. Create NPM account at https://www.npmjs.com/signup
2. Login locally:
   ```bash
   npm login
   ```

### Publishing

```bash
cd sdk

# Dry run (see what would be published)
npm publish --dry-run

# Actually publish
npm publish --access public
```

The package will be available as `@memvault/client` on NPM.

### Update Version

After making changes:

```bash
# Patch version (1.0.0 -> 1.0.1)
npm version patch

# Minor version (1.0.0 -> 1.1.0)
npm version minor

# Major version (1.0.0 -> 2.0.0)
npm version major

# Then publish
npm publish
```

## 🔗 Use in Projects

Once published, users install with:

```bash
npm install @memvault/client
```

## 🧪 Local Testing Without Publishing

To test SDK in another project locally:

```bash
# In sdk directory
npm link

# In your test project
npm link @memvault/client

# Now you can import it
# const { MemVault } = require('@memvault/client');
```

## 📝 Package Contents

When published, NPM package includes:
- `dist/` - Compiled JavaScript
- `dist/*.d.ts` - TypeScript definitions
- `README.md` - Documentation
- `package.json` - Metadata

Excluded (via .npmignore):
- `src/` - TypeScript source
- `tsconfig.json` - Build config
- `example.js` - Test file

## 🔄 CI/CD (Optional)

For automated publishing with GitHub Actions:

```yaml
# .github/workflows/publish.yml
name: Publish to NPM

on:
  release:
    types: [created]

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
          registry-url: 'https://registry.npmjs.org'
      - run: cd sdk && npm install
      - run: cd sdk && npm run build
      - run: cd sdk && npm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

## 🎯 Next Steps

1. ✅ Source code complete
2. ⏳ Install Node.js dependencies
3. ⏳ Compile TypeScript
4. ⏳ Test with real API
5. ⏳ Publish to NPM
6. ⏳ Update frontend to use SDK

## 🐛 Troubleshooting

### "Cannot find module"
Make sure you ran `npm run build` before testing.

### "Invalid API key"
Check that your API key starts with `sk_` and is at least 32 characters.

### "Network error"
Verify backend is running at https://moderate-krystal-memvault-af80fe26.koyeb.app

### TypeScript errors
Ensure TypeScript 5.0+ is installed: `npm list typescript`
