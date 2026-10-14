import { Sparkles } from 'lucide-react';
import { Avatar } from './ui';
import { dateTime } from '../lib/format';
import { cn } from '../lib/cn';

// One entry in a ticket conversation. Rendered as a letter-style card rather
// than chat bubbles: support replies are long and need to be readable.
export default function MessageItem({ message, mine, viewer }) {
  const fromTeam = message.sender_role === 'admin';
  const label = fromTeam ? 'BookLeaf Support' : viewer === 'author' ? 'You' : 'Author';

  return (
    <li className={cn('animate-fade-up rounded-xl border bg-white shadow-card', fromTeam ? 'border-leaf-100' : 'border-line', mine && 'ml-0 sm:ml-10')}>
      <div className={cn('flex items-center gap-3 border-b px-5 py-3', fromTeam ? 'border-leaf-100 bg-leaf-50/50' : 'border-line')}>
        <Avatar name={message.sender_name} size="sm" tone={fromTeam ? 'ink' : 'leaf'} />
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-[13px] font-medium">{message.sender_name}</p>
          <p className="text-[12px] text-ink-muted">{label}</p>
        </div>
        {viewer === 'admin' && message.ai_assisted && (
          <span
            className="inline-flex items-center gap-1 rounded-md bg-white px-1.5 py-0.5 text-[11px] text-ink-muted ring-1 ring-line"
            title={message.ai_draft_edited ? 'Sent from an AI draft after editing' : 'Sent from an AI draft without changes'}
          >
            <Sparkles className="h-3 w-3" /> {message.ai_draft_edited ? 'AI draft, edited' : 'AI draft'}
          </span>
        )}
        <time className="shrink-0 text-[12px] text-ink-faint">{dateTime(message.created_at)}</time>
      </div>
      <p className="whitespace-pre-wrap break-words px-5 py-4 text-[14px] leading-[1.65] text-ink-soft">{message.body}</p>
    </li>
  );
}
