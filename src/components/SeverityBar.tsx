interface SeverityBarProps {
  label: string;
  value: number; // 0-5
  maxValue?: number;
}

const SeverityBar = ({ label, value, maxValue = 5 }: SeverityBarProps) => {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs font-mono w-40 shrink-0">{label}</span>
      <div className="flex gap-1">
        {Array.from({ length: maxValue }).map((_, i) => (
          <div
            key={i}
            className={`w-6 h-4 border border-foreground ${
              i < value ? "severity-bar-fill" : "severity-bar-empty"
            }`}
          />
        ))}
      </div>
    </div>
  );
};

export default SeverityBar;
