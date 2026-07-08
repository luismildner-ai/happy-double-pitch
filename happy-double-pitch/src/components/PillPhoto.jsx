import ProductImage from './ProductImage.jsx';

/*
 * DenkRiesen-style feature card: a rounded product photo with a black pill
 * label overlaid at the bottom-left (their signature product-page treatment),
 * adapted onto the dark premium base with a neon border + glow.
 */
export default function PillPhoto({ item }) {
  return (
    <div
      className="group relative overflow-hidden rounded-2xl border transition-shadow duration-300"
      style={{ borderColor: 'var(--color-surface-border)', background: 'var(--color-surface)' }}
    >
      <div className="aspect-[4/3] w-full overflow-hidden">
        <ProductImage
          image={item.image}
          rounded="rounded-none"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
        />
      </div>
      {/* Black pill label — DenkRiesen signature */}
      <div className="absolute bottom-3 left-3 flex items-center gap-2">
        <span
          className="rounded-full px-3.5 py-1.5 font-display text-sm font-bold text-white"
          style={{ background: 'rgba(10,10,10,0.85)', backdropFilter: 'blur(4px)' }}
        >
          {item.label}
        </span>
        {item.sublabel && (
          <span
            className="rounded-full px-3 py-1.5 font-body text-[11px] font-semibold"
            style={{ background: 'var(--color-neon-green)', color: '#0a0a0a' }}
          >
            {item.sublabel}
          </span>
        )}
      </div>
    </div>
  );
}
