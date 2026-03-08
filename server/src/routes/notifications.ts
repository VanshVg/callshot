import { Router, Response } from 'express';
import { Notification } from '../models/index';
import { protect } from '../middleware/auth';
import { AuthRequest } from '../types/index';

const router = Router();

router.use(protect);

// ── Get notifications for the current user ────────────────────────────────────

router.get('/', async (req: AuthRequest, res: Response) => {
  const notifications = await Notification.find({ user: req.user!.id })
    .populate('group', 'name')
    .sort({ createdAt: -1 })
    .limit(50);
  res.json({ notifications });
});

// ── Mark all notifications as read ────────────────────────────────────────────

router.put('/read', async (req: AuthRequest, res: Response) => {
  await Notification.updateMany({ user: req.user!.id, read: false }, { read: true });
  res.json({ message: 'Marked as read' });
});

export default router;
