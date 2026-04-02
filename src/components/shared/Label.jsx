const P = 'var(--color-primary-dark)';
const S = 'var(--color-gold)';

export default function Label({ t, green, gold, muted }) {
  const c = gold ? S : green ? P : muted ? 'rgba(255,255,255,.4)' : S;
  return (
    <div className="inline-flex items-center gap-2.5 mb-4">
      <span style={{ width: 20, height: 1.5, background: c, display: 'inline-block', borderRadius: 1 }} />
      <p className="font-headline font-bold uppercase tracking-[0.22em]" style={{ fontSize: 9.5, color: c }}>
        {t}
      </p>
    </div>
  );
}
