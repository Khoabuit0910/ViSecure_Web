const mongoose = require('mongoose');
const News = require('../models/News');
const User = require('../models/User');
require('dotenv').config();

// Sample news data về an ninh mạng
const newsData = [
  {
    title: 'Phát hiện lỗ hổng bảo mật nghiêm trọng trong hệ điều hành phổ biến',
    summary: 'Các chuyên gia bảo mật vừa phát hiện một lỗ hổng bảo mật nghiêm trọng ảnh hưởng đến hàng triệu thiết bị trên toàn thế giới. Người dùng cần cập nhật ngay để bảo vệ dữ liệu cá nhân.',
    content: `
      <h2>Lỗ hổng bảo mật nghiêm trọng được phát hiện</h2>
      <p>Các nhà nghiên cứu bảo mật vừa công bố phát hiện một lỗ hổng bảo mật nghiêm trọng ảnh hưởng đến hàng triệu thiết bị sử dụng hệ điều hành phổ biến. Lỗ hổng này có thể cho phép kẻ tấn công từ xa thực thi mã độc và chiếm quyền kiểm soát thiết bị.</p>
      
      <h3>Chi tiết lỗ hổng</h3>
      <p>Lỗ hổng được mã hóa là CVE-2024-XXXX, có mức độ nghiêm trọng cao với điểm CVSS 9.8/10. Nó nằm trong thành phần xử lý giao thức mạng và có thể bị khai thác mà không cần xác thực.</p>
      
      <h3>Các thiết bị bị ảnh hưởng</h3>
      <ul>
        <li>Máy tính cá nhân chạy hệ điều hành phiên bản 10.x đến 12.x</li>
        <li>Máy chủ doanh nghiệp</li>
        <li>Thiết bị IoT sử dụng firmware tương tự</li>
      </ul>
      
      <h3>Khuyến nghị bảo mật</h3>
      <p>Người dùng nên thực hiện các biện pháp sau ngay lập tức:</p>
      <ol>
        <li>Cập nhật hệ điều hành lên phiên bản mới nhất</li>
        <li>Kích hoạt tường lửa và các biện pháp bảo vệ mạng</li>
        <li>Theo dõi hoạt động bất thường trên thiết bị</li>
        <li>Sao lưu dữ liệu quan trọng</li>
      </ol>
      
      <p>Các nhà sản xuất đã phát hành bản vá bảo mật khẩn cấp. Người dùng nên cập nhật ngay để bảo vệ thiết bị và dữ liệu cá nhân.</p>
    `,
    category: 'cybersecurity',
    tags: ['lỗ hổng bảo mật', 'cập nhật', 'khẩn cấp', 'CVE'],
    status: 'published',
    priority: 'urgent',
    isBreaking: true,
    isFeatured: true,
    views: 2847,
    likes: 156,
    seoMetadata: {
      title: 'Cảnh báo: Lỗ hổng bảo mật nghiêm trọng cần cập nhật ngay',
      description: 'Phát hiện lỗ hổng CVE-2024-XXXX với mức độ nghiêm trọng cao. Cập nhật ngay để bảo vệ thiết bị.'
    }
  },
  {
    title: '10 mẹo bảo mật cơ bản mọi người dùng internet nên biết',
    summary: 'Trong thời đại số hóa, việc bảo vệ thông tin cá nhân trên internet là vô cùng quan trọng. Dưới đây là 10 mẹo bảo mật đơn giản nhưng hiệu quả mà mọi người nên áp dụng.',
    content: `
      <h2>10 Mẹo Bảo Mật Internet Thiết Yếu</h2>
      <p>Bảo mật thông tin cá nhân trên internet không còn là điều tùy chọn mà là điều bắt buộc. Dưới đây là những mẹo quan trọng nhất:</p>
      
      <h3>1. Sử dụng mật khẩu mạnh và duy nhất</h3>
      <p>Mật khẩu nên có ít nhất 12 ký tự, bao gồm chữ hoa, chữ thường, số và ký tự đặc biệt. Không sử dụng lại mật khẩu cho nhiều tài khoản.</p>
      
      <h3>2. Kích hoạt xác thực hai yếu tố (2FA)</h3>
      <p>2FA thêm một lớp bảo vệ quan trọng cho tài khoản của bạn, ngay cả khi mật khẩu bị lộ.</p>
      
      <h3>3. Cẩn thận với email lừa đảo (phishing)</h3>
      <p>Không nhấp vào link lạ trong email. Kiểm tra kỹ địa chỉ người gửi và nội dung trước khi tương tác.</p>
      
      <h3>4. Cập nhật phần mềm thường xuyên</h3>
      <p>Các bản cập nhật thường chứa các bản vá bảo mật quan trọng.</p>
      
      <h3>5. Sử dụng VPN khi truy cập WiFi công cộng</h3>
      <p>WiFi công cộng không an toàn. VPN mã hóa dữ liệu của bạn.</p>
      
      <h3>6. Sao lưu dữ liệu định kỳ</h3>
      <p>Sao lưu giúp bạn khôi phục dữ liệu khi gặp sự cố ransomware hoặc mất mát dữ liệu.</p>
      
      <h3>7. Cẩn thận với quyền truy cập ứng dụng</h3>
      <p>Chỉ cấp quyền cần thiết cho ứng dụng trên điện thoại và máy tính.</p>
      
      <h3>8. Sử dụng trình quản lý mật khẩu</h3>
      <p>Password manager giúp tạo và lưu trữ mật khẩu mạnh một cách an toàn.</p>
      
      <h3>9. Kiểm tra hoạt động tài khoản thường xuyên</h3>
      <p>Theo dõi các hoạt động đăng nhập và giao dịch bất thường.</p>
      
      <h3>10. Tìm hiểu về các mối đe dọa mới</h3>
      <p>Cập nhật kiến thức về các phương thức tấn công mới để bảo vệ bản thân tốt hơn.</p>
      
      <p><strong>Kết luận:</strong> Bảo mật là một quá trình liên tục. Hãy thực hành những mẹo này hàng ngày để bảo vệ thông tin cá nhân của bạn.</p>
    `,
    category: 'tips',
    tags: ['bảo mật', 'mẹo hay', 'hướng dẫn', 'người dùng'],
    status: 'published',
    priority: 'normal',
    isFeatured: true,
    views: 3521,
    likes: 284,
    seoMetadata: {
      title: '10 mẹo bảo mật internet cơ bản cho mọi người',
      description: 'Hướng dẫn 10 mẹo bảo mật đơn giản nhưng hiệu quả để bảo vệ thông tin cá nhân trên internet.'
    }
  },
  {
    title: 'Cảnh báo: Chiến dịch tấn công ransomware mới nhắm vào doanh nghiệp SME',
    summary: 'Một chiến dịch ransomware mới đang nhắm vào các doanh nghiệp vừa và nhỏ tại Việt Nam. Hacker sử dụng phương thức tấn công tinh vi qua email giả mạo hóa đơn.',
    content: `
      <h2>Cảnh Báo Ransomware Mới</h2>
      <p>Các chuyên gia an ninh mạng đã phát hiện một chiến dịch tấn công ransomware quy mô lớn đang nhắm vào các doanh nghiệp SME tại Việt Nam và Đông Nam Á.</p>
      
      <h3>Phương thức tấn công</h3>
      <p>Hacker gửi email giả mạo hóa đơn hoặc đơn hàng với file đính kèm chứa mã độc. Khi nạn nhân mở file, ransomware sẽ được kích hoạt và mã hóa toàn bộ dữ liệu.</p>
      
      <h3>Đặc điểm nhận dạng</h3>
      <ul>
        <li>Email có tiêu đề về hóa đơn, đơn hàng khẩn cấp</li>
        <li>File đính kèm có phần mở rộng .zip, .rar chứa file .exe</li>
        <li>Địa chỉ email người gửi tương tự các công ty thực tế</li>
        <li>Nội dung email tạo cảm giác khẩn cấp</li>
      </ul>
      
      <h3>Thiệt hại</h3>
      <p>Đã có hơn 50 doanh nghiệp tại Việt Nam bị ảnh hưởng, với tổng thiệt hại ước tính hàng tỷ đồng do:</p>
      <ul>
        <li>Mất dữ liệu quan trọng</li>
        <li>Gián đoạn hoạt động kinh doanh</li>
        <li>Chi phí khôi phục hệ thống</li>
        <li>Mất uy tín với khách hàng</li>
      </ul>
      
      <h3>Biện pháp phòng ngừa</h3>
      <ol>
        <li><strong>Đào tạo nhân viên:</strong> Nhận biết email lừa đảo</li>
        <li><strong>Sao lưu dữ liệu:</strong> Backup offline thường xuyên</li>
        <li><strong>Cập nhật bảo mật:</strong> Patch hệ thống và phần mềm</li>
        <li><strong>Phần mềm diệt virus:</strong> Sử dụng giải pháp bảo mật toàn diện</li>
        <li><strong>Kiểm tra email:</strong> Xác minh người gửi trước khi mở file đính kèm</li>
      </ol>
      
      <h3>Khuyến nghị từ chuyên gia</h3>
      <p>"Doanh nghiệp SME cần đầu tư vào bảo mật ngay từ đầu. Chi phí phòng ngừa luôn thấp hơn nhiều so với thiệt hại khi bị tấn công," theo ông Nguyễn Văn A, chuyên gia an ninh mạng.</p>
      
      <p><strong>Liên hệ khẩn cấp:</strong> Nếu phát hiện dấu hiệu bị tấn công, hãy ngắt kết nối mạng ngay lập tức và liên hệ đội ứng cứu sự cố bảo mật.</p>
    `,
    category: 'alerts',
    tags: ['ransomware', 'cảnh báo', 'doanh nghiệp', 'SME', 'an ninh mạng'],
    status: 'published',
    priority: 'high',
    isBreaking: true,
    views: 1923,
    likes: 98,
    seoMetadata: {
      title: 'Cảnh báo ransomware mới tấn công doanh nghiệp SME Việt Nam',
      description: 'Chiến dịch ransomware quy mô lớn đang nhắm vào SME qua email giả mạo. Biện pháp phòng ngừa khẩn cấp.'
    }
  },
  {
    title: 'Xu hướng bảo mật năm 2025: AI và Machine Learning dẫn đầu',
    summary: 'Công nghệ AI và Machine Learning đang thay đổi cách chúng ta bảo vệ dữ liệu. Tìm hiểu về các xu hướng bảo mật hàng đầu sẽ định hình năm 2025.',
    content: `
      <h2>Xu Hướng Bảo Mật 2025</h2>
      <p>Ngành an ninh mạng đang chứng kiến những thay đổi lớn với sự phát triển của AI, cloud computing và IoT. Dưới đây là những xu hướng quan trọng nhất.</p>
      
      <h3>1. AI trong phát hiện và ngăn chặn tấn công</h3>
      <p>AI và Machine Learning đang được sử dụng rộng rãi để:</p>
      <ul>
        <li>Phát hiện bất thường trong thời gian thực</li>
        <li>Phân tích hành vi người dùng</li>
        <li>Tự động hóa phản ứng với mối đe dọa</li>
        <li>Dự đoán và ngăn chặn tấn công trước khi xảy ra</li>
      </ul>
      
      <h3>2. Zero Trust Security</h3>
      <p>Mô hình "không tin tưởng ai" đang trở thành chuẩn mực mới trong bảo mật doanh nghiệp. Mọi truy cập đều cần được xác thực và ủy quyền.</p>
      
      <h3>3. Cloud Security nâng cao</h3>
      <p>Với sự chuyển đổi lên cloud, bảo mật đám mây trở thành ưu tiên hàng đầu:</p>
      <ul>
        <li>Mã hóa dữ liệu toàn diện</li>
        <li>Quản lý danh tính và truy cập (IAM)</li>
        <li>Bảo mật container và microservices</li>
        <li>Compliance và governance tự động</li>
      </ul>
      
      <h3>4. IoT Security</h3>
      <p>Với hàng tỷ thiết bị IoT được kết nối, bảo mật IoT là thách thức lớn:</p>
      <ul>
        <li>Xác thực thiết bị mạnh mẽ</li>
        <li>Cập nhật firmware tự động</li>
        <li>Phân đoạn mạng IoT</li>
        <li>Giám sát liên tục</li>
      </ul>
      
      <h3>5. Privacy by Design</h3>
      <p>Quyền riêng tư được tích hợp ngay từ giai đoạn thiết kế sản phẩm, không phải là điều bổ sung sau.</p>
      
      <h3>6. Quantum Computing và Bảo mật</h3>
      <p>Chuẩn bị cho thời đại máy tính lượng tử với mã hóa kháng lượng tử (Post-Quantum Cryptography).</p>
      
      <h3>7. Security Awareness Training</h3>
      <p>Con người vẫn là mắt xích yếu nhất. Đào tạo nhận thức bảo mật trở nên quan trọng hơn bao giờ hết.</p>
      
      <h3>Kết luận</h3>
      <p>Năm 2025 đánh dấu bước chuyển mình lớn trong ngành bảo mật với công nghệ tiên tiến. Doanh nghiệp cần chủ động cập nhật và áp dụng các xu hướng mới để bảo vệ tài sản số của mình.</p>
    `,
    category: 'trends',
    tags: ['AI', 'xu hướng', '2025', 'machine learning', 'cloud security'],
    status: 'published',
    priority: 'normal',
    isFeatured: true,
    views: 2156,
    likes: 178,
    seoMetadata: {
      title: 'Xu hướng bảo mật 2025: AI và ML dẫn đầu cuộc cách mạng',
      description: 'Khám phá 7 xu hướng bảo mật hàng đầu năm 2025 với AI, Zero Trust, Cloud Security và IoT.'
    }
  },
  {
    title: 'Malware mới trên Android: Trojan ngân hàng nguy hiểm đánh cắp OTP',
    summary: 'Phát hiện loại malware mới trên Android có khả năng đánh cắp mã OTP và thông tin thẻ ngân hàng. Hơn 100,000 thiết bị đã bị nhiễm tại Việt Nam.',
    content: `
      <h2>Cảnh Báo Trojan Ngân Hàng Mới</h2>
      <p>Các nhà nghiên cứu bảo mật đã phát hiện một biến thể mới của trojan ngân hàng trên Android với khả năng đánh cắp mã OTP và thông tin nhạy cảm.</p>
      
      <h3>Cách thức hoạt động</h3>
      <p>Malware này ngụy trang dưới dạng ứng dụng hợp pháp và thực hiện các hành động sau:</p>
      <ol>
        <li><strong>Thu thập thông tin:</strong> Đọc SMS, danh bạ, nhật ký cuộc gọi</li>
        <li><strong>Đánh cắp OTP:</strong> Chặn và gửi mã OTP cho hacker</li>
        <li><strong>Overlay Attack:</strong> Hiển thị giao diện giả mạo app ngân hàng</li>
        <li><strong>Keylogging:</strong> Ghi lại mọi thao tác nhập liệu</li>
        <li><strong>Remote Control:</strong> Cho phép hacker điều khiển từ xa</li>
      </ol>
      
      <h3>Dấu hiệu nhận biết</h3>
      <ul>
        <li>Ứng dụng yêu cầu quyền truy cập bất thường</li>
        <li>Pin tụt nhanh, thiết bị nóng máy</li>
        <li>Xuất hiện quảng cáo lạ</li>
        <li>Ứng dụng ngân hàng hoạt động không bình thường</li>
        <li>Nhận được SMS lạ hoặc mất SMS</li>
      </ul>
      
      <h3>Các ứng dụng bị nhiễm</h3>
      <p>Malware thường ẩn trong các ứng dụng:</p>
      <ul>
        <li>Ứng dụng đèn pin</li>
        <li>Trình dọn dẹp, tăng tốc</li>
        <li>Game giải trí</li>
        <li>Ứng dụng xem phim, nghe nhạc</li>
        <li>App giao hàng, mua sắm giả mạo</li>
      </ul>
      
      <h3>Biện pháp phòng chống</h3>
      <ol>
        <li><strong>Chỉ tải app từ CH Play:</strong> Tránh nguồn không rõ ràng</li>
        <li><strong>Kiểm tra quyền truy cập:</strong> Từ chối quyền không cần thiết</li>
        <li><strong>Cài đặt antivirus:</strong> Sử dụng phần mềm bảo mật uy tín</li>
        <li><strong>Cập nhật Android:</strong> Luôn dùng phiên bản mới nhất</li>
        <li><strong>Xem review:</strong> Đọc đánh giá trước khi cài</li>
        <li><strong>Theo dõi tài khoản:</strong> Kiểm tra giao dịch thường xuyên</li>
      </ol>
      
      <h3>Nếu bị nhiễm</h3>
      <p>Hãy thực hiện ngay:</p>
      <ol>
        <li>Bật chế độ máy bay</li>
        <li>Gỡ cài đặt ứng dụng đáng ngờ</li>
        <li>Thay đổi mật khẩu ngân hàng</li>
        <li>Liên hệ ngân hàng để khóa tài khoản tạm thời</li>
        <li>Reset factory nếu cần thiết</li>
        <li>Báo cáo với cơ quan chức năng</li>
      </ol>
      
      <p><strong>Lưu ý:</strong> Ngân hàng không bao giờ yêu cầu cung cấp mã OTP qua điện thoại hoặc email.</p>
    `,
    category: 'malware',
    tags: ['android', 'trojan', 'ngân hàng', 'OTP', 'malware'],
    status: 'published',
    priority: 'urgent',
    isBreaking: true,
    views: 4521,
    likes: 312,
    seoMetadata: {
      title: 'Cảnh báo: Trojan Android đánh cắp OTP và thông tin ngân hàng',
      description: 'Malware nguy hiểm trên Android đang đánh cắp mã OTP. Hơn 100,000 thiết bị bị nhiễm tại VN.'
    }
  },
  {
    title: 'Rò rỉ dữ liệu lớn: 500 triệu tài khoản người dùng bị lộ thông tin',
    summary: 'Một công ty công nghệ lớn vừa xác nhận vụ rò rỉ dữ liệu ảnh hưởng đến 500 triệu người dùng trên toàn cầu. Thông tin cá nhân, email và số điện thoại bị lộ.',
    content: `
      <h2>Vụ Rò Rỉ Dữ Liệu Quy Mô Lớn</h2>
      <p>Một trong những vụ rò rỉ dữ liệu lớn nhất trong năm vừa được phát hiện, ảnh hưởng đến hàng trăm triệu người dùng trên toàn thế giới.</p>
      
      <h3>Thông tin bị rò rỉ</h3>
      <p>Dữ liệu bị lộ bao gồm:</p>
      <ul>
        <li>Họ tên đầy đủ</li>
        <li>Địa chỉ email</li>
        <li>Số điện thoại</li>
        <li>Địa chỉ nhà</li>
        <li>Ngày sinh</li>
        <li>Giới tính</li>
        <li>Thông tin tài khoản (không bao gồm mật khẩu)</li>
        <li>Lịch sử hoạt động</li>
      </ul>
      
      <h3>Nguyên nhân</h3>
      <p>Theo điều tra ban đầu, vụ rò rỉ xảy ra do:</p>
      <ul>
        <li>Lỗ hổng trong API của bên thứ ba</li>
        <li>Thiếu mã hóa dữ liệu nhạy cảm</li>
        <li>Không phát hiện kịp thời hoạt động bất thường</li>
        <li>Quyền truy cập không được kiểm soát chặt chẽ</li>
      </ul>
      
      <h3>Hậu quả</h3>
      <p>Người dùng bị ảnh hưởng có thể đối mặt với:</p>
      <ul>
        <li>Spam qua email và SMS</li>
        <li>Các cuộc gọi lừa đảo</li>
        <li>Phishing nhắm mục tiêu</li>
        <li>Đánh cắp danh tính</li>
        <li>Tống tiền trực tuyến</li>
      </ul>
      
      <h3>Phản ứng của công ty</h3>
      <p>Công ty đã thực hiện các biện pháp sau:</p>
      <ol>
        <li>Thông báo cho người dùng bị ảnh hưởng</li>
        <li>Vá lỗ hổng bảo mật</li>
        <li>Hợp tác với cơ quan thực thi pháp luật</li>
        <li>Cung cấp dịch vụ giám sát tín dụng miễn phí</li>
        <li>Tăng cường các biện pháp bảo mật</li>
      </ol>
      
      <h3>Kiểm tra tài khoản của bạn</h3>
      <p>Để kiểm tra xem thông tin của bạn có bị lộ hay không:</p>
      <ol>
        <li>Truy cập trang kiểm tra chính thức của công ty</li>
        <li>Nhập email hoặc số điện thoại</li>
        <li>Nhận thông báo kết quả qua email</li>
      </ol>
      
      <h3>Những gì người dùng nên làm</h3>
      <ol>
        <li><strong>Thay đổi mật khẩu:</strong> Tất cả tài khoản liên quan</li>
        <li><strong>Kích hoạt 2FA:</strong> Bảo vệ thêm một lớp</li>
        <li><strong>Cảnh giác với lừa đảo:</strong> Không tin email/tin nhắn lạ</li>
        <li><strong>Giám sát tài khoản:</strong> Kiểm tra hoạt động bất thường</li>
        <li><strong>Đăng ký cảnh báo:</strong> Nhận thông báo khi có hoạt động lạ</li>
      </ol>
      
      <h3>Bài học rút ra</h3>
      <p>Vụ việc này nhấn mạnh tầm quan trọng của:</p>
      <ul>
        <li>Mã hóa dữ liệu nhạy cảm</li>
        <li>Kiểm tra bảo mật thường xuyên</li>
        <li>Giám sát và phát hiện mối đe dọa</li>
        <li>Tuân thủ các quy định bảo vệ dữ liệu</li>
        <li>Đào tạo nhân viên về bảo mật</li>
      </ul>
      
      <p><strong>Cập nhật:</strong> Công ty cam kết bồi thường cho người dùng bị ảnh hưởng và tăng cường đầu tư vào bảo mật.</p>
    `,
    category: 'data-breach',
    tags: ['rò rỉ dữ liệu', 'data breach', 'bảo mật', 'thông tin cá nhân'],
    status: 'published',
    priority: 'high',
    isBreaking: true,
    views: 5824,
    likes: 421,
    seoMetadata: {
      title: 'Rò rỉ 500 triệu tài khoản: Vụ data breach lớn nhất năm',
      description: 'Công ty công nghệ lớn xác nhận rò rỉ thông tin 500 triệu người dùng. Cách kiểm tra và bảo vệ tài khoản.'
    }
  }
];

// Connect to MongoDB and seed data
async function seedDatabase() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find admin user
    const adminUser = await User.findOne({ role: 'admin' });
    if (!adminUser) {
      console.error('❌ Admin user not found. Please create an admin user first.');
      process.exit(1);
    }

    console.log(`📝 Using admin: ${adminUser.fullName} (${adminUser.email})`);

    // Clear existing news (optional - comment out if you want to keep existing)
    // await News.deleteMany({});
    // console.log('🗑️  Cleared existing news');

    // Add author info and published date to each news
    const newsWithAuthor = newsData.map(news => ({
      ...news,
      author: {
        name: adminUser.fullName,
        email: adminUser.email,
        avatar: adminUser.avatar
      },
      publishedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000) // Random date within last 7 days
    }));

    // Insert news
    const createdNews = await News.insertMany(newsWithAuthor);
    console.log(`✅ Created ${createdNews.length} news articles`);

    // Display summary
    console.log('\n📊 Summary:');
    console.log(`   - Total articles: ${createdNews.length}`);
    console.log(`   - Breaking news: ${createdNews.filter(n => n.isBreaking).length}`);
    console.log(`   - Featured: ${createdNews.filter(n => n.isFeatured).length}`);
    console.log(`   - Urgent priority: ${createdNews.filter(n => n.priority === 'urgent').length}`);
    
    console.log('\n📂 Categories:');
    const categories = {};
    createdNews.forEach(news => {
      categories[news.category] = (categories[news.category] || 0) + 1;
    });
    Object.entries(categories).forEach(([cat, count]) => {
      console.log(`   - ${cat}: ${count} articles`);
    });

    console.log('\n✨ Database seeding completed successfully!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

// Run the seeding
seedDatabase();
