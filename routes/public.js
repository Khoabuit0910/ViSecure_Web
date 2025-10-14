const express = require('express');
const { query, validationResult } = require('express-validator');
const News = require('../models/News');

const router = express.Router();

// @route   GET /api/public/news
// @desc    Get published news for mobile app (public access)
// @access  Public
router.get('/news', [
  query('page').optional().isInt({ min: 1 }).withMessage('Trang phải là số dương'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Giới hạn phải từ 1-50'),
  query('category').optional().custom((value) => !value || ['cybersecurity', 'malware', 'data-breach', 'privacy', 'trends', 'tips', 'alerts', 'general'].includes(value)),
  query('search').optional(),
  query('sort').optional().isIn(['newest', 'oldest', 'popular', 'trending'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'Tham số không hợp lệ',
        details: errors.array()
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const category = req.query.category;
    const search = req.query.search;
    const sortBy = req.query.sort || 'newest';

    // Build query - only published news
    let query = { status: 'published' };

    if (category) {
      query.category = category;
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { summary: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } }
      ];
    }

    // Build sort
    let sort = {};
    switch (sortBy) {
      case 'oldest':
        sort = { publishedAt: 1 };
        break;
      case 'popular':
        sort = { views: -1, likes: -1 };
        break;
      case 'trending':
        sort = { likes: -1, views: -1, publishedAt: -1 };
        break;
      case 'newest':
      default:
        sort = { publishedAt: -1 };
        break;
    }

    // Execute query
    const skip = (page - 1) * limit;
    const news = await News.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .select('-__v')
      .lean();

    const total = await News.countDocuments(query);

    res.json({
      success: true,
      data: {
        news,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasMore: page < Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Get public news error:', error);
    res.status(500).json({
      success: false,
      error: 'Server Error',
      message: 'Lỗi server khi lấy tin tức'
    });
  }
});

// @route   GET /api/public/news/breaking
// @desc    Get breaking news for mobile app
// @access  Public
router.get('/news/breaking', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;

    const news = await News.find({
      status: 'published',
      isBreaking: true
    })
      .sort({ publishedAt: -1 })
      .limit(limit)
      .select('-__v')
      .lean();

    res.json({
      success: true,
      data: {
        news,
        count: news.length
      }
    });

  } catch (error) {
    console.error('Get breaking news error:', error);
    res.status(500).json({
      success: false,
      error: 'Server Error',
      message: 'Lỗi server khi lấy tin nóng'
    });
  }
});

// @route   GET /api/public/news/featured
// @desc    Get featured news for mobile app
// @access  Public
router.get('/news/featured', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;

    const news = await News.find({
      status: 'published',
      isFeatured: true
    })
      .sort({ publishedAt: -1 })
      .limit(limit)
      .select('-__v')
      .lean();

    res.json({
      success: true,
      data: {
        news,
        count: news.length
      }
    });

  } catch (error) {
    console.error('Get featured news error:', error);
    res.status(500).json({
      success: false,
      error: 'Server Error',
      message: 'Lỗi server khi lấy tin nổi bật'
    });
  }
});

// @route   GET /api/public/news/trending
// @desc    Get trending news (most viewed/liked in last 7 days)
// @access  Public
router.get('/news/trending', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const news = await News.find({
      status: 'published',
      publishedAt: { $gte: sevenDaysAgo }
    })
      .sort({ views: -1, likes: -1 })
      .limit(limit)
      .select('-__v')
      .lean();

    res.json({
      success: true,
      data: {
        news,
        count: news.length
      }
    });

  } catch (error) {
    console.error('Get trending news error:', error);
    res.status(500).json({
      success: false,
      error: 'Server Error',
      message: 'Lỗi server khi lấy tin xu hướng'
    });
  }
});

// @route   GET /api/public/news/:id
// @desc    Get single news by ID for mobile app
// @access  Public
router.get('/news/:id', async (req, res) => {
  try {
    const news = await News.findOne({
      _id: req.params.id,
      status: 'published'
    }).select('-__v');

    if (!news) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Không tìm thấy tin tức'
      });
    }

    // Increment view count
    news.views = (news.views || 0) + 1;
    await news.save();

    res.json({
      success: true,
      data: {
        news
      }
    });

  } catch (error) {
    console.error('Get news by ID error:', error);
    
    if (error.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'ID tin tức không hợp lệ'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Server Error',
      message: 'Lỗi server khi lấy tin tức'
    });
  }
});

// @route   GET /api/public/news/category/:category
// @desc    Get news by category for mobile app
// @access  Public
router.get('/news/category/:category', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 })
], async (req, res) => {
  try {
    const { category } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    // Validate category
    const validCategories = ['cybersecurity', 'malware', 'data-breach', 'privacy', 'trends', 'tips', 'alerts', 'general'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Category',
        message: 'Danh mục không hợp lệ'
      });
    }

    const skip = (page - 1) * limit;
    const news = await News.find({
      status: 'published',
      category
    })
      .sort({ publishedAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('-__v')
      .lean();

    const total = await News.countDocuments({ status: 'published', category });

    res.json({
      success: true,
      data: {
        news,
        category,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasMore: page < Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Get news by category error:', error);
    res.status(500).json({
      success: false,
      error: 'Server Error',
      message: 'Lỗi server khi lấy tin tức theo danh mục'
    });
  }
});

// @route   GET /api/public/categories
// @desc    Get all categories with news count
// @access  Public
router.get('/categories', async (req, res) => {
  try {
    const categories = [
      { id: 'cybersecurity', name: 'An ninh mạng' },
      { id: 'malware', name: 'Phần mềm độc hại' },
      { id: 'data-breach', name: 'Rò rỉ dữ liệu' },
      { id: 'privacy', name: 'Quyền riêng tư' },
      { id: 'trends', name: 'Xu hướng' },
      { id: 'tips', name: 'Mẹo bảo mật' },
      { id: 'alerts', name: 'Cảnh báo' },
      { id: 'general', name: 'Tổng quát' }
    ];

    // Get count for each category
    const categoriesWithCount = await Promise.all(
      categories.map(async (cat) => {
        const count = await News.countDocuments({
          status: 'published',
          category: cat.id
        });
        return { ...cat, count };
      })
    );

    res.json({
      success: true,
      data: {
        categories: categoriesWithCount
      }
    });

  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      error: 'Server Error',
      message: 'Lỗi server khi lấy danh mục'
    });
  }
});

// @route   POST /api/public/news/:id/like
// @desc    Like a news article (no auth required for mobile)
// @access  Public
router.post('/news/:id/like', async (req, res) => {
  try {
    const news = await News.findOne({
      _id: req.params.id,
      status: 'published'
    });

    if (!news) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Không tìm thấy tin tức'
      });
    }

    // Increment like count
    news.likes = (news.likes || 0) + 1;
    await news.save();

    res.json({
      success: true,
      data: {
        likes: news.likes
      },
      message: 'Đã thích tin tức'
    });

  } catch (error) {
    console.error('Like news error:', error);
    res.status(500).json({
      success: false,
      error: 'Server Error',
      message: 'Lỗi server khi thích tin tức'
    });
  }
});

// @route   GET /api/public/search
// @desc    Search news with advanced filters
// @access  Public
router.get('/search', [
  query('q').optional(),
  query('category').optional(),
  query('tags').optional(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 })
], async (req, res) => {
  try {
    const { q, category, tags, page = 1, limit = 20 } = req.query;

    let query = { status: 'published' };

    if (q) {
      query.$or = [
        { title: { $regex: q, $options: 'i' } },
        { summary: { $regex: q, $options: 'i' } },
        { content: { $regex: q, $options: 'i' } }
      ];
    }

    if (category) {
      query.category = category;
    }

    if (tags) {
      const tagArray = tags.split(',').map(t => t.trim());
      query.tags = { $in: tagArray };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const news = await News.find(query)
      .sort({ publishedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select('-__v')
      .lean();

    const total = await News.countDocuments(query);

    res.json({
      success: true,
      data: {
        news,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit)),
          hasMore: parseInt(page) < Math.ceil(total / parseInt(limit))
        }
      }
    });

  } catch (error) {
    console.error('Search news error:', error);
    res.status(500).json({
      success: false,
      error: 'Server Error',
      message: 'Lỗi server khi tìm kiếm'
    });
  }
});

module.exports = router;
