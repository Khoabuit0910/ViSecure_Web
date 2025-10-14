const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username là bắt buộc'],
    unique: true,
    trim: true,
    minLength: [3, 'Username phải có ít nhất 3 ký tự'],
    maxLength: [30, 'Username không được vượt quá 30 ký tự'],
    match: [/^[a-zA-Z0-9_]+$/, 'Username chỉ được chứa chữ cái, số và dấu gạch dưới']
  },
  email: {
    type: String,
    required: [true, 'Email là bắt buộc'],
    unique: true,
    trim: true,
    lowercase: true,
    validate: {
      validator: function(v) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      message: 'Email không hợp lệ'
    }
  },
  password: {
    type: String,
    required: [true, 'Mật khẩu là bắt buộc'],
    minLength: [6, 'Mật khẩu phải có ít nhất 6 ký tự']
  },
  fullName: {
    type: String,
    required: [true, 'Họ tên là bắt buộc'],
    trim: true,
    maxLength: [100, 'Họ tên không được vượt quá 100 ký tự']
  },
  avatar: {
    type: String,
    trim: true,
    validate: {
      validator: function(v) {
        if (!v) return true; // Optional field
        return /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i.test(v);
      },
      message: 'URL avatar không hợp lệ'
    }
  },
  role: {
    type: String,
    enum: {
      values: ['admin', 'editor', 'author'],
      message: 'Role không hợp lệ'
    },
    default: 'author'
  },
  permissions: [{
    type: String,
    enum: ['create_news', 'edit_news', 'delete_news', 'publish_news', 'manage_users', 'view_analytics']
  }],
  status: {
    type: String,
    enum: {
      values: ['active', 'inactive', 'suspended'],
      message: 'Trạng thái không hợp lệ'
    },
    default: 'active'
  },
  lastLogin: {
    type: Date
  },
  loginCount: {
    type: Number,
    default: 0
  },
  resetPasswordToken: {
    type: String
  },
  resetPasswordExpires: {
    type: Date
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: {
    type: String
  },
  twoFactorEnabled: {
    type: Boolean,
    default: false
  },
  twoFactorSecret: {
    type: String
  }
}, {
  timestamps: true,
  toJSON: { 
    virtuals: true,
    transform: function(doc, ret) {
      delete ret.password;
      delete ret.resetPasswordToken;
      delete ret.resetPasswordExpires;
      delete ret.emailVerificationToken;
      delete ret.twoFactorSecret;
      return ret;
    }
  },
  toObject: { virtuals: true }
});

// Indexes (email and username already indexed via unique: true)
userSchema.index({ role: 1, status: 1 });

// Virtual for full display name
userSchema.virtual('displayName').get(function() {
  return this.fullName || this.username;
});

// Virtual for user stats
userSchema.virtual('isOnline').get(function() {
  if (!this.lastLogin) return false;
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  return this.lastLogin > fiveMinutesAgo;
});

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Pre-save middleware to set default permissions based on role
userSchema.pre('save', function(next) {
  if (!this.isModified('role')) return next();
  
  switch (this.role) {
    case 'admin':
      this.permissions = [
        'create_news', 'edit_news', 'delete_news', 
        'publish_news', 'manage_users', 'view_analytics'
      ];
      break;
    case 'editor':
      this.permissions = [
        'create_news', 'edit_news', 'delete_news', 
        'publish_news', 'view_analytics'
      ];
      break;
    case 'author':
      this.permissions = ['create_news', 'edit_news'];
      break;
    default:
      this.permissions = [];
  }
  
  next();
});

// Instance methods
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error('Password comparison failed');
  }
};

userSchema.methods.updateLastLogin = function() {
  this.lastLogin = new Date();
  this.loginCount += 1;
  return this.save();
};

userSchema.methods.hasPermission = function(permission) {
  return this.permissions.includes(permission);
};

userSchema.methods.canManage = function(resource) {
  const adminPermissions = ['manage_users', 'view_analytics'];
  const editorPermissions = ['publish_news', 'delete_news'];
  
  switch (resource) {
    case 'users':
      return this.hasPermission('manage_users');
    case 'analytics':
      return this.hasPermission('view_analytics');
    case 'news_publish':
      return this.hasPermission('publish_news');
    case 'news_delete':
      return this.hasPermission('delete_news');
    default:
      return false;
  }
};

userSchema.methods.generatePasswordResetToken = function() {
  const crypto = require('crypto');
  const token = crypto.randomBytes(32).toString('hex');
  
  this.resetPasswordToken = crypto.createHash('sha256').update(token).digest('hex');
  this.resetPasswordExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
  
  return token;
};

userSchema.methods.generateEmailVerificationToken = function() {
  const crypto = require('crypto');
  const token = crypto.randomBytes(32).toString('hex');
  
  this.emailVerificationToken = crypto.createHash('sha256').update(token).digest('hex');
  
  return token;
};

// Static methods
userSchema.statics.findByEmailOrUsername = function(identifier) {
  return this.findOne({
    $or: [
      { email: identifier.toLowerCase() },
      { username: identifier }
    ]
  });
};

userSchema.statics.getActiveUsers = function() {
  return this.find({ status: 'active' }).select('-password');
};

userSchema.statics.getAdmins = function() {
  return this.find({ 
    role: 'admin', 
    status: 'active' 
  }).select('-password');
};

userSchema.statics.getUserStats = function() {
  return this.aggregate([
    {
      $group: {
        _id: '$role',
        count: { $sum: 1 },
        active: {
          $sum: {
            $cond: [{ $eq: ['$status', 'active'] }, 1, 0]
          }
        }
      }
    }
  ]);
};

module.exports = mongoose.model('User', userSchema);