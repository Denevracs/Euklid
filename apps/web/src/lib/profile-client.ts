import { apiFetch } from '@/lib/api';
import { profileResponseSchema, profileActivitySchema } from '@/lib/types';

export async function fetchPublicProfile(handleOrId: string) {
  const response = await apiFetch(`/profile/${encodeURIComponent(handleOrId)}`);
  return profileResponseSchema.parse(response);
}

export async function updateProfile(payload: {
  bio?: string | null;
  website?: string | null;
  location?: string | null;
  expertise?: string[] | null;
}) {
  const response = await apiFetch('/profile/update', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    authenticated: true,
  });
  return response as {
    id: string;
    bio: string | null;
    website: string | null;
    location: string | null;
    expertise: string[];
    updatedAt: string;
  };
}

export async function fetchProfileActivity(userId: string) {
  const response = await apiFetch(`/profile/activity/${userId}`);
  return profileActivitySchema.parse(response);
}
