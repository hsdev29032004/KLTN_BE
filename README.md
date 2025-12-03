## Hướng dẫn cài đặt dự án

### 1. Tải dự án về bằng lệnh 
```
git clone https://github.com/hsdev29032004/KLTN_BE
```

### 2. Cài đặt Node.js 22.17.0 bằng NVM

**Bước 1:** Tải và cài đặt NVM cho Windows
- Truy cập trang [nvm-windows releases](https://github.com/coreybutler/nvm-windows/releases)
- Tải file `nvm-setup.zip` mới nhất và cài đặt.

**Bước 2:** Mở PowerShell và chạy lệnh sau để cài Node.js 22.17.10:
```powershell
nvm install 22.17.10
nvm use 22.17.10
```

### 3. Cài đặt Yarn và thiết lập phiên bản

**Bước 1:** Cài đặt Yarn toàn cục:
```powershell
npm install -g yarn
```

**Bước 2:** Thiết lập Yarn version 4.9.1 cho dự án:
```powershell
yarn set version 4.9.1
```

### 4. Mở dự án rồi chạy lệnh dưới để tải các package cần thiết

```powershell
yarn install
```
hoặc
```
yarn i
```
