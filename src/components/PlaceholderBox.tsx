type PlaceholderBoxProps = {
  title: string;
  text: string;
  icon?: "image" | "model" | "gallery";
  className?: string;
};

const ICONS: Record<NonNullable<PlaceholderBoxProps["icon"]>, string> = {
  image: "🖼️",
  model: "🧊",
  gallery: "📸",
};

export function PlaceholderBox({ title, text, icon = "image", className = "" }: PlaceholderBoxProps) {
  return (
    <div className={`placeholder-box ${className}`}>
      <span className="placeholder-box__icon" aria-hidden="true">
        {ICONS[icon]}
      </span>
      <h3 className="placeholder-box__title">{title}</h3>
      <p className="placeholder-box__text">{text}</p>
    </div>
  );
}
