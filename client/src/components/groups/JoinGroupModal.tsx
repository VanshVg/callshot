import { useState, FormEvent } from 'react';
import { Modal } from '../common/Modal';
import { Input } from '../common/Input';
import { Button } from '../common/Button';
import { joinGroup } from '../../services/groups';
import type { Group } from '../../types/index';

interface Props {
  open: boolean;
  onClose: () => void;
  onJoined: (group: Group) => void;
}

export const JoinGroupModal = ({ open, onClose, onJoined }: Props) => {
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim()) { setError('Please enter an invite code'); return; }

    setLoading(true);
    setError('');
    try {
      const group = await joinGroup(inviteCode.trim().toUpperCase());
      onJoined(group);
      setInviteCode('');
      onClose();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Invalid invite code';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Join a Group">
      <p className="text-gray-500 text-sm mb-5">
        Ask your group admin for the 8-character invite code.
      </p>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg px-3 py-2.5 mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Invite Code"
          type="text"
          placeholder="e.g. AB3XY7KP"
          value={inviteCode}
          onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
          error={undefined}
        />

        <div className="flex gap-3 mt-2">
          <Button type="button" variant="secondary" fullWidth onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" fullWidth loading={loading}>
            Join Group
          </Button>
        </div>
      </form>
    </Modal>
  );
};
