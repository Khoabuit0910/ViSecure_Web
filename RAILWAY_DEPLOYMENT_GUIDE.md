# 🚀 Railway Deployment Guide - ViSecure Backend

## Bước 1: Chuẩn bị Repository

✅ Code đã được push lên: `https://github.com/Khoabuit0910/ViSecure_Web.git`

## Bước 2: Deploy trên Railway

### 2.1 Truy cập Railway
1. Vào https://railway.app
2. **Login with GitHub** (dùng account Khoabuit0910)
3. Click **"New Project"**
4. Chọn **"Deploy from GitHub repo"**
5. Chọn repository **"ViSecure_Web"**

### 2.2 Cấu hình Environment Variables

Trong Railway Dashboard, vào **Variables tab** và thêm các biến sau:

#### 🔑 Biến Bắt Buộc:

```bash
MONGODB_URI=mongodb+srv://khoabuit0910:Khoa1234@cluster0.7hn7n.mongodb.net/visecure?retryWrites=true&w=majority
JWT_SECRET=visecure-super-secret-jwt-key-2024-khoa-production
NODE_ENV=production
```

#### ⚙️ Biến Tùy Chọn (có giá trị mặc định):

```bash
PORT=3001
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## Bước 3: Kiểm Tra Deployment

### 3.1 Chờ Deploy Hoàn Thành
- Railway sẽ tự động build và deploy
- Thời gian: 2-5 phút
- Xem logs trong **Deployments tab**

### 3.2 Lấy Production URL
- Sau khi deploy thành công, Railway sẽ cung cấp URL
- Format: `https://[random-name].railway.app`

### 3.3 Test API Endpoints
```bash
# Health Check
curl https://[your-app].railway.app/api/health

# News Endpoints
curl https://[your-app].railway.app/api/public/news
curl https://[your-app].railway.app/api/public/news/breaking
```

## Bước 4: Cập Nhật Flutter App

Trong Flutter app, update base URL:
```dart
class ApiConfig {
  static const String baseUrl = 'https://[your-app].railway.app/api';
}
```

## 🔧 Troubleshooting

### Lỗi Build Failed
- Kiểm tra `package.json` có đầy đủ dependencies
- Xem logs trong Railway dashboard

### Lỗi Database Connection
- Kiểm tra MONGODB_URI đúng format
- Kiểm tra MongoDB Atlas cho phép connections từ Railway IPs (0.0.0.0/0)

### API Không Response
- Kiểm tra PORT environment variable
- Kiểm tra health endpoint trước

## 🎯 Ưu Điểm Railway vs Render

✅ **Không có cold start** (luôn sẵn sàng)  
✅ **Deploy nhanh hơn** (2-3 phút vs 10+ phút)  
✅ **Logs real-time** dễ debug  
✅ **Auto-scaling** tốt hơn  
✅ **$5 credit/tháng** đủ xài project nhỏ  

## 📱 Cập Nhật Mobile App

Sau khi có Railway URL, cập nhật trong Flutter:

1. **lib/core/config/api_config.dart**:
```dart
class ApiConfig {
  static const String baseUrl = 'https://[railway-url].railway.app/api';
}
```

2. **Test từ mobile device** để đảm bảo kết nối OK

---

**🚀 Sẵn sàng deploy! Railway ổn định và nhanh hơn Render rất nhiều.**