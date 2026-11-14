import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import {
  approveAdminVideo,
  createAdminUser,
  getAdminVideoFile,
  getAdminVideos,
  submitAdminVideo,
  type AdminUser,
  type AdminVideo,
} from './adminStore';

export type AdminPortalView = 'player' | 'rules' | 'signup' | 'profile' | 'review' | 'library';

type AdministrativePortalProps = {
  view: AdminPortalView;
  adminUser: AdminUser | null;
  onNavigate: (view: AdminPortalView) => void;
  onAdminCreated: (user: AdminUser) => void;
};

type VideoWithPreview = AdminVideo & { previewUrl: string | null };

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
  view,
  adminUser,
  onNavigate,
  onAdminCreated,
}: AdministrativePortalProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [channelName, setChannelName] = useState('');
  const [region, setRegion] = useState('');
  const [avatarPreview, setAvatarPreview] = useState('');
  const [rulesAccepted, setRulesAccepted] = useState(false);
  const [videoTitle, setVideoTitle] = useState('');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videos, setVideos] = useState<VideoWithPreview[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const activePreviewUrls = useRef<string[]>([]);

  useEffect(() => {
    if (view !== 'profile' && view !== 'review' && view !== 'library') return undefined;

    let isCancelled = false;

    const loadVideos = async () => {
      try {
        const savedVideos = await getAdminVideos();
        const videosWithPreviews = await Promise.all(
          savedVideos.map(async (video) => {
            const file = await getAdminVideoFile(video.id);
            if (!file) return { ...video, previewUrl: null };
            const previewUrl = URL.createObjectURL(file);
            return { ...video, previewUrl };
          }),
        );
        if (!isCancelled) {
          setVideos(videosWithPreviews);
          setErrorMessage('');
        } else {
          videosWithPreviews.forEach((video) => {
            if (video.previewUrl) URL.revokeObjectURL(video.previewUrl);
          });
        }
      } catch (error) {
        if (!isCancelled) {
          setErrorMessage(error instanceof Error ? error.message : 'Videos could not be loaded.');
        }
      }
    };

    void loadVideos();
    return () => {
      isCancelled = true;
    };
  }, [view, refreshVersion]);

  useEffect(() => {
    const previousUrls = activePreviewUrls.current;
    activePreviewUrls.current = videos.flatMap((video) => video.previewUrl ? [video.previewUrl] : []);
    return () => previousUrls.forEach((url) => URL.revokeObjectURL(url));
  }, [videos]);

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
        setErrorMessage('');
      }
    };
    reader.onerror = () => setErrorMessage('The profile photo could not be read. Please try another file.');
    reader.readAsDataURL(file);
  };

  const handleSignup = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage('');
    if (!avatarPreview) {
      setErrorMessage('Please add a profile photo to continue.');
      return;
    }
    if (!rulesAccepted) {
      setErrorMessage('Please confirm that you agree to follow the content rules.');
      return;
    }

    try {
      const user = createAdminUser({
        name: name.trim(),
        email: email.trim(),
        avatar: avatarPreview,
        channelName: channelName.trim(),
        region: region.trim(),
      });
      setPassword('');
      setSuccessMessage('Successful! You are now an administrative user of Revela.');
      onAdminCreated(user);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Your administrative account could not be created.');
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
      setErrorMessage('Videos must be 250 MB or smaller in this demo.');
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
      setSuccessMessage('You have successfully uploaded your video. In 24 hours, your video will be approved.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'The video could not be uploaded.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApproval = async (id: string) => {
    setErrorMessage('');
    try {
      await approveAdminVideo(id);
      setRefreshVersion((version) => version + 1);
      setSuccessMessage('Video approved. The content provider will see an approval notification.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'The video could not be approved.');
    }
  };

  const renderRules = () => (
    <section className="admin-rules-card">
      <div className="admin-section-kicker">CREATOR GUIDELINES</div>
      <h2>Keep Revela safe and original</h2>
      <p>Every submission is reviewed before it can appear on the platform.</p>
      <ul className="admin-rules-list">
        <li><span>01</span><div><strong>No nudity or explicit content.</strong><p>Keep uploads suitable for a broad audience.</p></div></li>
        <li><span>02</span><div><strong>Respect copyright.</strong><p>Do not upload someone else’s copyrighted music, soundtracks, or video footage without explicit permission. Original or AI-generated content is welcome.</p></div></li>
        <li><span>03</span><div><strong>Only upload content you’re authorized to share.</strong><p>You are responsible for the rights and permissions associated with every submission.</p></div></li>
      </ul>
    </section>
  );

  const renderVideoList = (reviewMode: boolean, libraryMode = false) => {
    const visibleVideos = libraryMode
      ? videos.filter((video) => video.status === 'approved')
      : reviewMode
        ? videos
        : videos.filter((video) => video.ownerEmail.toLowerCase() === adminUser?.email.toLowerCase());

    if (!visibleVideos.length) {
      const emptyMessage = libraryMode
        ? 'No approved creator videos are live yet.'
        : `No videos ${reviewMode ? 'have been submitted' : 'uploaded yet'}.`;
      return <div className="admin-empty-state">{emptyMessage}</div>;
    }

    return (
      <div className="admin-video-list">
        {visibleVideos.map((video) => (
          <article className="admin-video-card" key={video.id}>
            {video.previewUrl ? (
              <video className="admin-video-preview" controls preload="metadata" src={video.previewUrl}>
                Your browser does not support video playback.
              </video>
            ) : (
              <div className="admin-video-unavailable">Preview unavailable in this browser</div>
            )}
            <div className="admin-video-details">
              <div className="admin-video-heading">
                <div>
                  <h3>{video.title}</h3>
                  <p>{video.fileName} · {formatFileSize(video.size)}</p>
                  <p>{reviewMode ? `Provider: ${video.ownerEmail} · ` : ''}Submitted {formatDate(video.uploadedAt)}</p>
                </div>
                <span className={`admin-status admin-status-${video.status}`}>
                  {libraryMode ? 'Live on Revela' : video.status}
                </span>
              </div>
              {reviewMode && video.status === 'pending' && (
                <button className="admin-primary-button" type="button" onClick={() => void handleApproval(video.id)}>
                  Approve video
                </button>
              )}
              {!reviewMode && !libraryMode && video.status === 'approved' && (
                <p className="admin-approved-notice" role="status">Your video has been approved.</p>
              )}
            </div>
          </article>
        ))}
      </div>
    );
  };

  return (
    <main className="admin-portal" aria-labelledby="admin-page-title">
      <header className="admin-portal-header">
        <button className="admin-wordmark" type="button" onClick={() => onNavigate('player')} aria-label="Return to Revela">
          <span className="admin-wordmark-mark">R</span>
          <span>REVELA</span>
        </button>
        <nav className="admin-portal-nav" aria-label="Administrative navigation">
          <button type="button" onClick={() => onNavigate('rules')}>Guidelines</button>
          <button type="button" onClick={() => onNavigate('library')}>Live videos</button>
          {adminUser && <button type="button" onClick={() => onNavigate('profile')}>My profile</button>}
          <button type="button" onClick={() => onNavigate('review')}>Review queue <span className="admin-demo-label">DEMO</span></button>
          <button className="admin-return-button" type="button" onClick={() => onNavigate('player')}>Back to player</button>
        </nav>
      </header>

      <div className="admin-portal-content">
        {view === 'rules' && (
          <>
            <div className="admin-page-intro">
              <div className="admin-section-kicker">REVELA FOR CREATORS</div>
              <h1 id="admin-page-title">Share your work.<br /><span>Make it yours.</span></h1>
              <p>Become a content provider and bring your original stories to Revela.</p>
            </div>
            <div className="admin-rules-layout">
              {renderRules()}
              <aside className="admin-signup-card">
                <div className="admin-signup-icon" aria-hidden="true">✦</div>
                <div className="admin-section-kicker">READY TO CREATE?</div>
                <h2>Join Revela as a provider</h2>
                <p>Set up your creator profile and submit videos for review.</p>
                <button className="admin-primary-button" type="button" onClick={() => onNavigate('signup')}>
                  Sign up <span aria-hidden="true">→</span>
                </button>
                {adminUser && (
                  <button className="admin-secondary-button" type="button" onClick={() => onNavigate('profile')}>
                    Go to your profile
                  </button>
                )}
              </aside>
            </div>
          </>
        )}

        {view === 'signup' && (
          <section className="admin-form-page">
            <button type="button" className="admin-back-link" onClick={() => onNavigate('rules')}>← Back to guidelines</button>
            <div className="admin-form-heading">
              <div className="admin-section-kicker">CONTENT PROVIDER APPLICATION</div>
              <h1 id="admin-page-title">Create your creator profile</h1>
              <p>Tell us who you are and where your content comes from.</p>
            </div>
            <form className="admin-form-card" onSubmit={handleSignup}>
              <div className="admin-avatar-field">
                <button className="admin-avatar-picker" type="button" onClick={() => avatarInputRef.current?.click()} aria-label="Choose profile photo">
                  {avatarPreview ? <img src={avatarPreview} alt="Profile preview" /> : <span aria-hidden="true">＋</span>}
                </button>
                <div>
                  <strong>Profile photo</strong>
                  <p>Choose an image, up to 2 MB.</p>
                  <button className="admin-text-button" type="button" onClick={() => avatarInputRef.current?.click()}>Upload photo</button>
                </div>
                <input ref={avatarInputRef} className="admin-visually-hidden" type="file" accept="image/*" onChange={handleAvatarChange} />
              </div>

              <div className="admin-form-grid">
                <label className="admin-field">Full name
                  <input autoComplete="name" required value={name} onChange={(event) => setName(event.target.value)} />
                </label>
                <label className="admin-field">Email address
                  <input autoComplete="email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
                </label>
                <label className="admin-field">Password
                  <input autoComplete="new-password" type="password" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} />
                  <span className="admin-field-hint">At least 8 characters. Your password is not saved in this demo.</span>
                </label>
                <label className="admin-field">Creator or channel name
                  <input required value={channelName} onChange={(event) => setChannelName(event.target.value)} placeholder="How your channel appears on Revela" />
                </label>
                <label className="admin-field admin-field-full">Country or region
                  <input required value={region} onChange={(event) => setRegion(event.target.value)} placeholder="Where you create or publish content" />
                </label>
              </div>
              <label className="admin-checkbox-field">
                <input type="checkbox" checked={rulesAccepted} onChange={(event) => setRulesAccepted(event.target.checked)} />
                <span>I have the rights to all content I submit and agree to follow the content rules above.</span>
              </label>
              <button className="admin-primary-button admin-submit-button" type="submit">Create provider account <span aria-hidden="true">→</span></button>
            </form>
          </section>
        )}

        {view === 'profile' && (
          adminUser ? (
            <section className="admin-dashboard">
              <div className="admin-dashboard-heading">
                <div>
                  <div className="admin-section-kicker">YOUR CREATOR STUDIO</div>
                  <h1 id="admin-page-title">Welcome, {adminUser.name}</h1>
                  <p>Upload original work and track its review status.</p>
                </div>
                <span className="admin-account-badge">ACTIVE PROVIDER</span>
              </div>
              {videos.some((video) => video.ownerEmail.toLowerCase() === adminUser.email.toLowerCase() && video.status === 'approved') && (
                <div className="admin-notification" role="status"><span>✓</span> Your video has been approved.</div>
              )}
              <div className="admin-dashboard-grid">
                <div className="admin-dashboard-main">
                  <section className="admin-panel admin-profile-summary">
                    <div className="admin-profile-avatar">
                      <img src={adminUser.avatar} alt="" />
                    </div>
                    <div><h2>{adminUser.channelName}</h2><p>{adminUser.email} · {adminUser.region}</p></div>
                    <span className="admin-status admin-status-approved">Admin</span>
                  </section>
                  <section className="admin-panel">
                    <div className="admin-panel-heading">
                      <div><div className="admin-section-kicker">SUBMISSIONS</div><h2>Your videos</h2></div>
                      <span className="admin-count">{videos.filter((video) => video.ownerEmail.toLowerCase() === adminUser.email.toLowerCase()).length}</span>
                    </div>
                    {renderVideoList(false)}
                  </section>
                </div>
                <div className="admin-dashboard-side">
                  <section className="admin-panel admin-upload-panel">
                    <div className="admin-section-kicker">NEW SUBMISSION</div>
                    <h2>Upload a video</h2>
                    <p>Videos are submitted for review before becoming active on Revela.</p>
                    <form className="admin-upload-form" onSubmit={(event) => void handleVideoUpload(event)}>
                      <label className="admin-field">Video title
                        <input required value={videoTitle} onChange={(event) => setVideoTitle(event.target.value)} placeholder="Give your video a title" />
                      </label>
                      <label className="admin-upload-drop">
                        <span className="admin-upload-symbol" aria-hidden="true">↑</span>
                        <strong>{videoFile ? videoFile.name : 'Choose a video file'}</strong>
                        <span>{videoFile ? formatFileSize(videoFile.size) : 'MP4, WebM or MOV · up to 250 MB'}</span>
                        <input type="file" accept="video/*" required onChange={handleVideoFileChange} />
                      </label>
                      <button className="admin-primary-button" type="submit" disabled={isSubmitting}>
                        {isSubmitting ? 'Uploading…' : 'Submit for review'}
                      </button>
                    </form>
                  </section>
                  <section className="admin-panel admin-reminder-panel">
                    <div className="admin-section-kicker">BEFORE YOU UPLOAD</div>
                    <h2>Content rules</h2>
                    <ul>
                      <li>No nudity or explicit content.</li>
                      <li>Use only original or AI-generated audio and footage, or content you have explicit permission to use.</li>
                    </ul>
                    <button className="admin-text-button" type="button" onClick={() => onNavigate('rules')}>Read all guidelines →</button>
                  </section>
                </div>
              </div>
            </section>
          ) : (
            <div className="admin-empty-state admin-login-prompt">
              <h1 id="admin-page-title">Your creator profile</h1>
              <p>Sign up first to open your provider dashboard.</p>
              <button className="admin-primary-button" type="button" onClick={() => onNavigate('rules')}>View guidelines and sign up</button>
            </div>
          )
        )}

        {view === 'review' && (
          <section className="admin-review-page">
            <div className="admin-section-kicker">MOCK DATABASE · MASTER REVIEWER</div>
            <h1 id="admin-page-title">Video review queue</h1>
            <p className="admin-review-description">Preview provider submissions and approve videos to make them active. This review area is a local demo, not a secured administrator console.</p>
            {renderVideoList(true)}
          </section>
        )}

        {view === 'library' && (
          <section className="admin-review-page">
            <div className="admin-section-kicker">REVELA CREATOR VIDEOS</div>
            <h1 id="admin-page-title">Live videos</h1>
            <p className="admin-review-description">Approved submissions are now active on the platform.</p>
            {renderVideoList(false, true)}
          </section>
        )}

        {errorMessage && <div className="admin-message admin-error-message" role="alert">{errorMessage}</div>}
        {successMessage && (
          <div className="admin-message admin-success-message" role="status">
            <span>{successMessage}</span>
            <button type="button" onClick={() => setSuccessMessage('')} aria-label="Dismiss message">×</button>
          </div>
        )}
      </div>
    </main>
  );
}
