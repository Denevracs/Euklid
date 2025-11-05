import { redirect } from 'next/navigation';

export default function ModerationIndexPage() {
  redirect('/moderation/queue');
}
