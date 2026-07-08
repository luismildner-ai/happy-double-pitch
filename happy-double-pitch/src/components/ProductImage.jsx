/**
 * Renders either a real image or a clearly labeled placeholder box, driven by
 * the `isPlaceholder` flag on the image object from src/content.js.
 *
 * EDIT: to swap a placeholder for a real image, drop the file in
 * /public/images/ and set isPlaceholder: false on that entry in content.js.
 */
export default function ProductImage({ image, className = '', rounded = 'rounded-2xl' }) {
  const { src, isPlaceholder, label, width, height, alt } = image;

  if (!isPlaceholder) {
    return (
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        loading="lazy"
        className={`${rounded} ${className}`}
      />
    );
  }

  const ratio = width && height ? width / height : 16 / 10;

  return (
    <div
      className={`${rounded} ${className} flex items-center justify-center border-2 border-dashed p-6 text-center`}
      style={{
        aspectRatio: ratio,
        borderColor: 'var(--color-neon-green)',
        background:
          'repeating-linear-gradient(135deg, rgba(255,255,255,0.02) 0 2px, transparent 2px 12px), var(--color-surface)',
        boxShadow: '0 0 24px -8px color-mix(in srgb, var(--color-neon-green) 40%, transparent)',
      }}
      role="img"
      aria-label={alt}
    >
      <div className="font-body text-xs uppercase tracking-[0.18em]" style={{ color: 'var(--color-neon-green)' }}>
        <p className="mb-1 font-semibold">REPLACE IMAGE</p>
        <p className="text-[color:var(--color-text-muted)] normal-case tracking-normal">{label}</p>
        {width && height && (
          <p className="mt-1 text-[color:var(--color-text-muted)] normal-case tracking-normal">
            {width}×{height}px · /public/images/
          </p>
        )}
      </div>
    </div>
  );
}
