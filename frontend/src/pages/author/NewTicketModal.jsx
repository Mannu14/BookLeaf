import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Paperclip, X } from 'lucide-react';
import { api, fieldErrors } from '../../lib/api';
import { useToast } from '../../context/ToastContext';
import { Button, Field, Input, Modal, Select, Textarea } from '../../components/ui';
import { cn } from '../../lib/cn';

const ACCEPTED = ['image/png', 'image/jpeg', 'image/webp', 'application/pdf'];
const MAX_KB = 5 * 1024;

const EMPTY = { book_id: 'general', subject: '', description: '' };

export default function NewTicketModal({ open, onClose, books = [], defaultBookId }) {
  const navigate = useNavigate();
  const toast = useToast();
  const fileInput = useRef(null);
  const [form, setForm] = useState(EMPTY);
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setForm({ ...EMPTY, book_id: defaultBookId || 'general' });
      setFile(null);
      setErrors({});
    }
  }, [open, defaultBookId]);

  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setErrors((errs) => (errs[key] ? { ...errs, [key]: undefined } : errs));
  };

  const pickFile = (f) => {
    if (!f) return;
    if (!ACCEPTED.includes(f.type)) return setErrors((e) => ({ ...e, attachment: 'Use a PNG, JPG, WEBP or PDF file.' }));
    if (f.size / 1024 > MAX_KB) return setErrors((e) => ({ ...e, attachment: 'Files must be 5 MB or smaller.' }));
    setErrors((e) => ({ ...e, attachment: undefined }));
    setFile(f);
  };

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrors({});
    try {
      const res = await api.post('/tickets', {
        ...form,
        // Only metadata is sent; binary upload is out of scope for this version.
        attachment: file ? { original_name: file.name, mime_type: file.type, size_kb: Math.ceil(file.size / 1024) } : null,
      });
      const ticket = res.data.data;
      toast.success(`Ticket ${ticket.ticket_number} raised`, 'Our team has been notified and will reply here.');
      onClose();
      navigate(`/tickets/${ticket._id}`);
    } catch (err) {
      const fe = fieldErrors(err);
      setErrors(Object.keys(fe).length ? fe : { form: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const selectedBook = books.find((b) => b._id === form.book_id);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Raise a support query"
      description="Tell us what is going on. The more specific, the faster we can help."
      className="sm:max-w-xl"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button type="submit" form="new-ticket" loading={submitting}>
            Submit query
          </Button>
        </>
      }
    >
      <form id="new-ticket" onSubmit={submit} className="space-y-5" noValidate>
        {errors.form && <div className="rounded-lg bg-clay-50 px-3 py-2.5 text-[13px] text-clay-700">{errors.form}</div>}

        <Field label="What is this about?" htmlFor="book" error={errors.book_id}>
          <Select id="book" value={form.book_id} onChange={set('book_id')}>
            <option value="general">General / account level</option>
            {books.map((b) => (
              <option key={b._id} value={b._id}>
                {b.title}
                {b.status !== 'Published & Live' ? ' (in production)' : ''}
              </option>
            ))}
          </Select>
          {selectedBook && (
            <p className="text-[12px] text-ink-muted">
              {selectedBook.status}
              {selectedBook.isbn ? ` · ISBN ${selectedBook.isbn}` : ''}
            </p>
          )}
        </Field>

        <Field label="Subject" htmlFor="subject" error={errors.subject} aside={<Counter value={form.subject} max={200} />}>
          <Input id="subject" value={form.subject} onChange={set('subject')} maxLength={200} placeholder="e.g. Royalty for last quarter not received" invalid={!!errors.subject} />
        </Field>

        <Field label="Details" htmlFor="description" error={errors.description} aside={<Counter value={form.description} max={5000} />}>
          <Textarea
            id="description"
            rows={6}
            value={form.description}
            onChange={set('description')}
            maxLength={5000}
            placeholder="Include dates, amounts, order numbers or the platform where you noticed the issue."
            invalid={!!errors.description}
          />
        </Field>

        <Field label="Attachment" hint="Optional. Screenshots or photos of a defective copy help us verify faster." error={errors.attachment || errors['attachment.mime_type'] || errors['attachment.size_kb']}>
          {file ? (
            <div className="flex items-center gap-3 rounded-lg border border-line bg-paper px-3 py-2.5">
              <FileText className="h-4 w-4 shrink-0 text-ink-muted" />
              <span className="min-w-0 flex-1 truncate text-[13px]">{file.name}</span>
              <span className="num text-[12px] text-ink-muted">{Math.ceil(file.size / 1024)} KB</span>
              <button type="button" onClick={() => setFile(null)} className="rounded p-0.5 text-ink-muted hover:text-clay-600" aria-label="Remove attachment">
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                pickFile(e.dataTransfer.files?.[0]);
              }}
              className={cn(
                'flex w-full items-center justify-center gap-2 rounded-lg border border-dashed px-3 py-5 text-[13px] text-ink-muted transition',
                dragging ? 'border-leaf-500 bg-leaf-50 text-leaf-700' : 'border-line-strong hover:border-ink-faint hover:bg-paper'
              )}
            >
              <Paperclip className="h-4 w-4" />
              Drop a file or <span className="font-medium text-ink">browse</span>
              <span className="text-ink-faint">· PNG, JPG, PDF up to 5 MB</span>
            </button>
          )}
          <input ref={fileInput} type="file" accept={ACCEPTED.join(',')} className="hidden" onChange={(e) => pickFile(e.target.files?.[0])} />
        </Field>
      </form>
    </Modal>
  );
}

function Counter({ value, max }) {
  const near = value.length > max * 0.9;
  return <span className={cn('num text-[11px]', near ? 'text-clay-600' : 'text-ink-faint')}>{value.length}/{max}</span>;
}
