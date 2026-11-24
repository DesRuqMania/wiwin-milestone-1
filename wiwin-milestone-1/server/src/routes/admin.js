const express = require('express');
const bcrypt = require('bcryptjs');
const { z } = require('zod');
const nodemailer = require('nodemailer');
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
router.post('/applications/:id/interview-invitation', async (req, res, next) => {
  try {
    const parsed = z.object({
      startAt: z.string().min(1),
      platformUrl: z.string().url()
    }).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success: false, message: 'Enter a valid starting time and platform link.' });
    const startDate = new Date(parsed.data.startAt);
    if (Number.isNaN(startDate.getTime())) return res.status(400).json({ success: false, message: 'Enter a valid starting time.' });

    const applicant = await prisma.applicant.findUnique({ where: { id: req.params.id } });
    if (!applicant) return res.status(404).json({ success: false, message: 'Application not found.' });

    const escapeHtml = value => String(value).replace(/[&<>"']/g, character => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;' })[character]);
    const formattedTime = startDate.toLocaleString('en-NG', { dateStyle: 'full', timeStyle: 'short', timeZone: 'Africa/Lagos' });
    const subject = `WIWIN interview invitation: ${formattedTime}`;
    const logoUrl = `${(process.env.APP_BASE_URL || 'http://localhost:3000').replace(/\/$/, '')}/wiwin-logo.png`;
    const previewText = `Dear ${applicant.fullName}, you have been selected for a WIWIN interview. Please join us at the starting time below.`;
    const html = `<!doctype html><html><body style="margin:0;background:#090d16;color:#eef2fa;font-family:Arial,sans-serif">
      <table role="presentation" width="100%" style="background:#090d16;padding:32px 12px"><tr><td align="center">
        <table role="presentation" width="600" style="max-width:600px;width:100%;background:#111827;border:1px solid #263247;border-radius:10px;overflow:hidden">
          <tr><td align="center" style="padding:24px;background:#090d16"><img src="${escapeHtml(logoUrl)}" alt="WIWIN" style="max-width:420px;width:85%;height:auto"></td></tr>
          <tr><td style="padding:34px"><p style="color:#d4a574;font-size:12px;letter-spacing:2px;margin:0 0 18px">INTERVIEW INVITATION</p>
          <h1 style="font-size:28px;line-height:1.25;margin:0 0 18px">Your WIWIN interview is scheduled</h1>
          <p style="color:#cbd5e4;line-height:1.7">Dear ${escapeHtml(applicant.fullName)},</p>
          <p style="color:#cbd5e4;line-height:1.7">${escapeHtml(previewText)}</p>
          <div style="margin:24px 0;padding:18px;border:1px solid #263247;border-radius:6px;background:#0b111d">
            <p style="margin:0 0 8px;color:#98a4b8;font-size:12px">STARTING TIME</p><strong style="color:#fff;font-size:16px">${escapeHtml(formattedTime)}</strong>
          </div>
          <p style="margin:0 0 12px;color:#98a4b8;font-size:12px">PLATFORM LINK</p>
          <p style="margin:0 0 24px"><a href="${escapeHtml(parsed.data.platformUrl)}" style="color:#6ca8ff;text-decoration:underline">${escapeHtml(parsed.data.platformUrl)}</a></p>
          <a href="${escapeHtml(parsed.data.platformUrl)}" style="display:inline-block;background:#e8f0ff;color:#101a2a;text-decoration:none;font-weight:bold;padding:14px 18px;border-radius:5px">Join the interview</a>
          <p style="color:#98a4b8;font-size:12px;line-height:1.7;margin-top:28px">Please join a few minutes early and ensure a quiet environment and stable internet connection.</p>
          </td></tr>
        </table>
      </td></tr></table>
    </body></html>`;

    let delivery = 'preview';
    if (process.env.SMTP_HOST) {
      const transport = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: Number(process.env.SMTP_PORT || 587) === 465,
        auth: process.env.SMTP_USER && process.env.SMTP_PASS ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined
      });
      await transport.sendMail({
        from: process.env.SMTP_FROM || process.env.ADMIN_EMAIL || 'WIWIN <noreply@localhost>',
        to: applicant.email,
        subject,
        text: `${previewText}\n\nStarting time: ${formattedTime}\nPlatform link: ${parsed.data.platformUrl}\n\nPlease join a few minutes early.`,
        html
      });
      delivery = 'sent';
    }

    await prisma.$transaction(async tx => {
      await tx.applicant.update({ where: { id: applicant.id }, data: { status: 'SCHEDULED' } });
      await tx.applicationReview.create({ data: { applicantId: applicant.id, userId: req.session.user.id, note: `Interview invitation prepared for ${formattedTime}. Platform: ${parsed.data.platformUrl}`, fromStatus: applicant.status, toStatus: 'SCHEDULED' } });
      await tx.auditLog.create({ data: { userId: req.session.user.id, action: delivery === 'sent' ? 'INTERVIEW_INVITATION_SENT' : 'INTERVIEW_INVITATION_PREVIEWED', resourceType: 'APPLICANT', resourceId: applicant.id, details: { startAt: startDate.toISOString(), platformUrl: parsed.data.platformUrl, delivery }, ipAddress: req.ip } });
    });
    res.json({ success: true, data: { to: applicant.email, subject, previewText, delivery, html } });
  } catch (e) { next(e); }
});
router.get('/nominations', async (req, res, next) => {
  try { const items = await prisma.nomination.findMany({ orderBy: { createdAt: 'desc' }, take: 100 }); res.json({ success: true, data: items }); } catch (e) { next(e); }
});
module.exports = router;
