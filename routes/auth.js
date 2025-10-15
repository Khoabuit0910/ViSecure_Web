const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { auth, requirePermission } = require('../middleware/auth');

const router = express.Router();

// @route   POST /api/auth/setup
// @desc    Create initial admin user (only if no users exist)
// @access  Public (one-time setup)
router.post('/setup', [
  body('username')
    .isLength({ min: 3, max: 30 })
    .withMessage('Username phải có từ 3-30 ký tự')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username chỉ được chứa chữ cái, số và dấu gạch dưới'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Email không hợp lệ'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Mật khẩu phải có ít nhất 6 ký tự'),
  body('fullName')
    .isLength({ min: 1, max: 100 })
    .withMessage('Họ tên là bắt buộc và không quá 100 ký tự')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Dữ liệu nhập vào không hợp lệ',
        details: errors.array()
      });
    }

    // Check if any users exist
    const userCount = await User.countDocuments();
    if (userCount > 0) {
      return res.status(400).json({
        error: 'Setup Already Complete',
        message: 'Hệ thống đã được cài đặt. Không thể tạo admin user mới qua route này.'
      });
    }

    const { username, email, password, fullName } = req.body;

    // Check if user with same username or email exists
    const existingUser = await User.findOne({
      $or: [{ username }, { email }]
    });

    if (existingUser) {
      return res.status(400).json({
        error: 'User Already Exists',
        message: 'Username hoặc email đã được sử dụng'
      });
    }

    // Create admin user
    const adminUser = new User({
      username,
      email,
      password,
      fullName,
      role: 'admin', // Force admin role for setup
      status: 'active'
    });

    await adminUser.save();

    // Generate JWT token
    const payload = {
      userId: adminUser.id,
      username: adminUser.username,
      email: adminUser.email,
      role: adminUser.role
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    });

    res.status(201).json({
      success: true,
      message: 'Admin user được tạo thành công',
      token,
      user: {
        id: adminUser.id,
        username: adminUser.username,
        email: adminUser.email,
        fullName: adminUser.fullName,
        role: adminUser.role,
        status: adminUser.status,
        createdAt: adminUser.createdAt
      }
    });

  } catch (error) {
    console.error('Setup error:', error);
    
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        error: 'Duplicate Key Error',
        message: `${field === 'email' ? 'Email' : 'Username'} đã được sử dụng`
      });
    }

    res.status(500).json({
      error: 'Server Error',
      message: 'Lỗi server khi tạo admin user'
    });
  }
});

// @route   POST /api/auth/register
// @desc    Register a new admin user
// @access  Private (Admin only)
router.post('/register', [
  body('username')
    .isLength({ min: 3, max: 30 })
    .withMessage('Username phải có từ 3-30 ký tự')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username chỉ được chứa chữ cái, số và dấu gạch dưới'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Email không hợp lệ'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Mật khẩu phải có ít nhất 6 ký tự'),
  body('fullName')
    .isLength({ min: 1, max: 100 })
    .withMessage('Họ tên là bắt buộc và không quá 100 ký tự'),
  body('role')
    .optional()
    .isIn(['admin', 'editor', 'author'])
    .withMessage('Role không hợp lệ')
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

    const { username, email, password, fullName, role = 'author' } = req.body;

    // Check if user already exists
    const existingUser = await User.findByEmailOrUsername(email);
    if (existingUser) {
      return res.status(400).json({
        error: 'User Exists',
        message: 'Email hoặc username đã được sử dụng'
      });
    }

    // Create new user
    const user = new User({
      username,
      email,
      password,
      fullName,
      role,
      emailVerified: true // Admin-created users are auto-verified
    });

    await user.save();

    res.status(201).json({
      message: 'Tạo tài khoản thành công',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        status: user.status
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      error: 'Server Error',
      message: 'Lỗi server khi tạo tài khoản'
    });
  }
});

// @route   POST /api/auth/login
// @desc    Login admin user
// @access  Public
router.post('/login', [
  body('identifier')
    .notEmpty()
    .withMessage('Email hoặc username là bắt buộc'),
  body('password')
    .notEmpty()
    .withMessage('Mật khẩu là bắt buộc')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Dữ liệu không hợp lệ',
        details: errors.array()
      });
    }

    const { identifier, password } = req.body;

    // Find user by email or username
    const user = await User.findByEmailOrUsername(identifier);
    if (!user) {
      return res.status(401).json({
        error: 'Invalid Credentials',
        message: 'Email/username hoặc mật khẩu không chính xác'
      });
    }

    // Check if user is active
    if (user.status !== 'active') {
      return res.status(401).json({
        error: 'Account Inactive',
        message: 'Tài khoản đã bị tạm khóa hoặc vô hiệu hóa'
      });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        error: 'Invalid Credentials',
        message: 'Email/username hoặc mật khẩu không chính xác'
      });
    }

    // Update last login
    await user.updateLastLogin();

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user._id,
        username: user.username,
        email: user.email,
        role: user.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Đăng nhập thành công',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        permissions: user.permissions,
        avatar: user.avatar,
        lastLogin: user.lastLogin
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Server Error',
      message: 'Lỗi server khi đăng nhập'
    });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user info
// @access  Private
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        error: 'User Not Found',
        message: 'Không tìm thấy thông tin người dùng'
      });
    }

    res.json({
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        permissions: user.permissions,
        avatar: user.avatar,
        status: user.status,
        lastLogin: user.lastLogin,
        loginCount: user.loginCount,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      error: 'Server Error',
      message: 'Lỗi server khi lấy thông tin người dùng'
    });
  }
});

// @route   PUT /api/auth/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', [
  body('fullName')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Họ tên không được quá 100 ký tự'),
  body('avatar')
    .optional()
    .isURL()
    .withMessage('URL avatar không hợp lệ')
], auth, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Dữ liệu không hợp lệ',
        details: errors.array()
      });
    }

    const { fullName, avatar } = req.body;
    
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        error: 'User Not Found',
        message: 'Không tìm thấy thông tin người dùng'
      });
    }

    if (fullName) user.fullName = fullName;
    if (avatar !== undefined) user.avatar = avatar;

    await user.save();

    res.json({
      message: 'Cập nhật thông tin thành công',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        avatar: user.avatar
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      error: 'Server Error',
      message: 'Lỗi server khi cập nhật thông tin'
    });
  }
});

// @route   PUT /api/auth/change-password
// @desc    Change user password
// @access  Private
router.put('/change-password', [
  body('currentPassword')
    .notEmpty()
    .withMessage('Mật khẩu hiện tại là bắt buộc'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('Mật khẩu mới phải có ít nhất 6 ký tự')
], auth, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Dữ liệu không hợp lệ',
        details: errors.array()
      });
    }

    const { currentPassword, newPassword } = req.body;
    
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        error: 'User Not Found',
        message: 'Không tìm thấy thông tin người dùng'
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        error: 'Invalid Password',
        message: 'Mật khẩu hiện tại không chính xác'
      });
    }

    user.password = newPassword;
    await user.save();

    res.json({
      message: 'Đổi mật khẩu thành công'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      error: 'Server Error',
      message: 'Lỗi server khi đổi mật khẩu'
    });
  }
});

// @route   POST /api/auth/logout
// @desc    Logout user (client-side token removal)
// @access  Private
router.post('/logout', auth, (req, res) => {
  res.json({
    message: 'Đăng xuất thành công'
  });
});

// @route   GET /api/auth/verify
// @desc    Verify token and get user info
// @access  Private
router.get('/verify', auth, async (req, res) => {
  try {
    const user = req.userModel || await User.findById(req.user.userId);
    
    if (!user || user.status !== 'active') {
      return res.status(401).json({
        success: false,
        error: 'Invalid Token',
        message: 'Token không hợp lệ hoặc tài khoản đã bị khóa'
      });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        permissions: user.permissions,
        status: user.status,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin
      }
    });
  } catch (error) {
    console.error('Verify token error:', error);
    res.status(500).json({
      success: false,
      error: 'Server Error',
      message: 'Lỗi server khi xác thực token'
    });
  }
});

// @route   GET /api/auth/check-admin
// @desc    Check if admin exists
// @access  Public
router.get('/check-admin', async (req, res) => {
  try {
    const adminCount = await User.countDocuments({ role: 'admin', status: 'active' });
    
    res.json({
      success: true,
      hasAdmin: adminCount > 0,
      adminCount
    });
  } catch (error) {
    console.error('Check admin error:', error);
    res.status(500).json({
      success: false,
      error: 'Server Error',
      message: 'Lỗi server khi kiểm tra admin'
    });
  }
});

module.exports = router;