import { Router, Response } from 'express';
import { nanoid } from 'nanoid';
import { body, validationResult } from 'express-validator';
import { Group, Tournament, Notification, User } from '../models/index';
import StrategyCard from '../models/StrategyCard';
import { notifyUsers } from '../socket';
import { protect } from '../middleware/auth';
import { AuthRequest } from '../types/index';

const router = Router();

router.use(protect);

// ── create group ─────────────────────────────────────────────────────────────

router.post(
  '/',
  [
    body('name').trim().notEmpty().withMessage('Group name is required'),
    body('tournamentId').notEmpty().withMessage('Tournament is required'),
    body('maxMembers').optional().isInt({ min: 2, max: 100 }).withMessage('maxMembers must be between 2 and 100'),
    body('visibility').optional().isIn(['public', 'private']),
    body('enabledCategories').optional().isArray({ min: 1 }).withMessage('At least one category must be enabled'),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) { res.status(400).json({ errors: errors.array() }); return; }

    const { name, description, tournamentId, visibility, maxMembers, enabledCategories, enableMatchPredictions } =
      req.body as {
        name: string; description?: string; tournamentId: string;
        visibility?: 'public' | 'private'; maxMembers?: number;
        enabledCategories?: string[]; enableMatchPredictions?: boolean;
      };

    const inviteCode = nanoid(8).toUpperCase();

    const created = await Group.create({
      name,
      description: description || '',
      createdBy: req.user!.id,
      inviteCode,
      members: [req.user!.id],
      tournament: tournamentId,
      visibility: visibility || 'private',
      maxMembers: maxMembers || 20,
      enabledCategories: enabledCategories || [],
      enableMatchPredictions: enableMatchPredictions ?? false,
    });

    const group = await Group.findById(created._id)
      .populate('tournament', 'name season status')
      .populate('createdBy', 'name username');

    res.status(201).json({ group });
  }
);

// ── list my groups ────────────────────────────────────────────────────────────

router.get('/', async (req: AuthRequest, res: Response) => {
  const groups = await Group.find({ members: req.user!.id })
    .populate('tournament', 'name season status')
    .populate('createdBy', 'name username');
  res.json({ groups });
});

// ── discover public groups — must be BEFORE /:id ──────────────────────────────

router.get('/public', async (req: AuthRequest, res: Response) => {
  const groups = await Group.find({
    visibility: 'public',
    members: { $ne: req.user!.id },
  })
    .populate('tournament', 'name season status')
    .populate('createdBy', 'name username')
    .sort({ createdAt: -1 })
    .limit(50);
  res.json({ groups });
});

// ── join by invite code — must be BEFORE /:id ────────────────────────────────

router.post('/join', async (req: AuthRequest, res: Response): Promise<void> => {
  const { inviteCode } = req.body as { inviteCode: string };
  if (!inviteCode) { res.status(400).json({ message: 'Invite code required' }); return; }

  const group = await Group.findOne({ inviteCode: inviteCode.toUpperCase() });
  if (!group) { res.status(404).json({ message: 'Invalid invite code' }); return; }

  const alreadyMember = group.members.some((m) => m.toString() === req.user!.id);
  if (alreadyMember) { res.status(409).json({ message: 'Already a member' }); return; }

  if (group.members.length >= group.maxMembers) {
    res.status(400).json({ message: 'This group is full' }); return;
  }

  const tournament = await Tournament.findById(group.tournament);
  if (tournament && tournament.status !== 'upcoming') {
    res.status(400).json({ message: 'Cannot join a group after the tournament has started' }); return;
  }

  group.members.push(req.user!.id as any);
  await group.save();

  const populated = await Group.findById(group._id)
    .populate('tournament', 'name season status')
    .populate('createdBy', 'name username');

  res.json({ group: populated });
});

// ── get group detail ──────────────────────────────────────────────────────────

router.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const group = await Group.findById(req.params['id'])
    .populate('tournament', 'name season status totalMatches startDate endDate')
    .populate('members', 'name username')
    .populate('createdBy', 'name username')
    .populate('enabledCategories', 'name type selectionCount scoringType description order');

  if (!group) { res.status(404).json({ message: 'Group not found' }); return; }

  const isMember = group.members.some((m: any) => m._id.toString() === req.user!.id);
  if (!isMember) { res.status(403).json({ message: 'Not a member of this group' }); return; }

  res.json({ group });
});

// ── update group settings (admin only, tournament must be upcoming) ───────────

router.put('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const group = await Group.findById(req.params['id']).populate('tournament');
  if (!group) { res.status(404).json({ message: 'Group not found' }); return; }

  if (group.createdBy.toString() !== req.user!.id) {
    res.status(403).json({ message: 'Only the group admin can edit settings' }); return;
  }

  const tournament = group.tournament as any;

  const { name, description, visibility, maxMembers, enabledCategories, enableMatchPredictions } =
    req.body as {
      name?: string; description?: string; visibility?: 'public' | 'private';
      maxMembers?: number; enabledCategories?: string[]; enableMatchPredictions?: boolean;
    };

  // enableMatchPredictions can be toggled at any time; all other settings require upcoming tournament
  const hasGeneralChanges = name !== undefined || description !== undefined ||
    visibility !== undefined || maxMembers !== undefined || enabledCategories !== undefined;
  if (hasGeneralChanges && tournament?.status !== 'upcoming') {
    res.status(400).json({ message: 'Group settings can only be changed before the tournament starts' }); return;
  }

  if (enabledCategories !== undefined && enabledCategories.length === 0) {
    res.status(400).json({ message: 'At least one category must be enabled' }); return;
  }
  if (maxMembers !== undefined && (maxMembers < 2 || maxMembers > 100)) {
    res.status(400).json({ message: 'maxMembers must be between 2 and 100' }); return;
  }
  if (maxMembers !== undefined && maxMembers < group.members.length) {
    res.status(400).json({ message: `Cannot set max below current member count (${group.members.length})` }); return;
  }

  // Detect category change before mutating the document
  const categoriesChanged =
    enabledCategories !== undefined &&
    (() => {
      const oldSet = new Set(group.enabledCategories.map((id) => id.toString()));
      const newSet = new Set(enabledCategories);
      return oldSet.size !== newSet.size || [...newSet].some((id) => !oldSet.has(id));
    })();

  if (name !== undefined) group.name = name.trim();
  if (description !== undefined) group.description = description;
  if (visibility !== undefined) group.visibility = visibility;
  if (maxMembers !== undefined) group.maxMembers = maxMembers;
  if (enabledCategories !== undefined) group.enabledCategories = enabledCategories as any;
  if (enableMatchPredictions !== undefined) group.enableMatchPredictions = enableMatchPredictions;

  await group.save();

  // Notify all members (except admin) when categories change
  if (categoriesChanged) {
    const memberIds = group.members
      .map((m) => m.toString())
      .filter((id) => id !== req.user!.id);
    if (memberIds.length > 0) {
      const notifMessage = `The prediction categories in "${group.name}" have been updated by the admin. Please review and update your predictions.`;
      const createdNotifs = await Notification.insertMany(
        memberIds.map((userId) => ({
          user: userId,
          group: group._id,
          message: notifMessage,
          type: 'categories_updated',
        }))
      );
      // Push real-time notifications to online members
      createdNotifs.forEach((notif, i) => {
        notifyUsers([memberIds[i]], 'notification', {
          _id: notif._id.toString(),
          group: { _id: group._id.toString(), name: group.name },
          message: notifMessage,
          type: 'categories_updated',
          read: false,
          createdAt: new Date().toISOString(),
        });
      });
    }
  }

  const updated = await Group.findById(group._id)
    .populate('tournament', 'name season status totalMatches startDate endDate')
    .populate('members', 'name username')
    .populate('createdBy', 'name username')
    .populate('enabledCategories', 'name type selectionCount scoringType description order');

  res.json({ group: updated });
});

// ── add member by username (group creator only) ───────────────────────────────

router.post('/:id/members', async (req: AuthRequest, res: Response): Promise<void> => {
  const group = await Group.findById(req.params['id']);
  if (!group) { res.status(404).json({ message: 'Group not found' }); return; }

  if (group.createdBy.toString() !== req.user!.id) {
    res.status(403).json({ message: 'Only the group admin can add members' }); return;
  }

  const tournament = await Tournament.findById(group.tournament);
  if (tournament && tournament.status !== 'upcoming') {
    res.status(400).json({ message: 'Cannot add members after the tournament has started' }); return;
  }

  const { username } = req.body as { username: string };
  if (!username?.trim()) { res.status(400).json({ message: 'Username required' }); return; }

  const userToAdd = await User.findOne({ username: username.trim().toLowerCase() });
  if (!userToAdd) { res.status(404).json({ message: `No user found with username @${username.trim()}` }); return; }

  const alreadyMember = group.members.some((m) => m.toString() === userToAdd._id.toString());
  if (alreadyMember) { res.status(409).json({ message: 'User is already a member of this group' }); return; }

  if (group.members.length >= group.maxMembers) {
    res.status(400).json({ message: 'This group is full' }); return;
  }

  group.members.push(userToAdd._id as any);
  await group.save();

  const updated = await Group.findById(group._id)
    .populate('tournament', 'name season status totalMatches startDate endDate')
    .populate('members', 'name username')
    .populate('createdBy', 'name username')
    .populate('enabledCategories', 'name type selectionCount scoringType description order');

  res.json({ group: updated });
});

// ── join public group by ID ───────────────────────────────────────────────────

router.post('/:id/join', async (req: AuthRequest, res: Response): Promise<void> => {
  const group = await Group.findById(req.params['id']);
  if (!group) { res.status(404).json({ message: 'Group not found' }); return; }

  if (group.visibility !== 'public') {
    res.status(403).json({ message: 'This group is private. Use an invite code to join.' }); return;
  }

  const alreadyMember = group.members.some((m) => m.toString() === req.user!.id);
  if (alreadyMember) { res.status(409).json({ message: 'Already a member' }); return; }

  if (group.members.length >= group.maxMembers) {
    res.status(400).json({ message: 'This group is full' }); return;
  }

  const tournament = await Tournament.findById(group.tournament);
  if (tournament && tournament.status !== 'upcoming') {
    res.status(400).json({ message: 'Cannot join a group after the tournament has started' }); return;
  }

  group.members.push(req.user!.id as any);
  await group.save();

  const populated = await Group.findById(group._id)
    .populate('tournament', 'name season status')
    .populate('createdBy', 'name username');

  res.json({ group: populated });
});

// ── leave group ───────────────────────────────────────────────────────────────

router.delete('/:id/leave', async (req: AuthRequest, res: Response): Promise<void> => {
  const group = await Group.findById(req.params['id']).populate('tournament');
  if (!group) { res.status(404).json({ message: 'Group not found' }); return; }

  if (group.createdBy.toString() === req.user!.id) {
    res.status(400).json({ message: 'Group creator cannot leave. Delete the group instead.' }); return;
  }

  const tournament = group.tournament as any;
  if (tournament?.status === 'live' || tournament?.status === 'completed') {
    res.status(400).json({ message: 'You cannot leave a group once the tournament has started' }); return;
  }

  group.members = group.members.filter((m) => m.toString() !== req.user!.id);
  await group.save();
  res.json({ message: 'Left group successfully' });
});

// ── Member cards summary (visible to all group members) ───────────────────────

router.get('/:id/member-cards', async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params as { id: string };
  const { tournamentId } = req.query as { tournamentId?: string };
  if (!tournamentId) { res.status(400).json({ message: 'tournamentId required' }); return; }

  const group = await Group.findById(id)
    .populate<{ members: { _id: { toString(): string }; name: string; username: string }[] }>(
      'members', 'name username'
    );
  if (!group) { res.status(404).json({ message: 'Group not found' }); return; }

  const isMember = group.members.some((m) => m._id.toString() === req.user!.id);
  if (!isMember) { res.status(403).json({ message: 'Not a member of this group' }); return; }

  const allCards = await StrategyCard.find({ tournament: tournamentId, group: id }).lean();
  const cardMap = new Map<string, typeof allCards[0]['cards']>();
  for (const sc of allCards) cardMap.set(sc.user.toString(), sc.cards);

  const members = group.members.map((m) => ({
    _id: m._id,
    name: m.name,
    username: m.username,
    cards: cardMap.get(m._id.toString()) ?? [],
  }));

  res.json({ members });
});

export default router;
