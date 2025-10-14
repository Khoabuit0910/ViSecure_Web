const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

const seedUsers = async () => {
  try {
    // Check if admin already exists
    const existingAdmin = await User.findOne({ 
      $or: [{ email: 'admin@visecure.com' }, { username: 'admin' }] 
    });

    if (existingAdmin) {
      console.log('👤 Admin user already exists');
      return;
    }

    // Create admin user
    const adminUser = new User({
      username: 'admin',
      email: 'admin@visecure.com',
      fullName: 'Administrator ViSecure',
      password: '123456', // Will be hashed by pre-save middleware
      role: 'admin',
      status: 'active',
      createdAt: new Date(),
      lastLogin: null,
      loginCount: 0,
      bio: 'System Administrator for ViSecure News Management',
      preferences: {
        language: 'vi',
        timezone: 'Asia/Ho_Chi_Minh',
        emailNotifications: true,
        theme: 'light'
      }
    });

    await adminUser.save();
    console.log('✅ Admin user created successfully');
    console.log('📧 Email: admin@visecure.com');
    console.log('🔑 Password: 123456');
    console.log('👑 Role: admin');

    // Create editor user
    const editorUser = new User({
      username: 'editor',
      email: 'editor@visecure.com',
      fullName: 'Biên tập viên ViSecure',
      password: '123456',
      role: 'editor',
      status: 'active',
      createdAt: new Date(),
      lastLogin: null,
      loginCount: 0,
      bio: 'News Editor for ViSecure',
      preferences: {
        language: 'vi',
        timezone: 'Asia/Ho_Chi_Minh',
        emailNotifications: true,
        theme: 'light'
      }
    });

    await editorUser.save();
    console.log('✅ Editor user created successfully');
    console.log('📧 Email: editor@visecure.com');
    console.log('🔑 Password: 123456');
    console.log('📝 Role: editor');

    // Create author user
    const authorUser = new User({
      username: 'author',
      email: 'author@visecure.com',
      fullName: 'Tác giả ViSecure',
      password: '123456',
      role: 'author',
      status: 'active',
      createdAt: new Date(),
      lastLogin: null,
      loginCount: 0,
      bio: 'Content Author for ViSecure',
      preferences: {
        language: 'vi',
        timezone: 'Asia/Ho_Chi_Minh',
        emailNotifications: true,
        theme: 'light'
      }
    });

    await authorUser.save();
    console.log('✅ Author user created successfully');
    console.log('📧 Email: author@visecure.com');
    console.log('🔑 Password: 123456');
    console.log('✍️ Role: author');

  } catch (error) {
    console.error('❌ Error seeding users:', error);
  } finally {
    mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
};

const seedNews = async () => {
  try {
    const News = require('./models/News');
    
    // Check if news already exists
    const existingNews = await News.countDocuments();
    if (existingNews > 0) {
      console.log('📰 News articles already exist');
      return;
    }

    // Get admin user for author reference
    const adminUser = await User.findOne({ username: 'admin' });
    if (!adminUser) {
      console.log('❌ Admin user not found. Please run user seeder first.');
      return;
    }

    const sampleNews = [
      {
        title: 'Phát hiện lỗ hổng bảo mật nghiêm trọng trong hệ điều hành phổ biến',
        excerpt: 'Các chuyên gia bảo mật vừa phát hiện một lỗ hổng nghiêm trọng có thể cho phép kẻ tấn công truy cập trái phép vào hệ thống.',
        content: `
          <p>Trong một báo cáo mới được công bố, các nhà nghiên cứu bảo mật đã phát hiện ra một lỗ hổng nghiêm trọng trong hệ điều hành được sử dụng rộng rãi. Lỗ hổng này, được đánh mã CVE-2024-12345, có thể cho phép kẻ tấn công thực thi mã từ xa và chiếm quyền kiểm soát hoàn toàn hệ thống.</p>

          <h3>Chi tiết lỗ hổng</h3>
          <p>Lỗ hổng được phát hiện trong thành phần xử lý gói tin mạng của kernel. Khi một gói tin được tạo đặc biệt được gửi đến hệ thống, nó có thể gây ra tràn bộ đệm và cho phép thực thi mã độc hại.</p>

          <h3>Tác động</h3>
          <ul>
            <li>Thực thi mã từ xa với quyền root</li>
            <li>Truy cập trái phép vào dữ liệu nhạy cảm</li>
            <li>Cài đặt backdoor vĩnh viễn</li>
            <li>Tấn công từ chối dịch vụ (DoS)</li>
          </ul>

          <h3>Khuyến nghị bảo mật</h3>
          <p>Người dùng được khuyến nghị thực hiện ngay các biện pháp sau:</p>
          <ol>
            <li>Cập nhật hệ điều hành lên phiên bản mới nhất</li>
            <li>Bật tường lửa và cấu hình quy tắc bảo mật</li>
            <li>Giám sát hoạt động mạng bất thường</li>
            <li>Sao lưu dữ liệu quan trọng</li>
          </ol>

          <p>Các nhà cung cấp đã phát hành bản vá bảo mật khẩn cấp và khuyến nghị người dùng cập nhật ngay lập tức.</p>
        `,
        category: 'cybersecurity',
        tags: ['lỗ hổng', 'bảo mật', 'hệ điều hành', 'cập nhật'],
        author: adminUser._id,
        status: 'published',
        publishedAt: new Date(),
        views: 1250,
        likes: 89,
        allowComments: true,
      },
      {
        title: '10 mẹo bảo mật cơ bản mọi người dùng internet nên biết',
        excerpt: 'Trong thời đại số hóa hiện nay, việc bảo vệ thông tin cá nhân trên internet là vô cùng quan trọng.',
        content: `
          <p>Bảo mật thông tin cá nhân trên internet không chỉ là trách nhiệm của các tổ chức mà còn là của mỗi người dùng. Dưới đây là 10 mẹo bảo mật cơ bản mà bất kỳ ai cũng có thể áp dụng:</p>

          <h3>1. Sử dụng mật khẩu mạnh</h3>
          <p>Tạo mật khẩu dài ít nhất 12 ký tự, kết hợp chữ hoa, chữ thường, số và ký tự đặc biệt.</p>

          <h3>2. Bật xác thực hai yếu tố (2FA)</h3>
          <p>Luôn bật 2FA cho các tài khoản quan trọng như email, ngân hàng, mạng xã hội.</p>

          <h3>3. Cập nhật phần mềm thường xuyên</h3>
          <p>Đảm bảo hệ điều hành, trình duyệt và ứng dụng luôn được cập nhật phiên bản mới nhất.</p>

          <h3>4. Sử dụng HTTPS</h3>
          <p>Chỉ nhập thông tin nhạy cảm trên các trang web có chứng chỉ SSL (HTTPS).</p>

          <h3>5. Cẩn thận với email lạ</h3>
          <p>Không nhấp vào liên kết hoặc tải file đính kèm từ email không rõ nguồn gốc.</p>
        `,
        category: 'tips',
        tags: ['mẹo bảo mật', 'an toàn', 'internet', 'cơ bản'],
        author: adminUser._id,
        status: 'published',
        publishedAt: new Date(Date.now() - 86400000),
        views: 2100,
        likes: 156,
        allowComments: true,
      }
    ];

    await News.insertMany(sampleNews);
    console.log('✅ Sample news articles created successfully');

  } catch (error) {
    console.error('❌ Error seeding news:', error);
  }
};

const runSeeder = async () => {
  console.log('🌱 Starting database seeding...');
  await seedUsers();
  await seedNews();
  console.log('✅ Database seeding completed!');
  process.exit(0);
};

// Run seeder
runSeeder().catch(error => {
  console.error('❌ Seeding failed:', error);
  process.exit(1);
});