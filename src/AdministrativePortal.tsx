import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import {
  createAdminUser,
  createProviderProfile,
  getCurrentAdmin,
  getAdminVideos,
  getApprovedVideos,
  subscribeToCreatorVideos,
  submitAdminVideo,
  type AdminUser,
  type AdminVideo,
} from './adminStore';
import { supabase } from './supabaseClient';

export type AdminPortalView = 'player' | 'rules' | 'signup' | 'profile' | 'library';

type AdministrativePortalProps = {
  view?: AdminPortalView;
  adminUser?: AdminUser | null;
  onNavigate?: (view: AdminPortalView) => void;
  onAdminCreated?: (user: AdminUser) => void;
  onPlayVideo?: (video: AdminVideo) => void;
  user?: any;
  onClose?: () => void;
  onRequireLogin?: () => void;
};

const uploadLimitBytes = 250 * 1024 * 1024;

function formatFileSize(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(value),
  );
}

export default function AdministrativePortal({
  view = 'rules',
  adminUser = null,
  onNavigate = () => {},
  onAdminCreated = () => {},
  onPlayVideo = () => {},
}: AdministrativePortalProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [channelName, setChannelName] = useState('');
  const [region, setRegion] = useState('');
  const [avatarPreview, setAvatarPreview] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [rulesAccepted, setRulesAccepted] = useState(false);
  const [, setIsLoginMode] = useState(false);
  const [videoTitle, setVideoTitle] = useState('');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videos, setVideos] = useState<AdminVideo[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [, setRefreshVersion] = useState(0);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (view !== 'profile' && view !== 'library') return undefined;

    let isCancelled = false;

    const loadVideos = async () => {
      try {
        const savedVideos = view === 'library'
          ? await getApprovedVideos()
          : adminUser
            ? await getAdminVideos(adminUser.email)
            : [];
        if (!isCancelled) {
          setVideos(savedVideos);
          setErrorMessage('');
        }
      } catch (error) {
        if (!isCancelled) {
          setErrorMessage(error instanceof Error ? error.message : 'Videos could not be loaded.');
        }
      }
    };

    void loadVideos();
    const unsubscribe = subscribeToCreatorVideos(() => void loadVideos());
    const refreshTimer = window.setInterval(() => void loadVideos(), 15000);
    return () => {
      isCancelled = true;
      unsubscribe();
      window.clearInterval(refreshTimer);
    };
  }, [adminUser, view]);

  const handleAvatarChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setErrorMessage('Choose an image file for your profile photo.');
      event.currentTarget.value = '';
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setErrorMessage('Profile photos must be 2 MB or smaller.');
      event.currentTarget.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setAvatarPreview(reader.result);
        setAvatarFile(file);
        setErrorMessage('');
      }
    };
    reader.onerror = () => setErrorMessage('The profile photo could not be read.');
    reader.readAsDataURL(file);
  };

  const handleSignup = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage('');
    if (!avatarPreview || !avatarFile) {
      setErrorMessage('Please add a profile photo to continue.');
      return;
    }
    if (!rulesAccepted) {
      setErrorMessage('Please confirm that you agree to follow the content rules.');
      return;
    }

    setIsSubmitting(true);
    try {
      const user = await createAdminUser({
        name: name.trim(),
        email: email.trim(),
        channelName: channelName.trim(),
        region: region.trim(),
        avatarFile,
        password,
      });
      setPassword('');
      setSuccessMessage('Successful! You are now logged in as an administrative user.');
      onAdminCreated(user);
    } catch (error) {
      if (error instanceof Error && error.message === 'CONFIRM_EMAIL') {
        setIsLoginMode(true);
        setSuccessMessage('Check your email to confirm your account, then sign in.');
      } else {
        setErrorMessage(error instanceof Error ? error.message : 'Account could not be created.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage('');
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw error;
      if (!data.user) throw new Error('Email or password not recognized');

      const existingProfile = await getCurrentAdmin(data.user.email ?? email.trim());
      if (existingProfile) {
        setSuccessMessage('Successful! Welcome back.');
        onAdminCreated(existingProfile);
        return;
      }

      if (!avatarFile) {
        setErrorMessage('Profile photo required to complete profile setup.');
        return;
      }
      const user = await createProviderProfile({
        name: name.trim() || email.split('@')[0],
        email: email.trim(),
        channelName: channelName.trim() || name.trim() || email.split('@')[0],
        region: region.trim(),
        avatarFile,
      });
      setSuccessMessage('Successful! Welcome back.');
      onAdminCreated(user);
    } catch {
      setErrorMessage('Email or password not recognized.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVideoFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0] ?? null;
    setVideoFile(file);
    setErrorMessage('');
    if (file && !file.type.startsWith('video/')) {
      setErrorMessage('Choose a video file to upload.');
      setVideoFile(null);
      event.currentTarget.value = '';
    } else if (file && file.size > uploadLimitBytes) {
      setErrorMessage('Videos must be 250 MB or smaller.');
      setVideoFile(null);
      event.currentTarget.value = '';
    }
  };

  const handleVideoUpload = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!adminUser || !videoFile) {
      setErrorMessage('Add a video file before submitting.');
      return;
    }

    const form = event.currentTarget;
    setIsSubmitting(true);
    setErrorMessage('');
    try {
      await submitAdminVideo({ title: videoTitle.trim(), ownerEmail: adminUser.email }, videoFile);
      setVideoTitle('');
      setVideoFile(null);
      form.reset();
      setRefreshVersion((version) => version + 1);
      setSuccessMessage('Your video will be approved in 24 hours');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'The video could not be uploaded.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{
      backgroundColor: '#0a0a0c',
      color: '#fff',
      minHeight: '100vh',
      width: '100vw',
      margin: 0,
      padding: '20px 16px',
      boxSizing: 'border-box',
      fontFamily: 'sans-serif',
      overflowY: 'auto'
    }}>
      {/* Header Navigation */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '32px',
        borderBottom: '1px solid #222',
        paddingBottom: '12px'
      }}>
        <button
          type="button"
          onClick={() => onNavigate('player')}
          style={{
            background: 'none',
            border: 'none',
            color: '#fff',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <span style={{ background: '#e50914', color: '#fff', padding: '2px 8px', borderRadius: '4px' }}>R</span>
          REVELA
        </button>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => onNavigate('rules')}
            style={{ background: 'none', border: 'none', color: '#aaa', fontSize: '13px', cursor: 'pointer' }}
          >
            Guidelines
          </button>
          <button
            type="button"
            onClick={() => onNavigate('library')}
            style={{ background: 'none', border: 'none', color: '#aaa', fontSize: '13px', cursor: 'pointer' }}
          >
            Live
          </button>
          <button
            type="button"
            onClick={() => onNavigate('player')}
            style={{
              background: '#e50914',
              color: '#fff',
              border: 'none',
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Back
          </button>
        </div>
      </div>

      {/* Login View */}
      {view === 'rules' && (
        <div style={{ maxWidth: '400px', margin: '40px auto', background: '#141416', padding: '28px', borderRadius: '16px', border: '1px solid #2a2a2e' }}>
          <div style={{ fontSize: '11px', color: '#e50914', fontWeight: 'bold', marginBottom: '8px', letterSpacing: '1px' }}>CONTENT PROVIDER LOGIN</div>
          <h2 style={{ margin: '0 0 8px 0', fontSize: '22px', fontWeight: 'bold' }}>Sign in to your account</h2>
          <p style={{ margin: '0 0 24px 0', fontSize: '13px', color: '#8e8e93' }}>Enter your email and password to log in.</p>

          <form onSubmit={(e) => void handleLogin(e)} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#aaa', marginBottom: '6px' }}>Email address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: '#1c1c1e',
                  border: '1px solid #333',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
                placeholder="name@example.com"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#aaa', marginBottom: '6px' }}>Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: '#1c1c1e',
                  border: '1px solid #333',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                width: '100%',
                padding: '12px',
                background: '#e50914',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 'bold',
                cursor: 'pointer',
                marginTop: '8px'
              }}
            >
              {isSubmitting ? 'Logging in…' : 'Log in →'}
            </button>
          </form>

          <p style={{ marginTop: '20px', textAlign: 'center', fontSize: '13px', color: '#8e8e93' }}>
            Don't have an account?{' '}
            <button
              type="button"
              onClick={() => onNavigate('signup')}
              style={{ background: 'none', border: 'none', color: '#e50914', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' }}
            >
              Sign up
            </button>
          </p>
        </div>
      )}

      {/* Signup View */}
      {view === 'signup' && (
        <div style={{ maxWidth: '440px', margin: '20px auto', background: '#141416', padding: '28px', borderRadius: '16px', border: '1px solid #2a2a2e' }}>
          <button type="button" onClick={() => onNavigate('rules')} style={{ background: 'none', border: 'none', color: '#8e8e93', cursor: 'pointer', marginBottom: '16px', fontSize: '13px' }}>
            ← Back to Login
          </button>
          <div style={{ fontSize: '11px', color: '#e50914', fontWeight: 'bold', marginBottom: '8px', letterSpacing: '1px' }}>CONTENT PROVIDER SIGN UP</div>
          <h2 style={{ margin: '0 0 8px 0', fontSize: '22px', fontWeight: 'bold' }}>Create your account</h2>
          <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: '#8e8e93' }}>Set up your provider profile and database record.</p>

          <form onSubmit={(e) => void handleSignup(e)} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: '#1c1c1e', padding: '12px', borderRadius: '12px', border: '1px solid #333' }}>
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  background: '#2c2c2e',
                  border: '2px dashed #555',
                  color: '#fff',
                  cursor: 'pointer',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                {avatarPreview ? <img src={avatarPreview} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '＋'}
              </button>
              <div>
                <strong style={{ fontSize: '13px', display: 'block' }}>Profile photo</strong>
                <span style={{ fontSize: '11px', color: '#8e8e93' }}>Max 2MB image</span>
                <br />
                <button type="button" onClick={() => avatarInputRef.current?.click()} style={{ background: 'none', border: 'none', color: '#e50914', fontSize: '12px', cursor: 'pointer', padding: 0, marginTop: '4px' }}>
                  Upload photo
                </button>
              </div>
              <input ref={avatarInputRef} style={{ display: 'none' }} type="file" accept="image/*" onChange={handleAvatarChange} />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#aaa', marginBottom: '4px' }}>Full name</label>
              <input required value={name} onChange={(e) => setName(e.target.value)} style={{ width: '100%', padding: '10px', background: '#1c1c1e', border: '1px solid #333', borderRadius: '8px', color: '#fff', boxSizing: 'border-box' }} placeholder="Your name" />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#aaa', marginBottom: '4px' }}>Email address</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: '100%', padding: '10px', background: '#1c1c1e', border: '1px solid #333', borderRadius: '8px', color: '#fff', boxSizing: 'border-box' }} placeholder="name@example.com" />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#aaa', marginBottom: '4px' }}>Password (min 8 chars)</label>
              <input type="password" minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} style={{ width: '100%', padding: '10px', background: '#1c1c1e', border: '1px solid #333', borderRadius: '8px', color: '#fff', boxSizing: 'border-box' }} placeholder="••••••••" />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#aaa', marginBottom: '4px' }}>Creator or channel name</label>
              <input required value={channelName} onChange={(e) => setChannelName(e.target.value)} style={{ width: '100%', padding: '10px', background: '#1c1c1e', border: '1px solid #333', borderRadius: '8px', color: '#fff', boxSizing: 'border-box' }} placeholder="Channel name" />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#aaa', marginBottom: '4px' }}>Location (Country or region)</label>
              <input required value={region} onChange={(e) => setRegion(e.target.value)} style={{ width: '100%', padding: '10px', background: '#1c1c1e', border: '1px solid #333', borderRadius: '8px', color: '#fff', boxSizing: 'border-box' }} placeholder="Your location" />
            </div>

            <label style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', fontSize: '12px', color: '#ccc', cursor: 'pointer' }}>
              <input type="checkbox" checked={rulesAccepted} onChange={(e) => setRulesAccepted(e.target.checked)} style={{ marginTop: '2px' }} />
              <span>I have rights to all content submitted and agree to follow content guidelines.</span>
            </label>

            <button type="submit" disabled={isSubmitting} style={{ width: '100%', padding: '12px', background: '#e50914', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}>
              {isSubmitting ? 'Creating account…' : 'Complete sign up →'}
            </button>
          </form>
        </div>
      )}

      {/* Profile Dashboard View */}
      {view === 'profile' && adminUser && (
        <div style={{ maxWidth: '600px', margin: '20px auto', background: '#141416', padding: '24px', borderRadius: '16px', border: '1px solid #2a2a2e' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <img src={adminUser.avatar} alt="" style={{ width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover' }} />
              <div>
                <h2 style={{ margin: '0 0 4px 0', fontSize: '18px' }}>{adminUser.name}</h2>
                <p style={{ margin: 0, fontSize: '12px', color: '#8e8e93' }}>{adminUser.email} · {adminUser.region}</p>
              </div>
            </div>
            <span style={{ background: '#e50914', color: '#fff', padding: '4px 10px', borderRadius: '20px', fontSize: '10px', fontWeight: 'bold' }}>ADMIN</span>
          </div>

          <div style={{ background: '#1c1c1e', padding: '16px', borderRadius: '12px', marginBottom: '20px' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '15px' }}>Upload a Video</h3>
            <form onSubmit={(e) => void handleVideoUpload(e)} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input required value={videoTitle} onChange={(e) => setVideoTitle(e.target.value)} placeholder="Video title" style={{ padding: '10px', background: '#141416', border: '1px solid #333', borderRadius: '8px', color: '#fff' }} />
              <input type="file" accept="video/*" required onChange={handleVideoFileChange} style={{ fontSize: '13px', color: '#aaa' }} />
              <button type="submit" disabled={isSubmitting} style={{ padding: '10px', background: '#e50914', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                {isSubmitting ? 'Uploading...' : 'Submit Video for Review'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Messages */}
      {errorMessage && <div style={{ background: 'rgba(229,9,20,0.2)', border: '1px solid #e50914', color: '#ff6b6b', padding: '12px', borderRadius: '8px', maxWidth: '400px', margin: '16px auto', textAlign: 'center', fontSize: '13px' }} role="alert">{errorMessage}</div>}
      {successMessage && (
        <div style={{ background: 'rgba(40,167,69,0.2)', border: '1px solid #28a745', color: '#51cf66', padding: '12px', borderRadius: '8px', maxWidth: '400px', margin: '16px auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }} role="status">
          <span>{successMessage}</span>
          <button type="button" onClick={() => setSuccessMessage('')} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '16px' }}>×</button>
        </div>
      )}
    </div>
  );
}