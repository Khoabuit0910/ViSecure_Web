# ViSecure News Management Backend

Backend API cho hệ thống quản lý tin tức bảo mật ViSecure.

## Tính năng

- **Quản lý tin tức**: CRUD operations với phân quyền
- **Xác thực người dùng**: JWT-based authentication
- **Phân quyền**: Role-based access control (Admin, Editor, Author)
- **Thống kê**: Dashboard analytics và báo cáo
- **Bảo mật**: Rate limiting, input validation, data sanitization
- **SEO**: Meta tags và search optimization
- **API**: RESTful API với comprehensive documentation

## Công nghệ

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB Atlas
- **Authentication**: JWT + bcryptjs
- **Validation**: express-validator
- **Security**: helmet, cors, rate-limiting
- **File Upload**: multer
- **Environment**: dotenv

## Cài đặt

### Yêu cầu

- Node.js >= 16.0.0
- npm hoặc yarn
- MongoDB Atlas account

### Cài đặt dependencies

```bash
cd visecure_web/backend
npm install
```

### Cấu hình Environment

Tạo file `.env` từ `.env.example`:

```bash
cp .env.example .env
```

Cập nhật các biến môi trường trong `.env`:

```env
MONGODB_URI=mongodb+srv://visecure_db_user:PgFt8RQgmJaRfk8O@visecuredb.yq16x88.mongodb.net/visecure?retryWrites=true&w=majority&appName=ViSecureDB
JWT_SECRET=your_super_secure_jwt_secret_key_here
PORT=5000
NODE_ENV=development
```

### Khởi chạy

#### Development mode

```bash
npm run dev
```

#### Production mode

```bash
npm start
```

## API Documentation

### Base URL

```
http://localhost:5001/api
```

### Authentication

Sử dụng JWT token trong header:

```
Authorization: Bearer <your_jwt_token>
```

### Endpoints

#### Auth Routes (`/api/auth`)

- `POST /register` - Đăng ký admin mới (Admin only)
- `POST /login` - Đăng nhập
- `GET /me` - Lấy thông tin user hiện tại
- `PUT /profile` - Cập nhật profile
- `PUT /change-password` - Đổi mật khẩu
- `POST /logout` - Đăng xuất

#### News Routes (`/api/news`)

- `GET /` - Lấy danh sách tin tức
- `GET /featured` - Tin tức nổi bật
- `GET /breaking` - Tin tức khẩn cấp
- `GET /:id` - Chi tiết tin tức
- `POST /` - Tạo tin tức mới (Auth required)
- `PUT /:id` - Cập nhật tin tức (Auth + Permission)
- `DELETE /:id` - Xóa tin tức (Auth + Permission)
- `POST /:id/like` - Thích tin tức
- `POST /:id/share` - Chia sẻ tin tức

#### Admin Routes (`/api/admin`)

- `GET /stats` - Thống kê dashboard
- `GET /users` - Quản lý users (Admin only)
- `PUT /users/:id` - Cập nhật user (Admin only)
- `DELETE /users/:id` - Xóa user (Admin only)
- `GET /analytics/news` - Phân tích tin tức
- `POST /seed` - Tạo dữ liệu mẫu (chỉ khi chưa có admin)

### Query Parameters

#### Pagination

```
?page=1&limit=20
```

#### Filtering

```
?category=cybersecurity
?status=published
?author=admin@visecure.com
```

#### Sorting

```
?sort=newest|oldest|views|likes|title
```

#### Search

```
?search=keyword
```

## Data Models

### User Model

```javascript
{
  username: String,
  email: String,
  password: String (hashed),
  fullName: String,
  avatar: String,
  role: 'admin' | 'editor' | 'author',
  status: 'active' | 'inactive' | 'suspended',
  permissions: [String],
  lastLogin: Date,
  loginCount: Number
}
```

### News Model

```javascript
{
  title: String,
  summary: String,
  content: String,
  category: 'cybersecurity' | 'malware' | 'data-breach' | 'privacy' | 'trends' | 'tips' | 'alerts' | 'general',
  tags: [String],
  imageUrl: String,
  author: {
    name: String,
    email: String,
    avatar: String
  },
  status: 'draft' | 'published' | 'archived',
  priority: 'low' | 'normal' | 'high' | 'urgent',
  publishedAt: Date,
  views: Number,
  likes: Number,
  shares: Number,
  isBreaking: Boolean,
  isFeatured: Boolean,
  seoMetadata: {
    metaTitle: String,
    metaDescription: String,
    keywords: [String]
  }
}
```

## Permissions System

### Roles

- **Admin**: Toàn quyền
- **Editor**: Quản lý tin tức + xuất bản
- **Author**: Tạo và chỉnh sửa tin tức của mình

### Permissions

- `create_news`: Tạo tin tức
- `edit_news`: Chỉnh sửa tin tức
- `delete_news`: Xóa tin tức
- `publish_news`: Xuất bản tin tức
- `manage_users`: Quản lý users
- `view_analytics`: Xem thống kê

## Security Features

- **JWT Authentication**: Secure token-based auth
- **Password Hashing**: bcryptjs với salt rounds cao
- **Rate Limiting**: Giới hạn requests per IP
- **Input Validation**: express-validator cho all inputs
- **CORS**: Configured cross-origin requests
- **Helmet**: Security headers
- **Environment Variables**: Sensitive data protection

## Error Handling

API trả về consistent error format:

```javascript
{
  error: "Error Type",
  message: "Human readable message",
  details: [] // Validation errors if applicable
}
```

## Deployment

### Environment Variables

Production environment cần các biến:

```env
NODE_ENV=production
MONGODB_URI=<production_mongodb_uri>
JWT_SECRET=<strong_jwt_secret>
PORT=5001
```

### PM2 (Recommended)

```bash
npm install -g pm2
pm2 start server.js --name "visecure-api"
```

## Development

### Code Style

- ES6+ JavaScript
- Async/await over callbacks
- Consistent error handling
- RESTful API design
- Clear variable naming

### Testing

```bash
npm test
```

### Linting

```bash
npm run lint
```

## Contributing

1. Fork repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Create Pull Request

## License

MIT License - see LICENSE file for details