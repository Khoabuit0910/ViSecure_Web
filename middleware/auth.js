const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Authentication middleware
const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        error: 'No Token',
        message: 'Không có token xác thực, truy cập bị từ chối'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Verify user still exists and is active
    const user = await User.findById(decoded.userId);
    if (!user || user.status !== 'active') {
      return res.status(401).json({
        error: 'Invalid Token',
        message: 'Token không hợp lệ hoặc tài khoản đã bị khóa'
      });
    }

    req.user = decoded;
    req.userModel = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Token Expired',
        message: 'Token đã hết hạn, vui lòng đăng nhập lại'
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: 'Invalid Token',
        message: 'Token không hợp lệ'
      });
    }

    console.error('Auth middleware error:', error);
    res.status(500).json({
      error: 'Server Error',
      message: 'Lỗi server khi xác thực'
    });
  }
};

// Role-based access control middleware
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Yêu cầu đăng nhập'
      });
    }

    const userRole = req.user.role;
    const allowedRoles = Array.isArray(roles) ? roles : [roles];

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Không có quyền truy cập tính năng này'
      });
    }

    next();
  };
};

// Permission-based access control middleware
const requirePermission = (permission) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Yêu cầu đăng nhập'
        });
      }

      const user = req.userModel || await User.findById(req.user.userId);
      if (!user) {
        return res.status(401).json({
          error: 'User Not Found',
          message: 'Không tìm thấy thông tin người dùng'
        });
      }

      if (!user.hasPermission(permission)) {
        return res.status(403).json({
          error: 'Insufficient Permissions',
          message: `Không có quyền ${permission}`
        });
      }

      next();
    } catch (error) {
      console.error('Permission middleware error:', error);
      res.status(500).json({
        error: 'Server Error',
        message: 'Lỗi server khi kiểm tra quyền'
      });
    }
  };
};

// Admin only middleware
const adminOnly = requireRole('admin');

// Editor or Admin middleware
const editorOrAdmin = requireRole(['editor', 'admin']);

// Optional auth middleware (for public routes that can benefit from user context)
const optionalAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      req.user = null;
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    
    if (user && user.status === 'active') {
      req.user = decoded;
      req.userModel = user;
    } else {
      req.user = null;
    }
    
    next();
  } catch (error) {
    // Silently fail for optional auth
    req.user = null;
    next();
  }
};

// Resource ownership middleware
const requireOwnership = (resourceField = 'author.email') => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Yêu cầu đăng nhập'
        });
      }

      const user = req.userModel || await User.findById(req.user.userId);
      
      // Admins can access everything
      if (user.role === 'admin') {
        return next();
      }

      // For other roles, check ownership in the route handler
      req.checkOwnership = true;
      next();
    } catch (error) {
      console.error('Ownership middleware error:', error);
      res.status(500).json({
        error: 'Server Error',
        message: 'Lỗi server khi kiểm tra quyền sở hữu'
      });
    }
  };
};

module.exports = {
  auth,
  requireRole,
  requirePermission,
  adminOnly,
  editorOrAdmin,
  optionalAuth,
  requireOwnership
};