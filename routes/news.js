const express = require('express');
const { body, validationResult, query } = require('express-validator');
const News = require('../models/News');
const { auth, requirePermission, optionalAuth, requireOwnership } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/news
// @desc    Get all published news (public) or all news (admin)
// @access  Public/Private
router.get('/', [
  query('page').optional().isInt({ min: 1 }).withMessage('Trang phải là số dương'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Giới hạn phải từ 1-100'),
  query('category').optional().custom((value) => !value || ['cybersecurity', 'malware', 'data-breach', 'privacy', 'trends', 'tips', 'alerts', 'general'].includes(value)),
  query('status').optional().custom((value) => !value || ['draft', 'published', 'archived'].includes(value)),
  query('search').optional(),
  query('author').optional().custom((value) => !value || value.includes('@')),
  query('sort').optional().isIn(['newest', 'oldest', 'views', 'likes', 'title'])
], optionalAuth, async (req, res) => {
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
    const category = req.query.category;
    const status = req.query.status;
    const search = req.query.search;
    const author = req.query.author;
    const sortBy = req.query.sort || 'newest';

    // Build query
    let query = {};

    // If not authenticated or not admin/editor, only show published news
    if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'editor')) {
      query.status = 'published';
    } else if (status) {
      query.status = status;
    }

    if (category) {
      query.category = category;
    }

    if (author) {
      query['author.email'] = author;
    }

    if (search) {
      query.$text = { $search: search };
    }

    // Build sort
    let sort = {};
    switch (sortBy) {
      case 'newest':
        sort = { publishedAt: -1, createdAt: -1 };
        break;
      case 'oldest':
        sort = { publishedAt: 1, createdAt: 1 };
        break;
      case 'views':
        sort = { views: -1 };
        break;
      case 'likes':
        sort = { likes: -1 };
        break;
      case 'title':
        sort = { title: 1 };
        break;
      default:
        sort = { publishedAt: -1, createdAt: -1 };
    }

    // Execute query
    const skip = (page - 1) * limit;
    
    // For list view, exclude full content to improve performance
    const selectFields = req.user && (req.user.role === 'admin' || req.user.role === 'editor') 
      ? '' // Include all fields for admin/editor
      : '-content'; // Exclude content for public view

    const [news, total] = await Promise.all([
      News.find(query)
        .select(selectFields)
        .sort(sort)
        .limit(limit)
        .skip(skip)
        .lean(),
      News.countDocuments(query)
    ]);

    const totalPages = Math.ceil(total / limit);

    res.json({
      news,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: total,
        itemsPerPage: limit,
        hasNext: page < totalPages,
        hasPrev: page > 1
      },
      filters: {
        category,
        status,
        search,
        author,
        sortBy
      }
    });
  } catch (error) {
    console.error('Get news error:', error);
    res.status(500).json({
      error: 'Server Error',
      message: 'Lỗi server khi lấy danh sách tin tức'
    });
  }
});

// @route   GET /api/news/featured
// @desc    Get featured news
// @access  Public
router.get('/featured', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;
    const news = await News.getFeaturedNews(limit);
    
    res.json({
      message: 'Lấy tin tức nổi bật thành công',
      news
    });
  } catch (error) {
    console.error('Get featured news error:', error);
    res.status(500).json({
      error: 'Server Error',
      message: 'Lỗi server khi lấy tin tức nổi bật'
    });
  }
});

// @route   GET /api/news/breaking
// @desc    Get breaking news
// @access  Public
router.get('/breaking', async (req, res) => {
  try {
    const news = await News.getBreakingNews();
    
    res.json({
      message: 'Lấy tin tức khẩn cấp thành công',
      news
    });
  } catch (error) {
    console.error('Get breaking news error:', error);
    res.status(500).json({
      error: 'Server Error',
      message: 'Lỗi server khi lấy tin tức khẩn cấp'
    });
  }
});

// @route   GET /api/news/:id
// @desc    Get single news by ID
// @access  Public
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const newsId = req.params.id;
    
    let query = { _id: newsId };
    
    // If not authenticated or not admin/editor, only show published news
    if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'editor')) {
      query.status = 'published';
    }

    const news = await News.findOne(query);
    
    if (!news) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Không tìm thấy tin tức'
      });
    }

    // Increment view count for published news
    if (news.status === 'published') {
      await news.incrementViews();
    }

    res.json({
      message: 'Lấy tin tức thành công',
      news
    });
  } catch (error) {
    console.error('Get news by ID error:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({
        error: 'Invalid ID',
        message: 'ID tin tức không hợp lệ'
      });
    }
    
    res.status(500).json({
      error: 'Server Error',
      message: 'Lỗi server khi lấy tin tức'
    });
  }
});

// @route   POST /api/news
// @desc    Create new news
// @access  Private (requires create_news permission)
router.post('/', [
  body('title')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Tiêu đề từ 1-200 ký tự'),
  body('summary')
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Tóm tắt từ 1-500 ký tự'),
  body('content')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Nội dung là bắt buộc'),
  body('category')
    .isIn(['cybersecurity', 'malware', 'data-breach', 'privacy', 'trends', 'tips', 'alerts', 'general'])
    .withMessage('Danh mục không hợp lệ'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags phải là mảng'),
  body('imageUrl')
    .optional()
    .isURL()
    .withMessage('URL hình ảnh không hợp lệ'),
  body('priority')
    .optional()
    .isIn(['low', 'normal', 'high', 'urgent'])
    .withMessage('Mức độ ưu tiên không hợp lệ')
], auth, requirePermission('create_news'), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      console.log('Request body:', req.body);
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Dữ liệu không hợp lệ',
        details: errors.array()
      });
    }

    const {
      title,
      summary,
      content,
      category,
      tags = [],
      imageUrl,
      priority = 'normal',
      status = 'draft',
      publishedAt,
      isBreaking = false,
      isFeatured = false,
      seoMetadata = {}
    } = req.body;

    // Get author info from authenticated user
    const user = req.userModel;
    
    const newsData = {
      title,
      summary,
      content,
      category,
      tags,
      imageUrl,
      priority,
      status,
      isBreaking,
      isFeatured,
      seoMetadata,
      author: {
        name: user.fullName,
        email: user.email,
        avatar: user.avatar
      }
    };

    // Only set publishedAt if status is published or if explicitly provided
    if (status === 'published') {
      newsData.publishedAt = publishedAt || new Date();
    } else if (publishedAt) {
      newsData.publishedAt = publishedAt;
    }
    
    const news = new News(newsData);

    await news.save();

    res.status(201).json({
      message: 'Tạo tin tức thành công',
      news
    });
  } catch (error) {
    console.error('Create news error:', error);
    res.status(500).json({
      error: 'Server Error',
      message: 'Lỗi server khi tạo tin tức'
    });
  }
});

// @route   PUT /api/news/:id
// @desc    Update news
// @access  Private (requires edit_news permission + ownership check)
router.put('/:id', [
  body('title')
    .optional()
    .isLength({ min: 1, max: 200 })
    .withMessage('Tiêu đề từ 1-200 ký tự'),
  body('summary')
    .optional()
    .isLength({ min: 1, max: 500 })
    .withMessage('Tóm tắt từ 1-500 ký tự'),
  body('content')
    .optional()
    .isLength({ min: 1 })
    .withMessage('Nội dung không được rỗng'),
  body('category')
    .optional()
    .isIn(['cybersecurity', 'malware', 'data-breach', 'privacy', 'trends', 'tips', 'alerts', 'general'])
    .withMessage('Danh mục không hợp lệ'),
  body('status')
    .optional()
    .isIn(['draft', 'published', 'archived'])
    .withMessage('Trạng thái không hợp lệ'),
  body('priority')
    .optional()
    .isIn(['low', 'normal', 'high', 'urgent'])
    .withMessage('Mức độ ưu tiên không hợp lệ')
], auth, requirePermission('edit_news'), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Dữ liệu không hợp lệ',
        details: errors.array()
      });
    }

    const newsId = req.params.id;
    const user = req.userModel;
    
    const news = await News.findById(newsId);
    if (!news) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Không tìm thấy tin tức'
      });
    }

    // Check ownership (authors can only edit their own news, admins can edit any)
    if (user.role !== 'admin' && news.author.email !== user.email) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Bạn chỉ có thể chỉnh sửa tin tức của mình'
      });
    }

    // Check if user can publish news
    const { status } = req.body;
    if (status === 'published' && !user.hasPermission('publish_news')) {
      return res.status(403).json({
        error: 'Insufficient Permissions',
        message: 'Bạn không có quyền xuất bản tin tức'
      });
    }

    // Update allowed fields
    const allowedUpdates = [
      'title', 'summary', 'content', 'category', 'tags', 
      'imageUrl', 'priority', 'isBreaking', 'isFeatured', 
      'seoMetadata'
    ];

    // Only editors and admins can change status
    if (user.hasPermission('publish_news')) {
      allowedUpdates.push('status');
    }

    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        news[field] = req.body[field];
      }
    });

    await news.save();

    res.json({
      message: 'Cập nhật tin tức thành công',
      news
    });
  } catch (error) {
    console.error('Update news error:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({
        error: 'Invalid ID',
        message: 'ID tin tức không hợp lệ'
      });
    }
    
    res.status(500).json({
      error: 'Server Error',
      message: 'Lỗi server khi cập nhật tin tức'
    });
  }
});

// @route   DELETE /api/news/:id
// @desc    Delete news
// @access  Private (requires delete_news permission + ownership check)
router.delete('/:id', auth, requirePermission('delete_news'), async (req, res) => {
  try {
    const newsId = req.params.id;
    const user = req.userModel;
    
    const news = await News.findById(newsId);
    if (!news) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Không tìm thấy tin tức'
      });
    }

    // Check ownership (only admins and editors can delete, or author for their own drafts)
    if (user.role !== 'admin' && user.role !== 'editor') {
      if (news.author.email !== user.email || news.status !== 'draft') {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Bạn chỉ có thể xóa bản thảo của mình'
        });
      }
    }

    await News.findByIdAndDelete(newsId);

    res.json({
      message: 'Xóa tin tức thành công'
    });
  } catch (error) {
    console.error('Delete news error:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({
        error: 'Invalid ID',
        message: 'ID tin tức không hợp lệ'
      });
    }
    
    res.status(500).json({
      error: 'Server Error',
      message: 'Lỗi server khi xóa tin tức'
    });
  }
});

// @route   POST /api/news/:id/like
// @desc    Like/unlike news
// @access  Public
router.post('/:id/like', optionalAuth, async (req, res) => {
  try {
    const newsId = req.params.id;
    
    const news = await News.findOne({ _id: newsId, status: 'published' });
    if (!news) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Không tìm thấy tin tức'
      });
    }

    await news.incrementLikes();

    res.json({
      message: 'Đã thích tin tức',
      likes: news.likes
    });
  } catch (error) {
    console.error('Like news error:', error);
    res.status(500).json({
      error: 'Server Error',
      message: 'Lỗi server khi thích tin tức'
    });
  }
});

// @route   POST /api/news/:id/share
// @desc    Increment share count
// @access  Public
router.post('/:id/share', async (req, res) => {
  try {
    const newsId = req.params.id;
    
    const news = await News.findOne({ _id: newsId, status: 'published' });
    if (!news) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Không tìm thấy tin tức'
      });
    }

    await news.incrementShares();

    res.json({
      message: 'Đã chia sẻ tin tức',
      shares: news.shares
    });
  } catch (error) {
    console.error('Share news error:', error);
    res.status(500).json({
      error: 'Server Error',
      message: 'Lỗi server khi chia sẻ tin tức'
    });
  }
});

module.exports = router;