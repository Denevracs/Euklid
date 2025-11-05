import { notFound } from 'next/navigation';
import { QueryClient, dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { fetchDiscussions, fetchNode } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';
import { NodePageClient } from './NodePageClient';

interface NodePageProps {
  params: { id: string };
}

export default async function NodePage({ params }: NodePageProps) {
  const queryClient = new QueryClient();

  const node = await fetchNode(params.id).catch(() => null);
  if (!node) {
    notFound();
  }

  await queryClient.prefetchQuery({
    queryKey: queryKeys.node(params.id),
    queryFn: () => Promise.resolve(node),
  });

  await queryClient.prefetchQuery({
    queryKey: queryKeys.discussions(params.id),
    queryFn: () => fetchDiscussions(params.id),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <NodePageClient nodeId={params.id} initialNode={node} />
    </HydrationBoundary>
  );
}
