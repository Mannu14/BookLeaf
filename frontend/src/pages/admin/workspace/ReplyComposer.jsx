import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, RefreshCw, Send, Sparkles } from 'lucide-react';
import { Button, Card, Skeleton, Textarea } from '../../../components/ui';
import { ago } from '../../../lib/format';
import { cn } from '../../../lib/cn';

const SECTION_LABELS = {
  company: 'Company',
  royalty: 'Royalty policy',
  isbn: 'ISBN policy',
  metadata: 'Metadata updates',
  printing: 'Printing & quality',
  distribution: 'Distribution',
  production: 'Production stages',
};

/**
 * Reply editor pre-filled with the AI draft. The admin always reviews and
 * sends; nothing reaches the author automatically.
 */
export default function ReplyComposer({ ticket, drafting, onRegenerate, onSend }) {
  const draft = ticket.ai_draft;
  const [text, setText] = useState('');
  const [fromDraft, setFromDraft] = useState(false);
  const [resolve, setResolve] = useState(false);
  const [sending, setSending] = useState(false);
  const loadedDraftAt = useRef(null);

  // Drop a newly generated draft into the editor, unless the admin has
  // already typed something of their own.
  useEffect(() => {
    if (!draft?.text || draft.generated_at === loadedDraftAt.current) return;
    const untouched = !text.trim() || fromDraft;
    if (untouched) {
      setText(draft.text);
      setFromDraft(true);
    }
    loadedDraftAt.current = draft.generated_at;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft?.generated_at]);

  const closed = ticket.status === 'Closed';
  const isFallback = draft?.meta?.source === 'fallback';

  const submit = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setSending(true);
    const ok = await onSend({ body: text.trim(), resolve, from_draft: fromDraft });
    setSending(false);
    if (ok) {
      setText('');
      setFromDraft(false);
      setResolve(false);
      loadedDraftAt.current = draft?.generated_at;
    }
  };

  if (closed) {
    return (
      <Card className="p-5 text-[13px] text-ink-muted">
        This ticket is closed. Change the status to reopen it before replying.
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-paper/60 px-5 py-3">
        <div className="flex min-w-0 items-center gap-2 text-[13px]">
          <Sparkles className={cn('h-4 w-4 shrink-0', isFallback ? 'text-ink-faint' : 'text-leaf-600')} />
          {drafting ? (
            <span className="text-ink-muted">Drafting a reply from the knowledge base...</span>
          ) : draft?.text ? (
            <span className="truncate text-ink-soft">
              {isFallback ? 'Template draft (AI unavailable)' : 'AI draft'}
              <span className="text-ink-faint"> · {ago(draft.generated_at)}</span>
              {draft.meta?.input_tokens != null && (
                <span className="text-ink-faint" title="Prompt / completion tokens">
                  {' '}
                  · {draft.meta.input_tokens}→{draft.meta.output_tokens} tok
                </span>
              )}
            </span>
          ) : (
            <span className="text-ink-muted">No draft yet</span>
          )}
        </div>
        <Button size="sm" variant="ghost" icon={RefreshCw} onClick={onRegenerate} loading={drafting}>
          {draft?.text ? 'Regenerate' : 'Draft reply'}
        </Button>
      </div>

      {draft?.stale && !drafting && (
        <div className="flex items-center gap-2 border-b border-ochre-100 bg-ochre-50 px-5 py-2.5 text-[13px] text-ochre-700">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          The author replied after this draft was written.
          <button onClick={onRegenerate} className="font-medium underline underline-offset-2">
            Draft again
          </button>
        </div>
      )}

      <form onSubmit={submit} className="p-5">
        {drafting && !text ? (
          <div className="space-y-2.5 py-1">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-4" />
            <Skeleton className="h-4 w-11/12" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ) : (
          <Textarea
            rows={11}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Write a reply to the author..."
            className="border-0 px-0 py-0 shadow-none ring-0 hover:border-0 focus:ring-0"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit(e);
            }}
          />
        )}

        {draft?.kb_sections?.length > 0 && fromDraft && (
          <p className="mt-3 text-[12px] text-ink-faint">
            Grounded in: {draft.kb_sections.map((s) => SECTION_LABELS[s] || s).join(', ')}. Check amounts and dates before sending.
          </p>
        )}

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
          <label className="flex cursor-pointer select-none items-center gap-2 text-[13px] text-ink-soft">
            <input type="checkbox" checked={resolve} onChange={(e) => setResolve(e.target.checked)} className="h-4 w-4 rounded border-line-strong accent-leaf-700" />
            Mark as resolved
          </label>
          <div className="flex items-center gap-2">
            {text && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => {
                  setText('');
                  setFromDraft(false);
                }}
              >
                Clear
              </Button>
            )}
            <Button type="submit" size="sm" icon={Send} loading={sending} disabled={!text.trim()}>
              Send to author
            </Button>
          </div>
        </div>
      </form>
    </Card>
  );
}
