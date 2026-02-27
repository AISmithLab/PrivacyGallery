import { Link, useLocation } from "react-router-dom";

const NAV_ITEMS = [
  { label: "Cases", path: "/" },
  { label: "Leaderboard", path: "/leaderboard" },
  { label: "About", path: "/about" },
];

const TopNav = () => {
  const location = useLocation();

  return (
    <nav
      className="flex items-center justify-between px-6 py-3 border-b-4"
      style={{ background: "#FFD700", borderColor: "#000" }}
    >
      <Link to="/" className="flex items-center gap-2">
        <h1
          className="text-2xl font-bold tracking-tighter uppercase"
          style={{ fontFamily: "'Anton', sans-serif", color: "#000" }}
        >
          The Privacy Jury
        </h1>
      </Link>

      <div className="flex items-center gap-1">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.path === "/"
              ? location.pathname === "/" || location.pathname.startsWith("/case/")
              : location.pathname === item.path;

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`px-4 py-2 text-xs font-mono font-bold uppercase tracking-wider transition-all border-2 ${
                isActive
                  ? "bg-black text-[#FFD700] border-black"
                  : "bg-transparent text-black border-transparent hover:border-black"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default TopNav;
