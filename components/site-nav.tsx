import Link from "next/link";

export function SiteNav() {
  return (
    <header className="shell nav">
      <Link className="brand" href="/">
        <span className="brand-mark">C</span>
        <span>Info Card Craft</span>
      </Link>
      <nav className="nav-links" aria-label="主导航">
        <Link className="nav-link" href="/#workflow">
          工作流
        </Link>
        <Link className="nav-link" href="/#templates">
          模板
        </Link>
        <Link className="btn btn-secondary" href="/studio">
          进入工坊
        </Link>
      </nav>
    </header>
  );
}
