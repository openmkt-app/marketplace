'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AlertTriangle, AlertCircle, Info, X, Rss, ExternalLink, CheckCircle2 } from 'lucide-react';

type BannerType = 'warning' | 'error' | 'info';

export default function AdminDashboard() {
  const { user } = useAuth();

  // --- Banner ---
  const [activeBanner, setActiveBanner] = useState<{ message: string; type: BannerType } | null>(null);
  const [bannerMessage, setBannerMessage] = useState('');
  const [bannerType, setBannerType] = useState<BannerType>('warning');
  const [bannerSaving, setBannerSaving] = useState(false);

  // --- Push post ---
  const [postUrl, setPostUrl] = useState('');
  const [postNote, setPostNote] = useState('');
  const [pushStatus, setPushStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [pushMessage, setPushMessage] = useState('');

  // --- Feed stats ---
  const [feedStats, setFeedStats] = useState<{ count: number; updatedAt: string } | null>(null);
  const [feedSetupStatus, setFeedSetupStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [feedSetupMessage, setFeedSetupMessage] = useState('');

  // --- Admin key ---
  // Every write below is gated server-side by a shared secret. It is held only
  // here, in this browser session — never in the shipped bundle — and sent as a
  // bearer token. Set ADMIN_API_SECRET to the same value on the server.
  const [adminKey, setAdminKey] = useState('');

  useEffect(() => {
    loadBanner();
    loadFeedStats();
    setAdminKey(sessionStorage.getItem('admin-key') ?? '');
  }, []);

  const saveAdminKey = (key: string) => {
    setAdminKey(key);
    if (key) sessionStorage.setItem('admin-key', key);
    else sessionStorage.removeItem('admin-key');
  };

  const adminHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${adminKey}`,
  });

  // --- Banner handlers ---
  const loadBanner = async () => {
    try {
      const res = await fetch('/api/admin/banner');
      if (res.ok) {
        const data = await res.json();
        setActiveBanner(data.banner ?? null);
      }
    } catch {}
  };

  const saveBanner = async () => {
    if (!bannerMessage.trim() || !user) return;
    setBannerSaving(true);
    try {
      const res = await fetch('/api/admin/banner', {
        method: 'POST',
        headers: adminHeaders(),
        body: JSON.stringify({ message: bannerMessage, type: bannerType }),
      });
      if (res.ok) {
        setActiveBanner({ message: bannerMessage.trim(), type: bannerType });
        setBannerMessage('');
      }
    } catch {}
    setBannerSaving(false);
  };

  const clearBanner = async () => {
    if (!user) return;
    try {
      await fetch('/api/admin/banner', {
        method: 'DELETE',
        headers: adminHeaders(),
      });
      setActiveBanner(null);
    } catch {}
  };

  // --- Push post handlers ---
  const loadFeedStats = async () => {
    try {
      const res = await fetch('/api/feed/stats');
      if (res.ok) {
        const data = await res.json();
        setFeedStats(data);
      }
    } catch {}
  };

  const pushPost = async () => {
    if (!postUrl.trim() || !user) return;
    setPushStatus('loading');
    setPushMessage('');
    try {
      const res = await fetch('/api/feed/push-post', {
        method: 'POST',
        headers: adminHeaders(),
        body: JSON.stringify({ postUrl: postUrl.trim(), note: postNote.trim() || undefined }),
      });
      const data = await res.json();
      if (res.ok) {
        setPushStatus('success');
        setPushMessage(`Added to feed: ${data.postUri}`);
        setPostUrl('');
        setPostNote('');
        loadFeedStats();
      } else {
        setPushStatus('error');
        setPushMessage(data.error ?? 'Failed to push post');
      }
    } catch (e) {
      setPushStatus('error');
      setPushMessage('Network error');
    }
  };

  const setupFeed = async () => {
    if (!user) return;
    setFeedSetupStatus('loading');
    setFeedSetupMessage('');
    try {
      const res = await fetch('/api/feed/setup', {
        method: 'POST',
        headers: adminHeaders(),
      });
      const data = await res.json();
      if (res.ok) {
        setFeedSetupStatus('success');
        setFeedSetupMessage(data.message ?? 'Feed registered successfully');
      } else {
        setFeedSetupStatus('error');
        setFeedSetupMessage(data.error ?? 'Setup failed');
      }
    } catch {
      setFeedSetupStatus('error');
      setFeedSetupMessage('Network error');
    }
  };

  const bannerIcons = {
    warning: <AlertTriangle size={13} />,
    error: <AlertCircle size={13} />,
    info: <Info size={13} />,
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 mt-1 text-sm">Manage site-wide settings and the Bluesky feed</p>
      </div>

      {/* ── Admin key ────────────────────────────────── */}
      <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">
          Admin key
        </h2>
        <p className="text-sm text-slate-400 mb-4">
          Required for every action below. Matches <code className="text-slate-500">ADMIN_API_SECRET</code> on
          the server. Kept only in this browser session.
        </p>
        <div className="flex items-center gap-3">
          <input
            type="password"
            value={adminKey}
            onChange={e => saveAdminKey(e.target.value)}
            placeholder="Paste the admin key"
            autoComplete="off"
            className="flex-1 max-w-md px-3 py-2 rounded-lg text-sm border border-slate-200 focus:border-slate-400 focus:outline-none"
          />
          <span className={`text-xs font-medium ${adminKey ? 'text-emerald-600' : 'text-slate-400'}`}>
            {adminKey ? 'Key set' : 'No key'}
          </span>
        </div>
      </section>

      {/* ── Alert Banner ─────────────────────────────── */}
      <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">
          Site Alert Banner
        </h2>

        {activeBanner ? (
          <div className="mb-4 flex items-start gap-3 bg-slate-50 border border-slate-200 rounded-xl p-4">
            <div className="flex-1">
              <p className="text-xs text-slate-500 mb-1 font-medium uppercase tracking-wide">
                Active — {activeBanner.type}
              </p>
              <p className="text-sm text-slate-800">{activeBanner.message}</p>
            </div>
            <button
              onClick={clearBanner}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors border border-red-200"
            >
              <X size={12} /> Clear
            </button>
          </div>
        ) : (
          <p className="text-sm text-slate-400 mb-4">No active banner.</p>
        )}

        <div className="flex gap-3 items-end flex-wrap">
          <div className="flex gap-2">
            {(['warning', 'error', 'info'] as BannerType[]).map(t => (
              <button
                key={t}
                onClick={() => setBannerType(t)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-colors capitalize ${
                  bannerType === t
                    ? 'bg-slate-800 text-white border-slate-800'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                }`}
              >
                {bannerIcons[t]} {t}
              </button>
            ))}
          </div>
          <input
            type="text"
            value={bannerMessage}
            onChange={e => setBannerMessage(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && saveBanner()}
            placeholder="e.g. Bluesky is experiencing issues — some listings may not load"
            className="flex-1 min-w-64 px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
          />
          <button
            onClick={saveBanner}
            disabled={!bannerMessage.trim() || bannerSaving}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {bannerSaving ? 'Saving…' : 'Set Banner'}
          </button>
        </div>
      </section>

      {/* ── Bluesky Feed ─────────────────────────────── */}
      <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
              <Rss size={14} /> Bluesky Feed
            </h2>
            {feedStats && (
              <p className="text-xs text-slate-400 mt-1">
                {feedStats.count} posts indexed · last updated{' '}
                {new Date(feedStats.updatedAt).toLocaleString()}
              </p>
            )}
          </div>
          <a
            href="https://bsky.app/profile/openmkt.app/feed/all"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-600 border border-sky-200 rounded-lg transition-colors"
          >
            <ExternalLink size={12} /> View feed on Bluesky
          </a>
        </div>

        {/* Push a post */}
        <div className="space-y-3">
          <p className="text-sm text-slate-600">
            Push any Bluesky post into the Open Market feed — paste a post URL or <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">at://</code> URI.
          </p>
          <div className="flex gap-3 flex-wrap items-end">
            <input
              type="text"
              value={postUrl}
              onChange={e => { setPostUrl(e.target.value); setPushStatus('idle'); }}
              onKeyDown={e => e.key === 'Enter' && pushPost()}
              placeholder="https://bsky.app/profile/alice.bsky.social/post/3abc…"
              className="flex-1 min-w-64 px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-300 font-mono"
            />
            <input
              type="text"
              value={postNote}
              onChange={e => setPostNote(e.target.value)}
              placeholder="Optional note (not shown publicly)"
              className="w-60 px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
            />
            <button
              onClick={pushPost}
              disabled={!postUrl.trim() || pushStatus === 'loading'}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {pushStatus === 'loading' ? 'Pushing…' : 'Push to Feed'}
            </button>
          </div>

          {pushStatus !== 'idle' && (
            <div className={`flex items-start gap-2 text-sm rounded-xl px-4 py-3 ${
              pushStatus === 'success'
                ? 'bg-green-50 text-green-700 border border-green-200'
                : pushStatus === 'error'
                ? 'bg-red-50 text-red-600 border border-red-200'
                : 'bg-slate-50 text-slate-500'
            }`}>
              {pushStatus === 'success' && <CheckCircle2 size={15} className="mt-0.5 flex-shrink-0" />}
              <span className="break-all">{pushMessage}</span>
            </div>
          )}
        </div>

        {/* Register / re-register the feed generator */}
        <div className="mt-6 pt-5 border-t border-slate-100">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="text-sm font-medium text-slate-700">Feed Generator Registration</p>
              <p className="text-xs text-slate-400 mt-0.5">
                Run once after first deploy to register the feed in the AT Protocol. Safe to re-run.
              </p>
            </div>
            <button
              onClick={setupFeed}
              disabled={feedSetupStatus === 'loading'}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {feedSetupStatus === 'loading' ? 'Registering…' : 'Register Feed'}
            </button>
          </div>
          {feedSetupStatus !== 'idle' && (
            <p className={`text-xs mt-2 ${feedSetupStatus === 'success' ? 'text-green-600' : 'text-red-500'}`}>
              {feedSetupMessage}
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
