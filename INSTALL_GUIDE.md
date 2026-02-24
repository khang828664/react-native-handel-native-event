# Hướng dẫn cài đặt từ GitHub

## Cài đặt từ GitHub (trước khi publish npm)

### 1. Install từ branch chính:

```bash
npm install khang828664/react-native-handel-native-event
# hoặc
yarn add khang828664/react-native-handel-native-event
# hoặc
bun add khang828664/react-native-handel-native-event
```

### 2. Install từ branch cụ thể:

```bash
npm install khang828664/react-native-handel-native-event#develop
```

### 3. Install từ commit cụ thể:

```bash
npm install khang828664/react-native-handel-native-event#abc1234
```

### 4. Install từ tag/release:

```bash
npm install khang828664/react-native-handel-native-event#v0.1.0
```

## Trong package.json

```json
{
  "dependencies": {
    "react-native-handel-native-event": "github:khang828664/react-native-handel-native-event",

    // Hoặc với branch cụ thể
    "react-native-handel-native-event": "github:khang828664/react-native-handel-native-event#main",

    // Hoặc với commit hash
    "react-native-handel-native-event": "github:khang828664/react-native-handel-native-event#abc1234"
  }
}
```

## Setup iOS (React Native)

```bash
cd ios && pod install
```

## Setup Android

Không cần config thêm, auto-linking sẽ xử lý.

## Verify Installation

Tạo file test:

```typescript
// test.ts
import { syncUIRender } from 'react-native-handel-native-event';

async function test() {
  try {
    const result = await syncUIRender();
    console.log('✅ Library working:', result);
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

test();
```

## CI/CD Install

Trong GitHub Actions:

```yaml
- name: Install from GitHub
  run: npm install khang828664/react-native-handel-native-event#${{ github.sha }}
```

Trong GitLab CI:

```yaml
install:
  script:
    - npm install khang828664/react-native-handel-native-event#${CI_COMMIT_SHA}
```

## Private Repository

Nếu repo là private, cần setup GitHub token:

### 1. Tạo Personal Access Token trên GitHub:

- Settings → Developer settings → Personal access tokens → Tokens (classic)
- Generate new token với scope: `repo`

### 2. Sử dụng token:

```bash
npm install git+https://YOUR_TOKEN@github.com/khang828664/react-native-handel-native-event.git
```

Hoặc config trong `.npmrc`:

```
//npm.pkg.github.com/:_authToken=YOUR_TOKEN
```

### 3. Trong CI/CD:

```yaml
- name: Install from private GitHub
  run: |
    npm config set //npm.pkg.github.com/:_authToken ${{ secrets.GITHUB_TOKEN }}
    npm install khang828664/react-native-handel-native-event
```

## Troubleshooting

### Lỗi: "Failed to install"

```bash
# Clear cache và thử lại
npm cache clean --force
npm install khang828664/react-native-handel-native-event
```

### Lỗi: "No access"

- Kiểm tra repository là public
- Nếu private, đảm bảo có token với quyền `repo`

### Lỗi build

```bash
# Rebuild node_modules
rm -rf node_modules
npm install
cd ios && pod install
```

## Chuyển sang npm sau này

Khi đã publish lên npm:

```json
{
  "dependencies": {
    "react-native-handel-native-event": "^0.1.0"
  }
}
```

```bash
npm install react-native-handel-native-event
```
