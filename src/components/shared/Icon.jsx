export default function Icon({ n, sz = 22, c, fill = 0 }) {
  return (
    <span className="material-symbols-outlined" style={{
      fontSize: sz, color: c,
      fontVariationSettings: `'FILL' ${fill},'wght' 300,'GRAD' 0,'opsz' ${sz}`,
      lineHeight: 1, display: 'inline-block', userSelect: 'none',
    }}>{n}</span>
  );
}
