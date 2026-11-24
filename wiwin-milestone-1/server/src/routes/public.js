const express = require('express');
const { z } = require('zod');
const crypto = require('node:crypto');
const prisma = require('../lib/prisma');
const router = express.Router();
const applicationSchema = z.object({
  fullName: z.string().trim().min(2).max(150),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().min(7).max(30),
  dateOfBirth: z.string().optional().or(z.literal('')),
  location: z.string().trim().min(2).max(150),
  lga: z.string().trim().max(100).optional().or(z.literal('')),
  nasarawaConnection: z.enum(['INDIGENE','BORN_IN_NASARAWA','LIVES_IN_NASARAWA','WORKS_IN_NASARAWA','CONTRIBUTOR']),
  profession: z.string().trim().min(2).max(150),
  categoryId: z.string().uuid(),
  achievements: z.string().trim().min(10).max(5000),
  proposedTopic: z.string().trim().min(5).max(2000),
  motivation: z.string().trim().min(10).max(3000),
  privacyConsent: z.literal(true),
  mediaConsent: z.boolean().default(false)
});
const nominationSchema = z.object({
  nominatorName: z.string().trim().min(2).max(150),
  nominatorEmail: z.string().trim().email(),
  nomineeName: z.string().trim().min(2).max(150),
  nomineeEmail: z.string().trim().email().optional().or(z.literal('')),
  nomineeProfession: z.string().max(150).optional(),
  nomineeLocation: z.string().max(150).optional(),
  reason: z.string().trim().min(10).max(3000),
  supportingUrl: z.string().url().optional().or(z.literal(''))
});
function reference(prefix) { return `${prefix}-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`; }
router.get('/health', (_req, res) => res.json({ success: true, message: 'WIWIN API is running.' }));
router.get('/categories', async (_req, res, next) => {
  try { const data = await prisma.category.findMany({ where: { isActive: true }, orderBy: { name: 'asc' }, select: { id: true, name: true, slug: true, description: true } }); res.json({ success: true, data }); } catch (e) { next(e); }
});
router.post('/applications', async (req, res, next) => {
  try {
    const parsed = applicationSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success: false, message: 'Please review the application fields.', errors: parsed.error.issues.map(i => ({ field: i.path.join('.'), message: i.message })) });
    const v = parsed.data;
    const category = await prisma.category.findFirst({ where: { id: v.categoryId, isActive: true } });
    if (!category) return res.status(400).json({ success: false, message: 'Please select a valid category.' });
    const data = await prisma.applicant.create({ data: {
      referenceNumber: reference('WIWIN-APP'), fullName: v.fullName, email: v.email.toLowerCase(), phone: v.phone,
      dateOfBirth: v.dateOfBirth ? new Date(`${v.dateOfBirth}T00:00:00.000Z`) : undefined,
      location: v.location, lga: v.lga || null, nasarawaConnection: v.nasarawaConnection,
      profession: v.profession, categoryId: v.categoryId, achievements: v.achievements,
      proposedTopic: v.proposedTopic, motivation: v.motivation, privacyConsent: true, mediaConsent: v.mediaConsent
    }, select: { referenceNumber: true, status: true, createdAt: true } });
    res.status(201).json({ success: true, message: 'Your application has been received. Keep your reference number safe.', data });
  } catch (e) { next(e); }
});
router.get('/applications/track/:reference', async (req, res, next) => {
  try {
    const item = await prisma.applicant.findUnique({ where: { referenceNumber: req.params.reference.toUpperCase() }, select: { referenceNumber: true, status: true, createdAt: true, updatedAt: true } });
    if (!item) return res.status(404).json({ success: false, message: 'Application reference not found.' });
    res.json({ success: true, data: item });
  } catch (e) { next(e); }
});
router.post('/nominations', async (req, res, next) => {
  try {
    const parsed = nominationSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success: false, message: 'Please review the nomination fields.', errors: parsed.error.issues.map(i => ({ field: i.path.join('.'), message: i.message })) });
    const v = parsed.data;
    const item = await prisma.nomination.create({ data: { referenceNumber: reference('WIWIN-NOM'), nominatorName: v.nominatorName, nominatorEmail: v.nominatorEmail.toLowerCase(), nomineeName: v.nomineeName, nomineeEmail: v.nomineeEmail || null, nomineeProfession: v.nomineeProfession || null, nomineeLocation: v.nomineeLocation || null, reason: v.reason, supportingUrl: v.supportingUrl || null }, select: { referenceNumber: true, status: true, createdAt: true } });
    res.status(201).json({ success: true, message: 'Thank you. Your nomination has been received.', data: item });
  } catch (e) { next(e); }
});
module.exports = router;
