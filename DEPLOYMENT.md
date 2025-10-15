# ViSecure Backend Deployment

## Railway Deployment

This backend is deployed on Railway platform for automatic scaling and 24/7 availability.

### Environment Variables Required:
- `PORT`: Auto-set by Railway
- `MONGODB_URI`: MongoDB Atlas connection string
- `JWT_SECRET`: Secret key for JWT tokens
- `NODE_ENV`: Set to "production"
- `CORS_ORIGIN`: Frontend domain for CORS

### Deployment URL:
- Production API: `https://visecure-backend-production.up.railway.app`

### Features:
- ✅ MongoDB Atlas integration
- ✅ JWT Authentication  
- ✅ News CRUD operations
- ✅ Admin permissions
- ✅ CORS configuration
- ✅ Error handling
- ✅ Request validation

### API Endpoints:
- `GET /api/health` - Health check
- `POST /api/auth/login` - Admin login
- `GET /api/auth/verify` - Verify token
- `GET /api/news` - Get all news
- `POST /api/news` - Create news (Admin)
- `PUT /api/news/:id` - Update news (Admin)
- `DELETE /api/news/:id` - Delete news (Admin)
- `GET /api/news/stats` - Dashboard stats (Admin)

### Auto-deployment:
Railway automatically deploys when code is pushed to main branch.