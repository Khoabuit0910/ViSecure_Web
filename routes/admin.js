const express = require('express');
const { body, validationResult, query } = require('express-validator');
const News = require('../models/News');
const User = require('../models/User');
const { auth, requirePermission, adminOnly } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/admin/stats
// @desc    Get dashboard statistics
// @access  Private (Admin/Editor)
router.get('/stats', auth, requirePermission('view_analytics'), async (req, res) => {
  try {
    const [
      totalNews,
      publishedNews,
      draftNews,
      archivedNews,
      totalUsers,
      activeUsers,
      totalViews,
      totalLikes,
      recentNews,
      topCategories
    ] = await Promise.all([
      // News statistics
      News.countDocuments(),
      News.countDocuments({ status: 'published' }),
      News.countDocuments({ status: 'draft' }),
      News.countDocuments({ status: 'archived' }),
      
      // User statistics
      User.countDocuments(),
      User.countDocuments({ status: 'active' }),
      
      // Engagement statistics
      News.aggregate([
        { $group: { _id: null, totalViews: { $sum: '$views' } } }
      ]).then(result => result[0]?.totalViews || 0),
      
      News.aggregate([
        { $group: { _id: null, totalLikes: { $sum: '$likes' } } }
      ]).then(result => result[0]?.totalLikes || 0),
      
      // Recent news
      News.find({ status: 'published' })
        .sort({ publishedAt: -1 })
        .limit(5)
        .select('title publishedAt views likes author')
        .lean(),
      
      // Top categories
      News.aggregate([
        { $match: { status: 'published' } },
        { 
          $group: { 
            _id: '$category', 
            count: { $sum: 1 },
            totalViews: { $sum: '$views' }
          } 
        },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ])
    ]);

    // Calculate trends (compare with last month)
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);

    const [
      newNewsThisMonth,
      newUsersThisMonth,
      viewsThisMonth
    ] = await Promise.all([
      News.countDocuments({ 
        createdAt: { $gte: lastMonth },
        status: 'published'
      }),
      
      User.countDocuments({ 
        createdAt: { $gte: lastMonth } 
      }),
      
      News.aggregate([
        { 
          $match: { 
            publishedAt: { $gte: lastMonth },
            status: 'published'
          }
        },
        { $group: { _id: null, views: { $sum: '$views' } } }
      ]).then(result => result[0]?.views || 0)
    ]);

    res.json({
      stats: {
        news: {
          total: totalNews,
          published: publishedNews,
          draft: draftNews,
          archived: archivedNews,
          newThisMonth: newNewsThisMonth
        },
        users: {
          total: totalUsers,
          active: activeUsers,
          newThisMonth: newUsersThisMonth
        },
        engagement: {
          totalViews,
          totalLikes,
          viewsThisMonth
        }
      },
      recentNews,
      topCategories,
      trends: {
        newNews: newNewsThisMonth,
        newUsers: newUsersThisMonth,
        views: viewsThisMonth
      }
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      error: 'Server Error',
      message: 'Lỗi server khi lấy thống kê'
    });
  }
});

// @route   GET /api/admin/users
// @desc    Get all users (admin only)
// @access  Private (Admin)
router.get('/users', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('role').optional().isIn(['admin', 'editor', 'author']),
  query('status').optional().isIn(['active', 'inactive', 'suspended']),
  query('search').optional().isLength({ min: 1 })
], auth, requirePermission('manage_users'), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Tham số không hợp lệ',
        details: errors.array()
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const role = req.query.role;
    const status = req.query.status;
    const search = req.query.search;

    let query = {};

    if (role) query.role = role;
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { fullName: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      User.find(query)
        .select('-password')
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip)
        .lean(),
      User.countDocuments(query)
    ]);

    const totalPages = Math.ceil(total / limit);

    res.json({
      users,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: total,
        itemsPerPage: limit,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      error: 'Server Error',
      message: 'Lỗi server khi lấy danh sách người dùng'
    });
  }
});

// @route   PUT /api/admin/users/:id
// @desc    Update user (admin only)
// @access  Private (Admin)
router.put('/users/:id', [
  body('role')
    .optional()
    .isIn(['admin', 'editor', 'author'])
    .withMessage('Role không hợp lệ'),
  body('status')
    .optional()
    .isIn(['active', 'inactive', 'suspended'])
    .withMessage('Trạng thái không hợp lệ'),
  body('fullName')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Họ tên không được quá 100 ký tự')
], auth, requirePermission('manage_users'), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Dữ liệu không hợp lệ',
        details: errors.array()
      });
    }

    const userId = req.params.id;
    const { role, status, fullName } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Không tìm thấy người dùng'
      });
    }

    // Prevent user from modifying themselves
    if (userId === req.user.userId) {
      return res.status(400).json({
        error: 'Invalid Action',
        message: 'Không thể chỉnh sửa thông tin của chính mình'
      });
    }

    if (role !== undefined) user.role = role;
    if (status !== undefined) user.status = status;
    if (fullName !== undefined) user.fullName = fullName;

    await user.save();

    res.json({
      message: 'Cập nhật người dùng thành công',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        status: user.status,
        permissions: user.permissions
      }
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      error: 'Server Error',
      message: 'Lỗi server khi cập nhật người dùng'
    });
  }
});

// @route   DELETE /api/admin/users/:id
// @desc    Delete user (admin only)
// @access  Private (Admin)
router.delete('/users/:id', auth, adminOnly, async (req, res) => {
  try {
    const userId = req.params.id;

    // Prevent user from deleting themselves
    if (userId === req.user.userId) {
      return res.status(400).json({
        error: 'Invalid Action',
        message: 'Không thể xóa tài khoản của chính mình'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Không tìm thấy người dùng'
      });
    }

    // Check if user has published news
    const userNews = await News.countDocuments({ 'author.email': user.email });
    if (userNews > 0) {
      return res.status(400).json({
        error: 'Cannot Delete',
        message: `Không thể xóa người dùng đã có ${userNews} tin tức. Hãy vô hiệu hóa thay vì xóa.`
      });
    }

    await User.findByIdAndDelete(userId);

    res.json({
      message: 'Xóa người dùng thành công'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      error: 'Server Error',
      message: 'Lỗi server khi xóa người dùng'
    });
  }
});

// @route   GET /api/admin/analytics/news
// @desc    Get detailed news analytics
// @access  Private (Admin/Editor)
router.get('/analytics/news', [
  query('period').optional().isIn(['7d', '30d', '90d', '1y']).withMessage('Khoảng thời gian không hợp lệ'),
  query('category').optional().isIn(['cybersecurity', 'malware', 'data-breach', 'privacy', 'trends', 'tips', 'alerts', 'general'])
], auth, requirePermission('view_analytics'), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation Error',
        details: errors.array()
      });
    }

    const period = req.query.period || '30d';
    const category = req.query.category;

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    
    switch (period) {
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(startDate.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
    }

    let matchQuery = {
      status: 'published',
      publishedAt: { $gte: startDate, $lte: endDate }
    };

    if (category) {
      matchQuery.category = category;
    }

    const [
      viewsByDay,
      topArticles,
      categoryStats,
      authorStats
    ] = await Promise.all([
      // Views by day
      News.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$publishedAt'
              }
            },
            views: { $sum: '$views' },
            likes: { $sum: '$likes' },
            articles: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]),

      // Top performing articles
      News.find(matchQuery)
        .sort({ views: -1 })
        .limit(10)
        .select('title views likes shares publishedAt author category')
        .lean(),

      // Category statistics
      News.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: '$category',
            articles: { $sum: 1 },
            totalViews: { $sum: '$views' },
            totalLikes: { $sum: '$likes' },
            avgViews: { $avg: '$views' }
          }
        },
        { $sort: { totalViews: -1 } }
      ]),

      // Author statistics
      News.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: '$author.email',
            authorName: { $first: '$author.name' },
            articles: { $sum: 1 },
            totalViews: { $sum: '$views' },
            totalLikes: { $sum: '$likes' },
            avgViews: { $avg: '$views' }
          }
        },
        { $sort: { totalViews: -1 } },
        { $limit: 10 }
      ])
    ]);

    res.json({
      period,
      dateRange: { startDate, endDate },
      analytics: {
        viewsByDay,
        topArticles,
        categoryStats,
        authorStats
      }
    });
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({
      error: 'Server Error',
      message: 'Lỗi server khi lấy thống kê phân tích'
    });
  }
});

// @route   POST /api/admin/seed
// @desc    Seed initial admin user and sample data
// @access  Public (only works if no admin exists)
router.post('/seed', async (req, res) => {
  try {
    // Check if any admin already exists
    const existingAdmin = await User.findOne({ role: 'admin' });
    if (existingAdmin) {
      return res.status(400).json({
        error: 'Admin Exists',
        message: 'Admin đã tồn tại, không thể tạo seed data'
      });
    }

    // Create default admin
    const admin = new User({
      username: 'admin',
      email: process.env.ADMIN_EMAIL || 'admin@visecure.com',
      password: process.env.ADMIN_PASSWORD || 'admin123456',
      fullName: 'ViSecure Admin',
      role: 'admin',
      status: 'active',
      emailVerified: true
    });

    await admin.save();

    // Create sample news
    const sampleNews = [
      {
        title: 'Phát hiện lỗ hổng bảo mật nghiêm trọng trong hệ điều hành phổ biến',
        summary: 'Các chuyên gia bảo mật vừa phát hiện một lỗ hổng zero-day có thể cho phép kẻ tấn công chiếm quyền kiểm soát hoàn toàn hệ thống.',
        content: `<p>Một lỗ hổng bảo mật nghiêm trọng vừa được phát hiện trong hệ điều hành được sử dụng rộng rãi, có thể ảnh hưởng đến hàng triệu người dùng trên toàn thế giới.</p>
        
        <h3>Chi tiết lỗ hổng</h3>
        <p>Lỗ hổng này, được đánh dấu với mức độ nguy hiểm cao, cho phép kẻ tấn công thực hiện các hành động sau:</p>
        <ul>
          <li>Thực thi mã độc từ xa</li>
          <li>Chiếm quyền quản trị hệ thống</li>
          <li>Đánh cắp dữ liệu nhạy cảm</li>
        </ul>
        
        <h3>Khuyến nghị bảo mật</h3>
        <p>Người dùng được khuyến cáo:</p>
        <ol>
          <li>Cập nhật hệ điều hành ngay lập tức</li>
          <li>Kích hoạt tường lửa và antivirus</li>
          <li>Thường xuyên sao lưu dữ liệu quan trọng</li>
        </ol>`,
        category: 'cybersecurity',
        tags: ['lỗ hổng', 'bảo mật', 'hệ điều hành', 'zero-day'],
        priority: 'urgent',
        status: 'published',
        publishedAt: new Date(),
        isBreaking: true,
        isFeatured: true,
        author: {
          name: admin.fullName,
          email: admin.email,
          avatar: admin.avatar
        }
      },
      {
        title: '10 mẹo bảo mật cơ bản mọi người dùng internet nên biết',
        summary: 'Hướng dẫn chi tiết về các biện pháp bảo mật cơ bản giúp bảo vệ bản thân khỏi các mối đe dọa trực tuyến phổ biến.',
        content: `<p>Trong thời đại số hóa, việc bảo vệ thông tin cá nhân trên internet là vô cùng quan trọng. Dưới đây là 10 mẹo bảo mật cơ bản mà mọi người nên áp dụng.</p>
        
        <h3>1. Sử dụng mật khẩu mạnh</h3>
        <p>Mật khẩu nên có ít nhất 12 ký tự, bao gồm chữ hoa, chữ thường, số và ký tự đặc biệt.</p>
        
        <h3>2. Kích hoạt xác thực 2 yếu tố (2FA)</h3>
        <p>Thêm một lớp bảo mật bổ sung cho tài khoản của bạn.</p>
        
        <h3>3. Cập nhật phần mềm thường xuyên</h3>
        <p>Luôn cài đặt các bản cập nhật bảo mật mới nhất.</p>`,
        category: 'tips',
        tags: ['mẹo', 'bảo mật', 'hướng dẫn', 'người dùng'],
        priority: 'normal',
        status: 'published',
        publishedAt: new Date(Date.now() - 86400000), // 1 day ago
        isFeatured: true,
        author: {
          name: admin.fullName,
          email: admin.email,
          avatar: admin.avatar
        }
      }
    ];

    await News.insertMany(sampleNews);

    res.json({
      message: 'Seed data đã được tạo thành công',
      admin: {
        username: admin.username,
        email: admin.email,
        role: admin.role
      },
      sampleNewsCount: sampleNews.length
    });
  } catch (error) {
    console.error('Seed data error:', error);
    res.status(500).json({
      error: 'Server Error',
      message: 'Lỗi server khi tạo seed data'
    });
  }
});

// @route   POST /api/admin/seed-data
// @desc    Seed initial data (temporary endpoint for Railway deployment)
// @access  Private (Admin only)
router.post('/seed-data', auth, adminOnly, async (req, res) => {
  try {
    // Check if news already exists
    const existingNews = await News.countDocuments();
    if (existingNews > 0) {
      return res.status(200).json({
        success: true,
        message: 'Dữ liệu đã tồn tại',
        data: { existingCount: existingNews }
      });
    }

    // Get admin user for author reference
    const adminUser = await User.findOne({ username: 'admin' });
    if (!adminUser) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy admin user'
      });
    }

    const sampleNews = [
      {
        title: 'Phát hiện lỗ hổng bảo mật nghiêm trọng trong hệ điều hành phổ biến',
        summary: 'Các chuyên gia bảo mật vừa phát hiện một lỗ hổng bảo mật nghiêm trọng ảnh hưởng đến hàng triệu thiết bị trên toàn thế giới. Người dùng cần cập nhật ngay để bảo vệ dữ liệu cá nhân.',
        content: `<h2>Lỗ hổng bảo mật nghiêm trọng được phát hiện</h2>
      <p>Các nhà nghiên cứu bảo mật vừa công bố phát hiện một lỗ hổng bảo mật nghiêm trọng ảnh hưởng đến hàng triệu thiết bị sử dụng hệ điều hành phổ biến. Lỗ hổng này có thể cho phép kẻ tấn công từ xa thực thi mã độc và chiếm quyền kiểm soát thiết bị.</p>
      
      <h3>Chi tiết lỗ hổng</h3>
      <p>Lỗ hổng được mã hóa là CVE-2024-XXXX, có mức độ nghiêm trọng cao với điểm CVSS 9.8/10. Nó nằm trong thành phần xử lý giao thức mạng và có thể bị khai thác mà không cần xác thực.</p>
      
      <h3>Khuyến nghị bảo mật</h3>
      <p>Người dùng được khuyến nghị thực hiện ngay các biện pháp sau:</p>
      <ol>
        <li>Cập nhật hệ điều hành lên phiên bản mới nhất</li>
        <li>Bật tường lửa và cấu hình quy tắc bảo mật</li>
        <li>Theo dõi hoạt động bất thường trên thiết bị</li>
        <li>Sao lưu dữ liệu quan trọng</li>
      </ol>`,
        category: 'cybersecurity',
        tags: ['lỗ hổng bảo mật', 'cập nhật', 'khẩn cấp', 'cve'],
        author: {
          name: adminUser.fullName,
          email: adminUser.email
        },
        status: 'published',
        priority: 'urgent',
        publishedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
        views: Math.floor(Math.random() * 3000) + 1000,
        likes: Math.floor(Math.random() * 200) + 50,
        shares: 0,
        readingTime: 1,
        seoMetadata: { keywords: [] },
        isBreaking: true,
        isFeatured: true
      },
      {
        title: '10 mẹo bảo mật cơ bản mọi người dùng internet nên biết',
        summary: 'Trong thời đại số hóa, việc bảo vệ thông tin cá nhân trên internet là vô cùng quan trọng. Dưới đây là 10 mẹo bảo mật đơn giản nhưng hiệu quả mà mọi người nên áp dụng.',
        content: `<h2>10 Mẹo Bảo Mật Internet Thiết Yếu</h2>
      <p>Bảo mật thông tin cá nhân trên internet không còn là điều tùy chọn mà là điều bắt buộc. Dưới đây là những mẹo quan trọng nhất:</p>
      
      <h3>1. Sử dụng mật khẩu mạnh và duy nhất</h3>
      <p>Mật khẩu nên có ít nhất 12 ký tự, bao gồm chữ hoa, chữ thường, số và ký tự đặc biệt.</p>
      
      <h3>2. Kích hoạt xác thực hai yếu tố (2FA)</h3>
      <p>2FA thêm một lớp bảo vệ quan trọng cho tài khoản của bạn.</p>`,
        category: 'tips',
        tags: ['bảo mật', 'mẹo hay', 'hướng dẫn', 'người dùng'],
        author: {
          name: adminUser.fullName,
          email: adminUser.email
        },
        status: 'published',
        priority: 'normal',
        publishedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        views: Math.floor(Math.random() * 4000) + 2000,
        likes: Math.floor(Math.random() * 300) + 100,
        shares: 0,
        readingTime: 1,
        seoMetadata: { keywords: [] },
        isBreaking: false,
        isFeatured: true
      },
      {
        title: 'Cảnh báo: Chiến dịch tấn công ransomware mới nhắm vào doanh nghiệp SME',
        summary: 'Một chiến dịch ransomware mới đang nhắm vào các doanh nghiệp vừa và nhỏ tại Việt Nam. Hacker sử dụng phương thức tấn công tinh vi qua email giả mạo hóa đơn.',
        content: `<h2>Cảnh Báo Ransomware Mới</h2>
      <p>Các chuyên gia an ninh mạng đã phát hiện một chiến dịch tấn công ransomware quy mô lớn đang nhắm vào các doanh nghiệp SME tại Việt Nam và Đông Nam Á.</p>
      
      <h3>Phương thức tấn công</h3>
      <p>Hacker gửi email giả mạo hóa đơn hoặc đơn hàng với file đính kèm chứa mã độc.</p>`,
        category: 'alerts',
        tags: ['ransomware', 'cảnh báo', 'doanh nghiệp', 'sme'],
        author: {
          name: adminUser.fullName,
          email: adminUser.email
        },
        status: 'published',
        priority: 'high',
        publishedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
        views: Math.floor(Math.random() * 2500) + 1500,
        likes: Math.floor(Math.random() * 150) + 75,
        shares: 0,
        readingTime: 1,
        seoMetadata: { keywords: [] },
        isBreaking: true,
        isFeatured: false
      },
      {
        title: 'Malware mới trên Android: Trojan ngân hàng nguy hiểm đánh cắp OTP',
        summary: 'Phát hiện loại malware mới trên Android có khả năng đánh cắp mã OTP và thông tin thẻ ngân hàng. Hơn 100,000 thiết bị đã bị nhiễm tại Việt Nam.',
        content: `<h2>Cảnh Báo Trojan Ngân Hàng Mới</h2>
      <p>Các nhà nghiên cứu bảo mật đã phát hiện một biến thể mới của trojan ngân hàng trên Android với khả năng đánh cắp mã OTP và thông tin nhạy cảm.</p>`,
        category: 'malware',
        tags: ['android', 'trojan', 'ngân hàng', 'otp'],
        author: {
          name: adminUser.fullName,
          email: adminUser.email
        },
        status: 'published',
        priority: 'urgent',
        publishedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), // 4 days ago
        views: Math.floor(Math.random() * 5000) + 3000,
        likes: Math.floor(Math.random() * 400) + 200,
        shares: 0,
        readingTime: 1,
        seoMetadata: { keywords: [] },
        isBreaking: true,
        isFeatured: false
      },
      {
        title: 'Rò rỉ dữ liệu lớn: 500 triệu tài khoản người dùng bị lộ thông tin',
        summary: 'Một công ty công nghệ lớn vừa xác nhận vụ rò rỉ dữ liệu ảnh hưởng đến 500 triệu người dùng trên toàn cầu. Thông tin cá nhân, email và số điện thoại bị lộ.',
        content: `<h2>Vụ Rò Rỉ Dữ Liệu Quy Mô Lớn</h2>
      <p>Một trong những vụ rò rỉ dữ liệu lớn nhất trong năm vừa được phát hiện, ảnh hưởng đến hàng trăm triệu người dùng trên toàn thế giới.</p>`,
        category: 'data-breach',
        tags: ['rò rỉ dữ liệu', 'data breach', 'bảo mật'],
        author: {
          name: adminUser.fullName,
          email: adminUser.email
        },
        status: 'published',
        priority: 'high',
        publishedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        views: Math.floor(Math.random() * 6000) + 4000,
        likes: Math.floor(Math.random() * 500) + 300,
        shares: 0,
        readingTime: 1,
        seoMetadata: { keywords: [] },
        isBreaking: true,
        isFeatured: false
      },
      {
        title: 'Xu hướng bảo mật năm 2025: AI và Machine Learning dẫn đầu',
        summary: 'Công nghệ AI và Machine Learning đang thay đổi cách chúng ta bảo vệ dữ liệu. Tìm hiểu về các xu hướng bảo mật hàng đầu sẽ định hình năm 2025.',
        content: `<h2>Xu Hướng Bảo Mật 2025</h2>
      <p>Ngành an ninh mạng đang chứng kiến những thay đổi lớn với sự phát triển của AI, cloud computing và IoT.</p>`,
        category: 'trends',
        tags: ['ai', 'xu hướng', '2025', 'machine learning'],
        author: {
          name: adminUser.fullName,
          email: adminUser.email
        },
        status: 'published',
        priority: 'normal',
        publishedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000), // 6 days ago
        views: Math.floor(Math.random() * 3000) + 1500,
        likes: Math.floor(Math.random() * 250) + 100,
        shares: 0,
        readingTime: 1,
        seoMetadata: { keywords: [] },
        isBreaking: false,
        isFeatured: true
      }
    ];

    await News.insertMany(sampleNews);

    res.status(201).json({
      success: true,
      message: 'Dữ liệu mẫu đã được tạo thành công',
      data: {
        newsCount: sampleNews.length,
        createdAt: new Date()
      }
    });

  } catch (error) {
    console.error('Seed data error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tạo dữ liệu mẫu',
      error: error.message
    });
  }
});

module.exports = router;