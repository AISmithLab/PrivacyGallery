import { Search } from "lucide-react";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

const SearchBar = ({ value, onChange }: SearchBarProps) => {
  return (
    <div className="flex items-center gap-3 brutalist-border parchment px-4 py-3" style={{ boxShadow: '3px 4px 10px hsl(25 35% 15% / 0.3)' }}>
      <Search className="w-5 h-5 text-foreground" />
      <input
        type="text"
        placeholder="Explore a case.."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 bg-transparent text-lg font-mono placeholder:text-muted-foreground/60 outline-none"
      />
    </div>
  );
};

export default SearchBar;
