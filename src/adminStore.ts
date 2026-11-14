export type AdminUser = {
  id: string;
  name: string;
  email: string;
  avatar: string;
  channelName: string;
  region: string;
  role: 'admin';
  status: 'active';
  createdAt: string;
};

export type AdminVideo = {
  id: string;
  title: string;
  fileName: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
  status: 'pending' | 'approved';
  ownerEmail: string;
};

type AdminDatabase = {
  users: AdminUser[];
  currentUserId: string | null;
};

const ADMIN_DATABASE_KEY = 'revela_admin_database';
const ADMIN_VIDEOS_KEY = 'revela_admin_videos';
const MEDIA_DATABASE_NAME = 'revela_admin_media';
const MEDIA_STORE_NAME = 'videos';

function readStoredValue<T>(key: string, fallback: T): T {
  const value = localStorage.getItem(key);
  if (!value) return fallback;

  try {
    return JSON.parse(value) as T;
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`Saved Revela data in "${key}" could not be read: ${reason}`);
  }
}

function writeStoredValue<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`Revela data could not be saved in "${key}": ${reason}`);
  }
}

function createId(): string {
  return typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function getCurrentAdmin(): AdminUser | null {
  const database = readStoredValue<AdminDatabase>(ADMIN_DATABASE_KEY, {
    users: [],
    currentUserId: null,
  });
  return database.users.find((user) => user.id === database.currentUserId) ?? null;
}

export function createAdminUser(
  details: Omit<AdminUser, 'id' | 'role' | 'status' | 'createdAt'>,
): AdminUser {
  const database = readStoredValue<AdminDatabase>(ADMIN_DATABASE_KEY, {
    users: [],
    currentUserId: null,
  });
  const normalizedEmail = details.email.trim().toLowerCase();
  if (database.users.some((user) => user.email.toLowerCase() === normalizedEmail)) {
    throw new Error('An administrative account already exists for this email address.');
  }

  const user: AdminUser = {
    ...details,
    email: normalizedEmail,
    id: createId(),
    role: 'admin',
    status: 'active',
    createdAt: new Date().toISOString(),
  };
  writeStoredValue(ADMIN_DATABASE_KEY, {
    users: [...database.users, user],
    currentUserId: user.id,
  } satisfies AdminDatabase);
  return user;
}

function readVideos(): AdminVideo[] {
  return readStoredValue<AdminVideo[]>(ADMIN_VIDEOS_KEY, []);
}

function openMediaDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(MEDIA_DATABASE_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(MEDIA_STORE_NAME)) {
        request.result.createObjectStore(MEDIA_STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('The video database could not be opened.'));
    request.onblocked = () => reject(new Error('The video database is blocked by another open connection.'));
  });
}

function saveVideoFile(id: string, file: File): Promise<void> {
  return openMediaDatabase().then((database) => new Promise((resolve, reject) => {
    const transaction = database.transaction(MEDIA_STORE_NAME, 'readwrite');
    transaction.objectStore(MEDIA_STORE_NAME).put(file, id);
    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
    transaction.onerror = () => {
      database.close();
      reject(transaction.error ?? new Error('The video file could not be saved.'));
    };
    transaction.onabort = () => {
      database.close();
      reject(transaction.error ?? new Error('Saving the video file was cancelled.'));
    };
  }));
}

function deleteVideoFile(id: string): Promise<void> {
  return openMediaDatabase().then((database) => new Promise((resolve, reject) => {
    const transaction = database.transaction(MEDIA_STORE_NAME, 'readwrite');
    transaction.objectStore(MEDIA_STORE_NAME).delete(id);
    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
    transaction.onerror = () => {
      database.close();
      reject(transaction.error ?? new Error('The video file could not be removed.'));
    };
    transaction.onabort = () => {
      database.close();
      reject(transaction.error ?? new Error('Removing the video file was cancelled.'));
    };
  }));
}

export async function getAdminVideoFile(id: string): Promise<Blob | null> {
  const database = await openMediaDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(MEDIA_STORE_NAME, 'readonly');
    const request = transaction.objectStore(MEDIA_STORE_NAME).get(id) as IDBRequest<Blob | undefined>;
    request.onsuccess = () => resolve(request.result ?? null);
    transaction.onerror = () => reject(transaction.error ?? new Error('The video file could not be loaded.'));
    transaction.oncomplete = () => database.close();
    transaction.onabort = () => {
      database.close();
      reject(transaction.error ?? new Error('Loading the video file was cancelled.'));
    };
  });
}

export async function getAdminVideos(): Promise<AdminVideo[]> {
  return readVideos().sort((first, second) => second.uploadedAt.localeCompare(first.uploadedAt));
}

export async function submitAdminVideo(
  details: Pick<AdminVideo, 'title' | 'ownerEmail'>,
  file: File,
): Promise<AdminVideo> {
  const video: AdminVideo = {
    ...details,
    id: createId(),
    fileName: file.name,
    mimeType: file.type,
    size: file.size,
    uploadedAt: new Date().toISOString(),
    status: 'pending',
  };

  await saveVideoFile(video.id, file);
  try {
    writeStoredValue(ADMIN_VIDEOS_KEY, [...readVideos(), video]);
  } catch (error) {
    try {
      await deleteVideoFile(video.id);
    } catch (cleanupError) {
      console.error('Unable to remove the video file after its metadata could not be saved:', cleanupError);
    }
    throw error;
  }
  return video;
}

export async function approveAdminVideo(id: string): Promise<void> {
  const videos = readVideos();
  const video = videos.find((entry) => entry.id === id);
  if (!video) throw new Error('This video could not be found in the review queue.');
  if (video.status === 'approved') return;

  writeStoredValue(
    ADMIN_VIDEOS_KEY,
    videos.map((entry) => (entry.id === id ? { ...entry, status: 'approved' } : entry)),
  );
}
