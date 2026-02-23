require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Danh sách ảnh có sẵn để random
const imageUrls = [
  'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=500&h=300&fit=crop',
  'https://images.unsplash.com/photo-1552664730-d307ca884978?w=500&h=300&fit=crop',
  'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=500&h=300&fit=crop',
  'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=500&h=300&fit=crop',
  'https://images.unsplash.com/photo-1552664730-d307ca884978?w=500&h=300&fit=crop',
  'https://images.unsplash.com/photo-1516321318423-f06f70d504f0?w=500&h=300&fit=crop',
  'https://images.unsplash.com/photo-1516321497487-e288fb19713f?w=500&h=300&fit=crop',
  'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=500&h=300&fit=crop',
];

// Hàm generate tên material liên quan tới lesson name
function generateMaterialName(lessonName, type, index) {
  // Loại bỏ các ký tự không cần thiết từ lesson name
  const baseNames = lessonName
    .split(' và ')
    .concat(lessonName.split(' - '))
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const baseName = baseNames[0] || 'Nội dung bài học';

  if (type === 'video') {
    const videoSuffixes = [
      'Chi tiết',
      'Hướng dẫn',
      'Thực hành',
      'Luyện tập',
    ];
    return `${baseName} - ${videoSuffixes[index % videoSuffixes.length]} (Video)`;
  } else {
    const imageSuffixes = [
      'Sơ đồ',
      'Biểu đồ',
      'Ví dụ',
      'Tài liệu',
    ];
    return `${baseName} - ${imageSuffixes[index % imageSuffixes.length]} (Ảnh)`;
  }
}

// Hàm lấy random ảnh URL
function getRandomImageUrl() {
  return imageUrls[Math.floor(Math.random() * imageUrls.length)];
}

async function main() {
  console.log('📹 Starting to add lesson materials...');

  const publishedBy = 'a1bc8386-b2d8-480d-ad41-d4b2da939abf';

  // Lấy tất cả lessons
  const lessons = await prisma.lesson.findMany({
    where: { status: 'published', isDeleted: false },
    include: { course: true },
  });

  if (lessons.length === 0) {
    console.log('❌ No published lessons found!');
    return;
  }

  console.log(`📚 Found ${lessons.length} published lessons\n`);

  for (const lesson of lessons) {
    // Tạo 1-2 materials cho mỗi lesson
    const materialCount = Math.random() > 0.5 ? 2 : 1;
    const types = ['video', 'img'];

    for (let i = 0; i < materialCount; i++) {
      const type = types[Math.floor(Math.random() * types.length)];
      const materialName = generateMaterialName(lesson.name, type, i);

      const existing = await prisma.lessonMaterial.findFirst({
        where: {
          lessonId: lesson.id,
          name: materialName,
          isDeleted: false,
        },
      });

      if (!existing) {
        // Tạo material trước để lấy id
        const material = await prisma.lessonMaterial.create({
          data: {
            lessonId: lesson.id,
            type: type,
            name: materialName,
            url: '', // Để trống tạm thời
            status: 'published',
            publisherId: publishedBy,
            publishedAt: new Date(),
          },
        });

        // Xác định URL dựa trên type
        let finalUrl;
        if (type === 'video') {
          finalUrl = material.id; // Video: url = id
        } else {
          finalUrl = getRandomImageUrl(); // Ảnh: random image url
        }

        // Update URL của material
        await prisma.lessonMaterial.update({
          where: { id: material.id },
          data: { url: finalUrl },
        });

        console.log(
          `  ✅ Created material: ${materialName} (${type}) - ${lesson.name}`
        );
      } else {
        console.log(
          `  ⏭️  Material already exists: ${materialName} - ${lesson.name}`
        );
      }
    }

    console.log(`✨ Completed lesson: ${lesson.name}\n`);
  }

  console.log('\n✨ Lesson material creation completed!');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
