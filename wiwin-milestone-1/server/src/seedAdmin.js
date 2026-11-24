require('dotenv').config();
const bcrypt = require('bcryptjs');
const prisma = require('./lib/prisma');
async function main() {
  const name = process.env.ADMIN_NAME; const email = process.env.ADMIN_EMAIL?.toLowerCase(); const password = process.env.ADMIN_PASSWORD;
  if (!name || !email || !password || password.length < 12) throw new Error('Set ADMIN_NAME, ADMIN_EMAIL and an ADMIN_PASSWORD of at least 12 characters in .env.');
  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.upsert({ where: { email }, update: { fullName: name, passwordHash, role: 'ADMIN', isActive: true }, create: { fullName: name, email, passwordHash, role: 'ADMIN' } });
  const categories = [
    ['Business and Wealth','business-and-wealth'], ['Technology and Innovation','technology-and-innovation'],
    ['Education and Academia','education-and-academia'], ['Entertainment and Creativity','entertainment-and-creativity'],
    ['Leadership and Influence','leadership-and-influence'], ['Agriculture','agriculture'], ['Sports','sports'],
    ['Public Service','public-service'], ['Community Development','community-development'], ['Young Achievers','young-achievers']
  ];
  for (const [name, slug] of categories) await prisma.category.upsert({ where: { slug }, update: { name, isActive: true }, create: { name, slug } });
  console.log(`Administrator ready: ${email}`);
}
main().catch(e => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
