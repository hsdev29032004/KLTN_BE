require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Hàm tạo slug từ tên
function generateSlug(name) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Hàm tạo mô tả ngẫu nhiên
function generateDescription() {
  const descriptions = [
    'Khóa học toàn diện cung cấp kiến thức từ cơ bản đến nâng cao. Bạn sẽ học được các khái niệm chính, thực hành với ví dụ thực tế và xây dựng dự án hoàn chỉnh. Phù hợp cho những người muốn nâng cao kỹ năng lập trình của mình.',
    'Một khóa học chuyên sâu dành cho những ai muốn trở thành chuyên gia trong lĩnh vực này. Chúng tôi sẽ đi vào chi tiết các nguyên lý, kỹ thuật tiên tiến và các best practices trong ngành công nghiệp.',
    'Khóa học này được thiết kế để giúp bạn nắm vững các kỹ năng cần thiết. Với sự hướng dẫn từ các chuyên gia, bạn sẽ được phát triển từng bước và có cơ hội thực hành trên các bài tập thực tế.',
    'Tìm hiểu sâu về các công nghệ hiện đại và cách áp dụng chúng vào thực tiễn. Khóa học này cung cấp cả lý thuyết và thực hành, giúp bạn sẵn sàng cho những thử thách trong công việc.',
  ];
  return descriptions[Math.floor(Math.random() * descriptions.length)];
}

// Hàm tạo nội dung khóa học
function generateContent() {
  const contents = [
    'Nắm vững các khái niệm cơ bản và nâng cao về công nghệ được giảng dạy.|Áp dụng kiến thức lý thuyết vào các dự án thực tế.|Hiểu rõ về các mẫu thiết kế và best practices.|Phát triển kỹ năng debug và giải quyết vấn đề hiệu quả.',
    'Học các nguyên lý cơ bản và kiến trúc của hệ thống.|Thực hành với các ví dụ thực tế từ ngành công nghiệp.|Tích hợp với các công cụ và framework phổ biến.|Tối ưu hóa hiệu suất và bảo mật trong ứng dụng của bạn.',
    'Hiểu rõ quy trình phát triển từ lên ý tưởng đến triển khai.|Học cách làm việc với các công cụ chuyên nghiệp.|Phát triển khả năng giải quyết vấn đề phức tạp.|Xây dựng các dự án có quy mô lớn một cách hiệu quả.',
    'Khám phá các tính năng mới và cập nhật của công nghệ.|Học từ các ví dụ thực tế và case studies.|Hiểu về các xu hướng hiện tại trong ngành.|Chuẩn bị để trở thành chuyên gia trong lĩnh vực của bạn.',
  ];
  return contents[Math.floor(Math.random() * contents.length)];
}

async function main() {
  console.log('📚 Starting to add courses...');

  const userId = '12a95338-4547-4cf7-8d3e-b0b65005e30l';
  const publishedBy = '12a95338-4547-4cf7-8d3e-b0b65005e30d';

  const coursesData = [
    {
      name: 'Khóa học NextJS 14-ReactJS-Typescript thực chiến',
      slug: 'khoa-hoc-nextjs-14-reactjs-typescript-thuc-chien',
      price: 299000,
      thumbnail:
        'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEiqiYsZyeqxncmfFoFqeptTj_Ji8ac0H6XXOnPOCbdB2Ye6etBjbs2nqAqTDu6sPJJ46W8bm4mXAVicyfRA6Q-XqNwHLfG_6CiBYe2ZIFKKSv-n6Fcc3bjFxXpW-LOj_BIv7Zu3GWAetjOqGPJEvDcScezGwfdgPnJ0dRZZPIWnOGYGH9r2nVs9I3W8UjY/s320-rw/5712300_b951_5.jpg',
    },
    {
      name: 'NestJS: Cẩm nang toàn diện dành cho nhà phát triển',
      slug: 'nestjs-cam-nang-toan-dien-danh-cho-nha-phat-trien',
      price: 349000,
      thumbnail: 'https://img-c.udemycdn.com/course/480x270/4174580_dd1c.jpg',
    },
    {
      name: 'HRBP – Đối tác Kinh Doanh Xuất Sắc',
      slug: 'hrbp-doi-tac-kinh-doanh-xuat-sac',
      price: 199000,
      thumbnail:
        'https://media.licdn.com/dms/image/v2/D4D12AQFr1Dw11W0_UA/article-cover_image-shrink_600_2000/article-cover_image-shrink_600_2000/0/1730813124391?e=2147483647&v=beta&t=bo7LmJhsq-V4diNXGITc5bH_Ub-HZcX_--qOZeAdokI',
    },
  ];

  for (const courseData of coursesData) {
    const slug = generateSlug(courseData.name);

    const existing = await prisma.course.findFirst({
      where: { slug },
    });

    if (!existing) {
      const course = await prisma.course.create({
        data: {
          name: courseData.name,
          price: courseData.price,
          thumbnail: courseData.thumbnail,
          slug: slug,
          description: generateDescription(),
          content: generateContent(),
          status: 'published',
          studentCount: 0,
          star: parseFloat((Math.random() * 4 + 1).toFixed(1)), // 1.0 - 5.0
          userId: userId,
          publishedBy: publishedBy,
          publishedAt: new Date(),
        },
      });

      console.log(`✅ Created course: ${course.name}`);
    } else {
      console.log(`⏭️  Course already exists: ${courseData.name}`);
    }
  }

  console.log('\n✨ Course creation completed!');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
