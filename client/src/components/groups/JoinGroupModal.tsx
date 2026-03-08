import { useState, FormEvent } from 'react';
import { Modal } from '../common/Modal';
import { Input } from '../common/Input';
import { Button } from '../common/Button';
import { useJoinGroupMutation } from '../../store/api';

interface Props {
  open: boolean;
  onClose: () => void;
}

export const JoinGroupModal = ({ open, onClose }: Props) => {
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');
  const [joinGroup, { isLoading }] = useJoinGroupMutation();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim()) { setError('Please enter an invite code'); return; }
    setError('');
    try {
      await joinGroup(inviteCode.trim().toUpperCase()).unwrap();
      // RTK invalidates MyGroups tag — Dashboard list auto-refreshes
      setInviteCode('');
      onClose();
    } catch (err: unknown) {
      const msg = (err as { data?: { message?: string } })?.data?.message || 'Invalid invite code';
      setError(msg);
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
          <Button type="button" variant="secondary" fullWidth onClick={onClose}>Cancel</Button>
          <Button type="submit" fullWidth loading={isLoading}>Join Group</Button>
        </div>
      </form>
    </Modal>
  );
};
