import { useState, useMemo } from "react";
import TopNav from "@/components/TopNav";
import { Plus, Minus, Search } from "lucide-react";
import { glossary } from "@/data/glossary";

export default function Learn() {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [expandedTerms, setExpandedTerms] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");

  const toggleCategory = (id: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleTerm = (term: string) => {
    setExpandedTerms((prev) => {
      const next = new Set(prev);
      next.has(term) ? next.delete(term) : next.add(term);
      return next;
    });
  };

  const filteredGlossary = useMemo(() => {
    if (!search.trim()) return glossary;
    const q = search.toLowerCase();
    return glossary
      .map((cat) => ({
        ...cat,
        entries: cat.entries.filter(
          (e) =>
            e.term.toLowerCase().includes(q) ||
            e.shortDescription.toLowerCase().includes(q) ||
            e.fullDescription.toLowerCase().includes(q)
        ),
      }))
      .filter((cat) => cat.entries.length > 0);
  }, [search]);

  return (
    <div className="min-h-screen bg-background loot-drop-page" style={{ backgroundColor: "#F5F3EF" }}>
      <TopNav />

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        <header className="text-center mb-4">
          <h1 className="hero-title text-6xl sm:text-8xl font-bold tracking-tighter uppercase leading-none">
            Learn
          </h1>
          <p className="text-sm font-mono text-muted-foreground mt-3 max-w-xl mx-auto">
            Understand privacy enforcement terminology — what outcomes, violations, and legal concepts actually mean.
          </p>
        </header>

        {/* Search */}
        <div className="relative max-w-md mx-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search terms..."
            className="w-full border-2 border-border bg-white pl-10 pr-4 py-2 text-sm font-mono focus:outline-none focus:border-black"
          />
        </div>

        {filteredGlossary.length === 0 && (
          <p className="text-center text-sm font-mono text-muted-foreground py-8">
            No terms match your search.
          </p>
        )}

        {filteredGlossary.map((category) => {
          const isCatOpen = expandedCategories.has(category.id) || search.trim().length > 0;

          return (
            <section key={category.id}>
              {/* Category header — accordion style */}
              <button
                onClick={() => toggleCategory(category.id)}
                className="w-full flex items-center gap-3 py-3 text-left group"
              >
                <span
                  className="flex-shrink-0 w-8 h-8 rounded-full border-2 border-black flex items-center justify-center"
                  style={{ backgroundColor: "#FFD700" }}
                >
                  {isCatOpen ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                </span>
                <span className="text-xl font-bold uppercase tracking-tight flex-1">
                  {category.title}
                </span>
                <span className="text-xs font-mono text-muted-foreground">
                  {category.entries.length} terms
                </span>
              </button>
              <div className="border-b-2 border-border mb-4" />

              {isCatOpen && (
                <div className="space-y-1 mb-6">
                  <p className="text-sm font-mono text-muted-foreground mb-4 pl-11">
                    {category.description}
                  </p>

                  {category.entries.map((entry) => {
                    const isOpen = expandedTerms.has(entry.term);
                    return (
                      <div key={entry.term} className="border-2 border-border bg-white">
                        <button
                          onClick={() => toggleTerm(entry.term)}
                          className="w-full flex items-start gap-3 p-4 text-left hover:bg-gray-50 transition-colors"
                        >
                          <span className="flex-shrink-0 mt-0.5 w-5 h-5 rounded-full border-2 border-black flex items-center justify-center bg-white">
                            {isOpen ? <Minus className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold uppercase tracking-tight text-sm">
                              {entry.term}
                            </p>
                            {!isOpen && (
                              <p className="text-xs font-mono text-muted-foreground mt-1">
                                {entry.shortDescription}
                              </p>
                            )}
                          </div>
                        </button>

                        {isOpen && (
                          <div className="px-4 pb-4 pl-12 space-y-3">
                            <p className="text-sm leading-relaxed">
                              {entry.fullDescription}
                            </p>
                            {entry.relatedTerms && entry.relatedTerms.length > 0 && (
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-mono font-bold uppercase text-muted-foreground">
                                  See also:
                                </span>
                                {entry.relatedTerms.map((rt) => (
                                  <button
                                    key={rt}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setExpandedTerms((prev) => {
                                        const next = new Set(prev);
                                        next.add(rt);
                                        return next;
                                      });
                                      // Expand the parent category if needed
                                      for (const cat of glossary) {
                                        if (cat.entries.some((en) => en.term === rt)) {
                                          setExpandedCategories((prev) => {
                                            const next = new Set(prev);
                                            next.add(cat.id);
                                            return next;
                                          });
                                        }
                                      }
                                      // Scroll to the term
                                      setTimeout(() => {
                                        const el = document.getElementById(`term-${rt.replace(/\s+/g, "-").toLowerCase()}`);
                                        el?.scrollIntoView({ behavior: "smooth", block: "center" });
                                      }, 100);
                                    }}
                                    className="text-xs font-mono px-2 py-1 border border-border hover:bg-[#FFD700] hover:border-black transition-colors"
                                  >
                                    {rt}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
