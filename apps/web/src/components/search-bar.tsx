'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import * as React from 'react';
import { Button } from '@/components/ui/button';

export function SearchBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [value, setValue] = React.useState(searchParams.get('query') ?? '');

  React.useEffect(() => {
    setValue(searchParams.get('query') ?? '');
  }, [searchParams]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set('query', value);
    } else {
      params.delete('query');
    }
    router.push(`/?${params.toString()}`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-2xl items-center gap-2">
      <input
        className="flex-1 rounded-md border border-input bg-background px-4 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        placeholder="Search nodes by title or statement"
        value={value}
        onChange={(event) => setValue(event.target.value)}
      />
      <Button type="submit" variant="default">
        Search
      </Button>
    </form>
  );
}
