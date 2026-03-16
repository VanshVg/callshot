import { useState, useEffect } from 'react';
import type {FormEvent} from 'react';
import { Modal } from '../common/Modal';
import { Input } from '../common/Input';
import { Button } from '../common/Button';
import {
  useCreateGroupMutation,
  useGetTournamentsQuery,
  useGetCategoriesQuery,
} from '../../store/api';

interface Props {
  open: boolean;
  onClose: () => void;
}

export const CreateGroupModal = ({ open, onClose }: Props) => {
  const [form, setForm] = useState({
    name: '',
    description: '',
    tournamentId: '',
    visibility: 'private' as 'public' | 'private',
    maxMembers: 20,
    enableMatchPredictions: false,
  });
  const [errors, setErrors] = useState<{
    name?: string; tournamentId?: string; categories?: string; general?: string;
  }>({});
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());

  const { data: tournaments = [] } = useGetTournamentsQuery(undefined, { skip: !open });
  const { data: allCategories = [], isFetching: categoriesLoading } = useGetCategoriesQuery('cricket', { skip: !open });
  const [createGroup, { isLoading }] = useCreateGroupMutation();

  // Auto-select all categories when they load
  useEffect(() => {
    if (allCategories.length > 0) {
      setSelectedCategories(new Set(allCategories.map((c) => c._id)));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allCategories.length]);

  const toggleCategory = (id: string) => {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        if (next.size === 1) return prev;
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
    setErrors((e) => ({ ...e, categories: undefined }));
  };

  const validate = () => {
    const e: typeof errors = {};
    if (!form.name.trim()) e.name = 'Group name is required';
    if (!form.tournamentId) e.tournamentId = 'Please select a tournament';
    if (selectedCategories.size === 0)
      e.categories = 'Select at least one category';
    return e;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    try {
      await createGroup({
        name: form.name,
        description: form.description,
        tournamentId: form.tournamentId,
        visibility: form.visibility,
        maxMembers: form.maxMembers,
        enabledCategories: Array.from(selectedCategories),
        enableMatchPredictions: form.enableMatchPredictions,
      }).unwrap();
      // RTK invalidates MyGroups tag — Dashboard list auto-refreshes
      setForm({ name: '', description: '', tournamentId: '', visibility: 'private', maxMembers: 20, enableMatchPredictions: false });
      setSelectedCategories(new Set());
      onClose();
    } catch (err: unknown) {
      const msg = (err as { data?: { message?: string } })?.data?.message || 'Failed to create group';
      setErrors({ general: msg });
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

        {/* Tournament */}
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
                {t.name} — {t.season}
              </option>
            ))}
          </select>
          {errors.tournamentId && <p className="text-xs text-red-400">{errors.tournamentId}</p>}
        </div>

        {/* Visibility toggle */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-300">Visibility</label>
          <div className="grid grid-cols-2 gap-2">
            {(['private', 'public'] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setForm((f) => ({ ...f, visibility: v }))}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-colors cursor-pointer ${
                  form.visibility === v
                    ? 'border-[#FF6800] bg-[#FF6800]/10 text-[#FF6800]'
                    : 'border-[#2F2F2F] bg-[#1E1E1E] text-gray-400 hover:border-[#3A3A3A]'
                }`}
              >
                {v === 'private' ? (
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>
          <p className="text-gray-600 text-xs">
            {form.visibility === 'public'
              ? 'Anyone can find and join this group'
              : 'Only people with the invite code can join'}
          </p>
        </div>

        {/* Max members */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-300">
            Max Members <span className="text-gray-600 font-normal">({form.maxMembers})</span>
          </label>
          <input
            type="range"
            min={2}
            max={100}
            value={form.maxMembers}
            onChange={(e) => setForm((f) => ({ ...f, maxMembers: Number(e.target.value) }))}
            className="w-full accent-[#FF6800]"
          />
          <div className="flex justify-between text-xs text-gray-600">
            <span>2</span><span>100</span>
          </div>
        </div>

        {/* Category selection */}
        <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-300">
                Prediction Categories
                <span className="text-gray-600 font-normal ml-1.5">
                  ({selectedCategories.size}/{allCategories.length} selected)
                </span>
              </label>
              {allCategories.length > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    selectedCategories.size === allCategories.length
                      ? setSelectedCategories(new Set([allCategories[0]._id]))
                      : setSelectedCategories(new Set(allCategories.map((c) => c._id)))
                  }
                  className="text-xs text-[#FF6800] hover:text-[#ff8533] transition-colors cursor-pointer"
                >
                  {selectedCategories.size === allCategories.length ? 'Deselect all' : 'Select all'}
                </button>
              )}
            </div>

            {categoriesLoading ? (
              <div className="flex flex-col gap-1.5">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="h-9 bg-[#2A2A2A] rounded-lg animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-1.5 max-h-44 overflow-y-auto pr-1">
                {allCategories.map((cat) => {
                  const checked = selectedCategories.has(cat._id);
                  return (
                    <button
                      key={cat._id}
                      type="button"
                      onClick={() => toggleCategory(cat._id)}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg border text-left transition-colors cursor-pointer ${
                        checked
                          ? 'border-[#FF6800]/40 bg-[#FF6800]/5 text-gray-200'
                          : 'border-[#2F2F2F] bg-[#1E1E1E] text-gray-500 hover:border-[#3A3A3A]'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded flex-shrink-0 flex items-center justify-center border transition-colors ${
                        checked ? 'bg-[#FF6800] border-[#FF6800]' : 'border-[#3A3A3A]'
                      }`}>
                        {checked && (
                          <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <span className="text-sm truncate">{cat.name}</span>
                    </button>
                  );
                })}
              </div>
            )}
            {errors.categories && <p className="text-xs text-red-400">{errors.categories}</p>}
          </div>

        {/* Per-match predictions toggle */}
        <div className="flex items-center justify-between py-1">
          <div>
            <p className="text-sm font-medium text-gray-300">Match Day Predictions</p>
            <p className="text-gray-600 text-xs mt-0.5">Members predict each match's results for extra points</p>
          </div>
          <button
            type="button"
            onClick={() => setForm((f) => ({ ...f, enableMatchPredictions: !f.enableMatchPredictions }))}
            className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer flex-shrink-0 ${
              form.enableMatchPredictions ? 'bg-[#FF6800]' : 'bg-[#2A2A2A]'
            }`}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
              form.enableMatchPredictions ? 'translate-x-5' : 'translate-x-0'
            }`} />
          </button>
        </div>

        <div className="flex gap-3 mt-2">
          <Button type="button" variant="secondary" fullWidth onClick={onClose}>Cancel</Button>
          <Button type="submit" fullWidth loading={isLoading}>Create Group</Button>
        </div>
      </form>
    </Modal>
  );
};
