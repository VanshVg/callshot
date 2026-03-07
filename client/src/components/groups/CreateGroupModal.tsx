import { useState, FormEvent, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Input } from '../common/Input';
import { Button } from '../common/Button';
import { createGroup, fetchTournaments } from '../../services/groups';
import type { Group, Tournament } from '../../types/index';

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: (group: Group) => void;
}

export const CreateGroupModal = ({ open, onClose, onCreated }: Props) => {
  const [form, setForm] = useState({ name: '', description: '', tournamentId: '' });
  const [errors, setErrors] = useState<{ name?: string; tournamentId?: string; general?: string }>({});
  const [loading, setLoading] = useState(false);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);

  useEffect(() => {
    if (!open) return;
    fetchTournaments().then(setTournaments).catch(() => {});
  }, [open]);

  const validate = () => {
    const e: typeof errors = {};
    if (!form.name.trim()) e.name = 'Group name is required';
    if (!form.tournamentId) e.tournamentId = 'Please select a tournament';
    return e;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    setErrors({});
    try {
      const group = await createGroup(form);
      onCreated(group);
      setForm({ name: '', description: '', tournamentId: '' });
      onClose();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to create group';
      setErrors({ general: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Create a Group">
      {errors.general && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg px-3 py-2.5 mb-4">
          {errors.general}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Group Name"
          type="text"
          placeholder="e.g. Office Fantasy League"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          error={errors.name}
        />

        <Input
          label="Description (optional)"
          type="text"
          placeholder="A short description for your group"
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
        />

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-300">Tournament</label>
          <select
            value={form.tournamentId}
            onChange={(e) => setForm((f) => ({ ...f, tournamentId: e.target.value }))}
            className={`bg-[#1E1E1E] border rounded-lg px-3 py-2.5 text-sm outline-none transition-colors
              ${errors.tournamentId ? 'border-red-500' : 'border-[#2F2F2F] focus:border-[#FF6800]'}
              ${form.tournamentId ? 'text-white' : 'text-gray-600'}`}
          >
            <option value="" disabled>Select a tournament</option>
            {tournaments.map((t) => (
              <option key={t._id} value={t._id} className="text-white bg-[#1E1E1E]">
                {t.name}
              </option>
            ))}
          </select>
          {errors.tournamentId && <p className="text-xs text-red-400">{errors.tournamentId}</p>}
        </div>

        <div className="flex gap-3 mt-2">
          <Button type="button" variant="secondary" fullWidth onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" fullWidth loading={loading}>
            Create Group
          </Button>
        </div>
      </form>
    </Modal>
  );
};
