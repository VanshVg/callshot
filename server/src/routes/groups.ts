import { Router, Response } from 'express';
import { nanoid } from 'nanoid';
import { body } from 'express-validator';
import { validationResult } from 'express-validator';
import { Group } from '../models/index';
import { protect } from '../middleware/auth';
import { AuthRequest } from '../types/index';

const router = Router();

router.use(protect);

router.post(
  '/',
  [
    body('name').trim().notEmpty().withMessage('Group name is required'),
    body('tournamentId').notEmpty().withMessage('Tournament is required'),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) { res.status(400).json({ errors: errors.array() }); return; }

    const { name, description, tournamentId } = req.body as { name: string; description?: string; tournamentId: string };
    const inviteCode = nanoid(8).toUpperCase();

    const created = await Group.create({
      name,
      description: description || '',
      createdBy: req.user!.id,
      inviteCode,
      members: [req.user!.id],
      tournament: tournamentId,
    });

    const group = await Group.findById(created._id)
      .populate('tournament', 'name season status')
      .populate('createdBy', 'name username');

    res.status(201).json({ group });
  }
);

router.get('/', async (req: AuthRequest, res: Response) => {
  const groups = await Group.find({ members: req.user!.id })
    .populate('tournament', 'name season status')
    .populate('createdBy', 'name username');
  res.json({ groups });
});

router.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const group = await Group.findById(req.params['id'])
    .populate('tournament', 'name season status totalMatches startDate endDate')
    .populate('members', 'name username')
    .populate('createdBy', 'name username');

  if (!group) { res.status(404).json({ message: 'Group not found' }); return; }

  const isMember = group.members.some((m: any) => m._id.toString() === req.user!.id);
  if (!isMember) { res.status(403).json({ message: 'Not a member of this group' }); return; }

  res.json({ group });
});

router.post('/join', async (req: AuthRequest, res: Response): Promise<void> => {
  const { inviteCode } = req.body as { inviteCode: string };
  if (!inviteCode) { res.status(400).json({ message: 'Invite code required' }); return; }

  const group = await Group.findOne({ inviteCode: inviteCode.toUpperCase() });
  if (!group) { res.status(404).json({ message: 'Invalid invite code' }); return; }

  const alreadyMember = group.members.some((m) => m.toString() === req.user!.id);
  if (alreadyMember) { res.status(409).json({ message: 'Already a member' }); return; }

  group.members.push(req.user!.id as any);
  await group.save();

  const populated = await Group.findById(group._id)
    .populate('tournament', 'name season status')
    .populate('createdBy', 'name username');

  res.json({ group: populated });
});

router.delete('/:id/leave', async (req: AuthRequest, res: Response): Promise<void> => {
  const group = await Group.findById(req.params['id']);
  if (!group) { res.status(404).json({ message: 'Group not found' }); return; }

  if (group.createdBy.toString() === req.user!.id) {
    res.status(400).json({ message: 'Group creator cannot leave. Delete the group instead.' });
    return;
  }

  group.members = group.members.filter((m) => m.toString() !== req.user!.id);
  await group.save();
  res.json({ message: 'Left group successfully' });
});

export default router;
