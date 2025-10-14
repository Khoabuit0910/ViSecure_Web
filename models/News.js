const mongoose = require('mongoose');

const newsSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Tiêu đề tin tức là bắt buộc'],
    trim: true,
    maxLength: [200, 'Tiêu đề không được vượt quá 200 ký tự']
  },
  summary: {
    type: String,
    required: [true, 'Tóm tắt tin tức là bắt buộc'],
    trim: true,
    maxLength: [500, 'Tóm tắt không được vượt quá 500 ký tự']
  },
  content: {
    type: String,
    required: [true, 'Nội dung tin tức là bắt buộc'],
    trim: true
  },
  category: {
    type: String,
    required: [true, 'Danh mục tin tức là bắt buộc'],
    enum: {
      values: ['cybersecurity', 'malware', 'data-breach', 'privacy', 'trends', 'tips', 'alerts', 'general'],
      message: 'Danh mục không hợp lệ'
    },
    default: 'general'
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  imageUrl: {
    type: String,
    trim: true,
    validate: {
      validator: function(v) {
        if (!v) return true; // Optional field
        return /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i.test(v);
      },
      message: 'URL hình ảnh không hợp lệ'
    }
  },
  author: {
    name: {
      type: String,
      required: [true, 'Tên tác giả là bắt buộc'],
      trim: true,
      maxLength: [100, 'Tên tác giả không được vượt quá 100 ký tự']
    },
    email: {
      type: String,
      required: [true, 'Email tác giả là bắt buộc'],
      trim: true,
      lowercase: true,
      validate: {
        validator: function(v) {
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
        },
        message: 'Email không hợp lệ'
      }
    },
    avatar: {
      type: String,
      trim: true
    }
  },
  status: {
    type: String,
    enum: {
      values: ['draft', 'published', 'archived'],
      message: 'Trạng thái không hợp lệ'
    },
    default: 'draft'
  },
  priority: {
    type: String,
    enum: {
      values: ['low', 'normal', 'high', 'urgent'],
      message: 'Mức độ ưu tiên không hợp lệ'
    },
    default: 'normal'
  },
  publishedAt: {
    type: Date,
    validate: {
      validator: function(v) {
        // Only validate if status is published
        if (this.status === 'published' && !v) {
          return false;
        }
        return true;
      },
      message: 'Ngày xuất bản là bắt buộc khi tin tức được xuất bản'
    }
  },
  views: {
    type: Number,
    default: 0,
    min: [0, 'Số lượt xem không thể âm']
  },
  likes: {
    type: Number,
    default: 0,
    min: [0, 'Số lượt thích không thể âm']
  },
  shares: {
    type: Number,
    default: 0,
    min: [0, 'Số lượt chia sẻ không thể âm']
  },
  readingTime: {
    type: Number, // in minutes
    default: 1,
    min: [1, 'Thời gian đọc tối thiểu là 1 phút']
  },
  seoMetadata: {
    metaTitle: {
      type: String,
      maxLength: [60, 'Meta title không được vượt quá 60 ký tự']
    },
    metaDescription: {
      type: String,
      maxLength: [160, 'Meta description không được vượt quá 160 ký tự']
    },
    keywords: [{
      type: String,
      trim: true,
      lowercase: true
    }]
  },
  isBreaking: {
    type: Boolean,
    default: false
  },
  isFeatured: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
newsSchema.index({ status: 1, publishedAt: -1 });
newsSchema.index({ category: 1, status: 1 });
newsSchema.index({ tags: 1 });
newsSchema.index({ 'author.email': 1 });
newsSchema.index({ isBreaking: 1, isFeatured: 1 });
newsSchema.index({ title: 'text', summary: 'text', content: 'text' });

// Virtual for formatted publish date
newsSchema.virtual('formattedPublishDate').get(function() {
  if (!this.publishedAt) return null;
  return this.publishedAt.toLocaleDateString('vi-VN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
});

// Virtual for reading time calculation
newsSchema.virtual('estimatedReadingTime').get(function() {
  if (!this.content) return 1;
  const wordsPerMinute = 200;
  const wordCount = this.content.split(/\s+/).length;
  return Math.ceil(wordCount / wordsPerMinute);
});

// Pre-save middleware
newsSchema.pre('save', function(next) {
  // Auto-calculate reading time
  if (this.content && this.isModified('content')) {
    this.readingTime = this.estimatedReadingTime;
  }
  
  // Set publishedAt when status changes to published
  if (this.isModified('status') && this.status === 'published' && !this.publishedAt) {
    this.publishedAt = new Date();
  }
  
  // Clear publishedAt if status is not published
  if (this.isModified('status') && this.status !== 'published') {
    this.publishedAt = undefined;
  }
  
  next();
});

// Static methods
newsSchema.statics.getPublishedNews = function(limit = 20, page = 1) {
  return this.find({ status: 'published' })
    .sort({ publishedAt: -1 })
    .limit(limit)
    .skip((page - 1) * limit)
    .select('-content'); // Exclude full content for list views
};

newsSchema.statics.getFeaturedNews = function(limit = 5) {
  return this.find({ 
    status: 'published', 
    isFeatured: true 
  })
  .sort({ publishedAt: -1 })
  .limit(limit);
};

newsSchema.statics.getBreakingNews = function() {
  return this.find({ 
    status: 'published', 
    isBreaking: true 
  })
  .sort({ publishedAt: -1 })
  .limit(3);
};

newsSchema.statics.getNewsByCategory = function(category, limit = 20, page = 1) {
  return this.find({ 
    status: 'published', 
    category: category 
  })
  .sort({ publishedAt: -1 })
  .limit(limit)
  .skip((page - 1) * limit)
  .select('-content');
};

// Instance methods
newsSchema.methods.incrementViews = function() {
  this.views += 1;
  return this.save();
};

newsSchema.methods.incrementLikes = function() {
  this.likes += 1;
  return this.save();
};

newsSchema.methods.incrementShares = function() {
  this.shares += 1;
  return this.save();
};

module.exports = mongoose.model('News', newsSchema);