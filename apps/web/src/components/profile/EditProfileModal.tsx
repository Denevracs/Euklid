'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useProfileClient } from '@/hooks/useProfileClient';

type EditProfileModalProps = {
  open: boolean;
  onClose: () => void;
  initialBio: string | null;
  initialWebsite: string | null;
  initialLocation: string | null;
  initialExpertise: string[];
  onUpdated?: (payload: {
    bio: string | null;
    website: string | null;
    location: string | null;
    expertise: string[];
  }) => void;
};

export function EditProfileModal({
  open,
  onClose,
  initialBio,
  initialWebsite,
  initialLocation,
  initialExpertise,
  onUpdated,
}: EditProfileModalProps) {
  const { saveProfile } = useProfileClient();
  const [bio, setBio] = useState(initialBio ?? '');
  const [website, setWebsite] = useState(initialWebsite ?? '');
  const [location, setLocation] = useState(initialLocation ?? '');
  const [expertise, setExpertise] = useState(initialExpertise.join(', '));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setBio(initialBio ?? '');
      setWebsite(initialWebsite ?? '');
      setLocation(initialLocation ?? '');
      setExpertise(initialExpertise.join(', '));
      setError(null);
    }
  }, [open, initialBio, initialWebsite, initialLocation, initialExpertise]);

  if (!open) {
    return null;
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const expertiseList = expertise
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean);
      const payload = await saveProfile({
        bio: bio || null,
        website: website || null,
        location: location || null,
        expertise: expertiseList,
      });
      onUpdated?.({
        bio: payload.bio,
        website: payload.website,
        location: payload.location,
        expertise: payload.expertise,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-auto bg-background/80 py-10">
      <div className="w-full max-w-2xl rounded-3xl border border-border bg-card p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Edit profile</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
        <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Bio
            <textarea
              className="min-h-[120px] rounded-md border border-border bg-background p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={bio}
              onChange={(event) => setBio(event.target.value)}
              placeholder="Share a short introduction..."
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Website
            <input
              className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={website}
              onChange={(event) => setWebsite(event.target.value)}
              placeholder="https://example.com"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Location
            <input
              className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              placeholder="Cambridge, UK"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Expertise tags
            <input
              className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={expertise}
              onChange={(event) => setExpertise(event.target.value)}
              placeholder="logic, topology, applied proofs"
            />
            <span className="text-xs text-muted-foreground">Separate topics with commas.</span>
          </label>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <div className="flex justify-end">
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
