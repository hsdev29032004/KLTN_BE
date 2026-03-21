require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Hàm tạo slug giống các script khác
function generateSlug(name) {
  return name
    .toLowerCase()
    .normalize('NFD')
    // Xóa dấu (ví dụ: 'ấ' -> 'a')
    .replace(/\p{Diacritic}/gu, '')
    // Chuyển 'đ' sang 'd' (vì 'Đ' không phân rã bằng NFD)
    .replace(/đ/g, 'd')
    // Thay các ký tự không phải chữ số/chữ cái thành '-'
    .replace(/[^a-z0-9]+/g, '-')
    // Bỏ các dấu '-' thừa ở đầu/cuối
    .replace(/^-+|-+$/g, '');
}

async function main() {
  console.log('📚 Bắt đầu thêm chủ đề (topics)...');

  const topics = [
    'Lập trình',
    'Kỹ năng mềm',
    'Kinh doanh',
    'Kỹ năng sống',
    'Khoa học dữ liệu',
    'Học máy',
    'Phần cưngs',
    'Thiết kế UI/UX',
    'Khác',
    'Điện tử',
  ];

  for (const name of topics) {
    const slug = generateSlug(name);
    const existing = await prisma.topic.findFirst({ where: { slug } });
    if (existing) {
      console.log(`⏭️  Đã tồn tại: ${name} (${slug})`);
      continue;
    }

    await prisma.topic.create({ data: { name, slug } });
    console.log(`✅ Tạo chủ đề: ${name} (${slug})`);
  }

  console.log('\n✨ Hoàn tất thêm chủ đề.');
}

main()
  .catch((e) => {
    console.error('❌ Lỗi:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
