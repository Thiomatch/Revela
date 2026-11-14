import { supabase } from './supabaseClient';

export type AdminUser = {
  id: string;
  email: string;
  avatar: string;
  name: string;
  channelName: string;
  region: string;
};

export type AdminVideo = {
  id: string;
  title: string;
  videoUrl: string;
  ownerEmail: string;
  uploadedAt: string | null;
  status: string;
};

const MEDIA_BUCKET = 'revela-media';
const ADMIN_USERS_TABLE = 'admin_users';
const CREATOR_VIDEOS_TABLE = 'creator_videos';

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function throwSupabaseError(error: { message: string } | null): void {
  if (error) throw new Error(error.message);
}

function mapAdminUser(record: Record<string, unknown>, email: string): AdminUser {
  return {
    id: String(record.id ?? ''),
    email: String(record.email ?? email),
    avatar: String(record.avatar_url ?? ''),
    name: String(record.name ?? record.full_name ?? ''),
    channelName: String(record.channel_name ?? record.name ?? record.full_name ?? ''),
    region: String(record.region ?? ''),
  };
}

function mapAdminVideo(record: Record<string, unknown>): AdminVideo {
  const uploadedAt = record.created_at ?? record.uploaded_at;
  return {
    id: String(record.id ?? record.video_url ?? ''),
    title: String(record.title ?? record.name ?? 'Creator video'),
    videoUrl: String(record.video_url ?? ''),
    ownerEmail: String(record.email ?? ''),
    uploadedAt: typeof uploadedAt === 'string' ? uploadedAt : null,
    status: String(record.status ?? 'pending').toLowerCase(),
  };
}

function makeStoragePath(folder: string, file: File): string {
  const extension = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin';
  return `${folder}/${crypto.randomUUID()}.${extension}`;
}

export async function getCurrentAdmin(email: string): Promise<AdminUser | null> {
  const { data, error } = await supabase
    .from(ADMIN_USERS_TABLE)
    .select('*')
    .eq('email', email)
    .maybeSingle();
  throwSupabaseError(error);
  if (!data) return null;

  const { data: authData } = await supabase.auth.getUser();
  const metadata = authData.user?.user_metadata ?? {};
  const user = mapAdminUser(data as Record<string, unknown>, email);
  return {
    ...user,
    name: user.name || String(metadata.full_name ?? ''),
    channelName: user.channelName || String(metadata.channel_name ?? metadata.full_name ?? ''),
    region: user.region || String(metadata.region ?? ''),
  };
}

export async function createAdminUser(details: {
  name: string;
  email: string;
  channelName: string;
  region: string;
  avatarFile: File;
  password: string;
}): Promise<AdminUser> {
  const email = details.email.trim().toLowerCase();
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password: details.password,
    options: {
      data: {
        full_name: details.name.trim(),
        channel_name: details.channelName.trim(),
        region: details.region.trim(),
      },
    },
  });
  throwSupabaseError(authError);
  if (!authData.user) throw new Error('Supabase did not return a user for this signup.');
  if (!authData.session) {
    throw new Error('CONFIRM_EMAIL');
  }

  return createProviderProfile(details, authData.user.id);
}

export async function createProviderProfile(details: {
  name: string;
  email: string;
  channelName: string;
  region: string;
  avatarFile: File;
}, userId?: string): Promise<AdminUser> {
  const email = details.email.trim().toLowerCase();
  if (!userId) {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    throwSupabaseError(authError);
    if (!authData.user) throw new Error('Sign in before completing your provider profile.');
    userId = authData.user.id;
  }

  let avatarPath: string | null = null;
  try {
    const extension = details.avatarFile.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'img';
    avatarPath = `${userId}/profiles/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage
      .from(MEDIA_BUCKET)
      .upload(avatarPath, details.avatarFile, {
        contentType: details.avatarFile.type,
        upsert: false,
      });
    throwSupabaseError(uploadError);
    const avatarUrl = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(avatarPath).data.publicUrl;

    const { error: profileError } = await supabase
      .from(ADMIN_USERS_TABLE)
      .insert({ email, avatar_url: avatarUrl });
    throwSupabaseError(profileError);
    return {
      id: userId,
      email,
      avatar: avatarUrl,
      name: details.name.trim(),
      channelName: details.channelName.trim(),
      region: details.region.trim(),
    };
  } catch (error) {
    if (avatarPath) {
      const { error: cleanupError } = await supabase.storage.from(MEDIA_BUCKET).remove([avatarPath]);
      if (cleanupError) {
        console.error('Unable to remove the profile photo after signup failed:', cleanupError.message);
      }
    }
    throw new Error(
      `Your Supabase account was created, but the provider profile could not be completed: ${getErrorMessage(error)}`,
    );
  }
}

export async function submitAdminVideo(
  details: Pick<AdminVideo, 'title' | 'ownerEmail'>,
  file: File,
): Promise<AdminVideo> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  throwSupabaseError(authError);
  if (!authData.user) throw new Error('Sign in to your provider account before uploading a video.');

  const path = `${authData.user.id}/${makeStoragePath('videos', file)}`;
  const { error: uploadError } = await supabase.storage
    .from(MEDIA_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  throwSupabaseError(uploadError);
  const videoUrl = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path).data.publicUrl;

  try {
    const { data, error } = await supabase
      .from(CREATOR_VIDEOS_TABLE)
      .insert({
        title: details.title.trim(),
        email: details.ownerEmail.trim().toLowerCase(),
        video_url: videoUrl,
        status: 'pending',
      })
      .select('*')
      .single();
    throwSupabaseError(error);
    return mapAdminVideo(data as Record<string, unknown>);
  } catch (error) {
    const { error: cleanupError } = await supabase.storage.from(MEDIA_BUCKET).remove([path]);
    if (cleanupError) {
      console.error('Unable to remove the video after its database insert failed:', cleanupError.message);
    }
    throw new Error(`The video was uploaded, but its database record could not be created: ${getErrorMessage(error)}`);
  }
}

export async function getAdminVideos(email: string): Promise<AdminVideo[]> {
  const { data, error } = await supabase
    .from(CREATOR_VIDEOS_TABLE)
    .select('*')
    .eq('email', email.trim().toLowerCase());
  throwSupabaseError(error);
  return (data ?? [])
    .map((record) => mapAdminVideo(record as Record<string, unknown>))
    .sort((first, second) => (second.uploadedAt ?? '').localeCompare(first.uploadedAt ?? ''));
}

export async function getApprovedVideos(): Promise<AdminVideo[]> {
  const { data, error } = await supabase
    .from(CREATOR_VIDEOS_TABLE)
    .select('*')
    .eq('status', 'approved');
  throwSupabaseError(error);
  return (data ?? [])
    .map((record) => mapAdminVideo(record as Record<string, unknown>))
    .filter((video) => video.videoUrl)
    .sort((first, second) => (second.uploadedAt ?? '').localeCompare(first.uploadedAt ?? ''));
}

export function subscribeToCreatorVideos(onChange: () => void): () => void {
  const channel = supabase
    .channel('creator-videos-status')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: CREATOR_VIDEOS_TABLE },
      onChange,
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}
