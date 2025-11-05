import { listRecentNodes, searchNodes } from '@/lib/nodes';
import { SearchBar } from '@/components/search-bar';
import { NodeCard } from '@/components/node-card';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export const revalidate = 0;

type PageProps = {
  searchParams: Record<string, string | string[] | undefined>;
};

enum LandingSection {
  Hero = 'hero',
  Activity = 'activity',
}

export default async function LandingPage({ searchParams }: PageProps) {
  const query = typeof searchParams.query === 'string' ? searchParams.query : undefined;
  const nodes = query ? await searchNodes(query) : await listRecentNodes(8);

  return (
    <div className="space-y-8">
      <LandingHero />
      <LandingActivity section={LandingSection.Activity} nodes={nodes} hasQuery={Boolean(query)} />
    </div>
  );
}

function LandingHero() {
  return (
    <section className="flex flex-col items-center gap-6 text-center">
      <div className="max-w-3xl space-y-4">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Collaborative reasoning for the next generation of mathematics.
        </h1>
        <p className="text-lg text-muted-foreground">
          Euclid Network maps mathematical knowledge as a living graph of definitions, axioms,
          theorems, and evidence so researchers can discover, validate, and build upon prior work.
        </p>
      </div>
      <SearchBar />
      <div className="flex flex-wrap justify-center gap-3">
        <Button asChild>
          <Link href="/create">Create a node</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/graph">Explore the graph</Link>
        </Button>
      </div>
    </section>
  );
}

type LandingActivityProps = {
  section: LandingSection;
  nodes: Awaited<ReturnType<typeof listRecentNodes>>;
  hasQuery: boolean;
};

function LandingActivity({ nodes, hasQuery }: LandingActivityProps) {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">
          {hasQuery ? 'Search results' : 'Recent activity'}
        </h2>
        {!hasQuery && (
          <Button asChild variant="ghost" size="sm">
            <Link href="/nodes">View all</Link>
          </Button>
        )}
      </div>
      {nodes.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            {hasQuery
              ? 'No nodes match your query yet.'
              : 'No nodes yet. Create the first contribution!'}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {nodes.map((node) => (
            <NodeCard key={node.id} node={node} />
          ))}
        </div>
      )}
    </section>
  );
}
