import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useJoinGroupMutation } from '../store/api';

export const Join = () => {
  const { inviteCode } = useParams<{ inviteCode: string }>();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [joinGroup] = useJoinGroupMutation();
  const [status, setStatus] = useState<'pending' | 'joining' | 'success' | 'error'>('pending');
  const [errorMsg, setErrorMsg] = useState('');

  // If not logged in, redirect to login with a redirect param
  useEffect(() => {
    if (!loading && !user) {
      navigate(`/login?redirect=/join/${inviteCode}`, { replace: true });
    }
  }, [loading, user, inviteCode, navigate]);

  // Once logged in, auto-join
  useEffect(() => {
    if (!user || !inviteCode || status !== 'pending') return;
    setStatus('joining');
    joinGroup(inviteCode)
      .unwrap()
      .then((group) => {
        setStatus('success');
        setTimeout(() => navigate(`/groups/${group._id}`, { replace: true }), 1200);
      })
      .catch((err: { data?: { message?: string } }) => {
        const msg = err?.data?.message || 'Failed to join group';
        // If already a member, just navigate there (handled by fetching the group separately isn't easy, so show message)
        setErrorMsg(msg);
        setStatus('error');
      });
  }, [user, inviteCode, status, joinGroup, navigate]);

  if (loading || (!user && status === 'pending')) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#FF6800] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-4">
      <div className="bg-[#1E1E1E] border border-[#2F2F2F] rounded-2xl p-8 w-full max-w-sm text-center flex flex-col items-center gap-5">
        {status === 'joining' && (
          <>
            <div className="w-12 h-12 border-2 border-[#FF6800] border-t-transparent rounded-full animate-spin" />
            <p className="text-white font-semibold">Joining group...</p>
            <p className="text-gray-500 text-sm">Code: <span className="font-mono text-[#FF6800]">{inviteCode}</span></p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-14 h-14 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center">
              <svg className="w-7 h-7 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="text-white font-semibold text-lg">Joined!</p>
              <p className="text-gray-500 text-sm mt-1">Taking you to the group...</p>
            </div>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
              <svg className="w-7 h-7 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <div>
              <p className="text-white font-semibold text-lg">Could not join</p>
              <p className="text-gray-400 text-sm mt-1">{errorMsg}</p>
            </div>
            <Link to="/dashboard" className="text-[#FF6800] text-sm hover:text-[#ff8533] no-underline transition-colors">
              Go to Dashboard
            </Link>
          </>
        )}
      </div>
    </div>
  );
};
