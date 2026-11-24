const express = require('express');
const bcrypt = require('bcryptjs');
const { z } = require('zod');
const prisma = require('../lib/prisma');
const { requireAdmin } = require('../middleware/auth');
const router = express.Router();
const statuses = ['SUBMITTED','UNDER_REVIEW','ADDITIONAL_INFORMATION_REQUIRED','SHORTLISTED','APPROVED','INVITED','ACCEPTED','SCHEDULED','INTERVIEWED','DECLINED','NOT_SELECTED'];
router.post('/auth/login', async (req, res, next) => {
  try {
    const parsed = z.object({ email: z.string().email(), password: z.string().min(1) }).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success: false, message: 'Enter a valid email and password.' });
    const user = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
    if (!user || !user.isActive || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    req.session.user = { id: user.id, fullName: user.fullName, email: user.email, role: user.role };
    await prisma.auditLog.create({ data: { userId: user.id, action: 'LOGIN', resourceType: 'USER', resourceId: user.id, ipAddress: req.ip } });
    res.json({ success: true, data: req.session.user });
  } catch (e) { next(e); }
});
router.post('/auth/logout', (req, res, next) => req.session.destroy(err => err ? next(err) : res.json({ success: true, message: 'Signed out.' })));
router.get('/auth/me', (req, res) => req.session?.user ? res.json({ success: true, data: req.session.user }) : res.status(401).json({ success: false, message: 'Not signed in.' }));
router.use(requireAdmin);
router.get('/dashboard', async (_req, res, next) => {
  try {
    const [applications, nominations, pending, categories] = await Promise.all([
      prisma.applicant.count(), prisma.nomination.count(), prisma.applicant.count({ where: { status: 'SUBMITTED' } }), prisma.category.count({ where: { isActive: true } })
    ]);
    res.json({ success: true, data: { applications, nominations, pendingApplications: pending, activeCategories: categories } });
  } catch (e) { next(e); }
});
router.get('/applications', async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1); const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
    const where = req.query.status && statuses.includes(req.query.status) ? { status: req.query.status } : {};
    const [items, total] = await Promise.all([
      prisma.applicant.findMany({ where, include: { category: { select: { name: true } } }, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
      prisma.applicant.count({ where })
    ]);
    res.json({ success: true, data: items, meta: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (e) { next(e); }
});
router.get('/applications/:id', async (req, res, next) => {
  try {
    const item = await prisma.applicant.findUnique({ where: { id: req.params.id }, include: { category: true, reviews: { orderBy: { createdAt: 'desc' }, include: { user: { select: { fullName: true } } } } } });
    if (!item) return res.status(404).json({ success: false, message: 'Application not found.' });
    res.json({ success: true, data: item });
  } catch (e) { next(e); }
});
router.patch('/applications/:id/status', async (req, res, next) => {
  try {
    const parsed = z.object({ status: z.enum(statuses), note: z.string().max(2000).optional() }).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success: false, message: 'Invalid application status.' });
    const existing = await prisma.applicant.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ success: false, message: 'Application not found.' });
    const result = await prisma.$transaction(async tx => {
      const updated = await tx.applicant.update({ where: { id: existing.id }, data: { status: parsed.data.status } });
      await tx.applicationReview.create({ data: { applicantId: existing.id, userId: req.session.user.id, note: parsed.data.note, fromStatus: existing.status, toStatus: parsed.data.status } });
      await tx.auditLog.create({ data: { userId: req.session.user.id, action: 'APPLICATION_STATUS_UPDATED', resourceType: 'APPLICANT', resourceId: existing.id, details: { from: existing.status, to: parsed.data.status }, ipAddress: req.ip } });
      return updated;
    });
    res.json({ success: true, message: 'Application status updated.', data: { id: result.id, status: result.status } });
  } catch (e) { next(e); }
});
router.get('/nominations', async (req, res, next) => {
  try { const items = await prisma.nomination.findMany({ orderBy: { createdAt: 'desc' }, take: 100 }); res.json({ success: true, data: items }); } catch (e) { next(e); }
});
module.exports = router;
