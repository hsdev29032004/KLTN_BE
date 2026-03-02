require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Hàm tạo tên lesson theo chủ đề
function generateLessonNames(courseName, count) {
  const lessonNameMaps = {
    'NextJS': [
      'Giới thiệu NextJS 14 và thiết lập môi trường',
      'Routing và File-based Navigation trong NextJS',
      'Server Components và Client Components',
      'API Routes và Backend Integration',
    ],
    'NestJS': [
      'Giới thiệu NestJS - Framework lý tưởng cho Backend',
      'Controllers, Services và Dependency Injection',
      'Databases, TypeORM và Relationships',
      'Authentication, Authorization và Security',
    ],
    'HRBP': [
      'Vai trò và Trách nhiệm của HRBP trong Tổ chức',
      'Chiến lược HR và Alignment với Business Goals',
      'Phát triển Talent và Succession Planning',
      'Change Management và Organizational Development',
    ],
  };

  // Tìm key phù hợp từ tên khóa học
  let lessons = [];
  for (const [key, names] of Object.entries(lessonNameMaps)) {
    if (courseName.includes(key)) {
      lessons = names;
      break;
    }
  }

  // Nếu không tìm thấy, dùng lessons chung
  if (lessons.length === 0) {
    lessons = [
      `Bài 1: Giới thiệu và Khái niệm Cơ bản`,
      `Bài 2: Thiết lập và Cấu hình`,
      `Bài 3: Kỹ thuật Nâng cao`,
      `Bài 4: Dự án Thực tế và Best Practices`,
    ];
  }

  return lessons.slice(0, count);
}

async function main() {
  console.log('📚 Starting to add lessons to courses...');

  const publishedBy = 'a1bc8386-b2d8-480d-ad41-d4b2da939abf';

  // Lấy tất cả các khóa học
  const courses = await prisma.course.findMany({
    where: { status: 'published', isDeleted: false },
  });

  if (courses.length === 0) {
    console.log('❌ No published courses found!');
    return;
  }

  console.log(`📖 Found ${courses.length} published courses\n`);

  for (const course of courses) {
    const lessonCount = Math.random() > 0.5 ? 4 : 3;
    const lessonNames = generateLessonNames(course.name, lessonCount);

    for (let i = 0; i < lessonNames.length; i++) {
      const existing = await prisma.lesson.findFirst({
        where: {
          courseId: course.id,
          name: lessonNames[i],
          isDeleted: false,
        },
      });

      if (!existing) {
        const lesson = await prisma.lesson.create({
          data: {
            courseId: course.id,
            name: lessonNames[i],
            status: 'published',
            publisherId: publishedBy,
            publishedAt: new Date(),
          },
        });

        console.log(`  ✅ Created lesson: ${lesson.name}`);
      } else {
        console.log(`  ⏭️  Lesson already exists: ${lessonNames[i]}`);
      }
    }

    console.log(`✨ Completed course: ${course.name}\n`);
  }

  console.log('\n✨ Lesson creation completed!');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
