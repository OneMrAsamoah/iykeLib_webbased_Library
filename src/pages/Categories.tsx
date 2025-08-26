import { useMemo, useState, useEffect } from "react";
import { Grid, List, BookOpen, Video, Download } from "lucide-react";
import Header from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
// Removed static `categories` fallback from lib; categories are fetched from the API.
import { useNavigate } from "react-router-dom";
import Footer from "@/components/Footer";

const Categories = () => {
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [view, setView] = useState<"card" | "list">("list");
  const [typeFilter, setTypeFilter] = useState<'all' | 'books' | 'tutorials'>('all');
  const [page, setPage] = useState(1);
  const PER_PAGE = 15;

  const [counts, setCounts] = useState<Record<string, { bookCount: number; tutorialCount: number; totalDownloads: number }>>({});
  const [apiCategories, setApiCategories] = useState<string[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset to first page when search, view, or type filter changes
  useEffect(() => {
    setPage(1);
  }, [search, view, typeFilter]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/categories');
        if (!res.ok) throw new Error('Failed to fetch categories');
        const data = await res.json();
        if (!mounted) return;
        const names = Array.isArray(data) ? data.map((c: any) => c.name) : [];
        const countsMap: Record<string, { bookCount: number; tutorialCount: number; totalDownloads: number }> = {};
        if (Array.isArray(data)) {
          data.forEach((c: any) => {
            countsMap[c.name] = { 
              bookCount: Number(c.bookCount || 0), 
              tutorialCount: Number(c.tutorialCount || 0),
              totalDownloads: Number(c.totalDownloads || 0)
            };
          });
        }
        setApiCategories(names);
        setCounts(countsMap);
      } catch (err: any) {
        console.error('Error fetching categories', err);
        if (!mounted) return;
        setError(err?.message ?? 'Failed to fetch categories');
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, []);

  const allCategoriesList = useMemo(() => {
    const list = apiCategories && apiCategories.length ? apiCategories : [];
    // remove "All" and categories with zero resources for the selected type
    return list.filter((c) => {
      if (c === "All") return false;
      const bookCount = counts[c]?.bookCount || 0;
      const tutorialCount = counts[c]?.tutorialCount || 0;
      if (typeFilter === 'books') return bookCount > 0;
      if (typeFilter === 'tutorials') return tutorialCount > 0;
      return (bookCount + tutorialCount) > 0;
    });
  }, [apiCategories, counts, typeFilter]);

  const filtered = useMemo(() => {
    if (!search.trim()) return allCategoriesList;
    const q = search.toLowerCase();
    return allCategoriesList.filter((c) => c.toLowerCase().includes(q));
  }, [search, allCategoriesList]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const startIdx = (page - 1) * PER_PAGE;
  const pageItems = filtered.slice(startIdx, startIdx + PER_PAGE);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto max-w-6xl px-4 py-8">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold">Categories</h1>
          <p className="text-muted-foreground">Browse all categories and open the one you want to explore.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <aside className="hidden md:block md:col-span-1">
            <div className="sticky top-24">
              <h3 className="font-semibold mb-3">Filter</h3>
              <label htmlFor="type-filter" className="sr-only">Filter by type</label>
              <select
                id="type-filter"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as any)}
                className="w-full rounded border px-3 py-2 bg-background"
              >
                <option value="all">All</option>
                <option value="books">Books</option>
                <option value="tutorials">Tutorials</option>
              </select>
            </div>
          </aside>

          <section className="md:col-span-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div className="flex-1">
                <Input value={search} onChange={(e) => setSearch((e.target as HTMLInputElement).value)} placeholder="Search categories..." />
              </div>

              <div className="flex items-center gap-2">
                <Button variant={view === "card" ? "default" : "ghost"} onClick={() => setView("card")}>
                  <Grid className="h-4 w-4 mr-2" />
                  Card
                </Button>
                <Button variant={view === "list" ? "default" : "ghost"} onClick={() => setView("list")}>
                  <List className="h-4 w-4 mr-2" />
                  List
                </Button>
              </div>
            </div>

            {filtered.length === 0 ? (
              <div className="text-center text-muted-foreground">No categories found.</div>
            ) : view === "card" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {pageItems.map((c) => (
                  <Card key={c} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(`/categories/${encodeURIComponent(c)}`)}>
                    <CardHeader>
                      <CardTitle>{c}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-sm text-muted-foreground flex items-center gap-6">
                        <div className="flex items-center gap-3">
                          <BookOpen className="h-4 w-4" />
                          <span className="font-medium">{counts[c]?.bookCount || 0}</span>
                          <span className="sr-only">books</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <Video className="h-4 w-4" />
                          <span className="font-medium">{counts[c]?.tutorialCount || 0}</span>
                          <span className="sr-only">tutorials</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <Download className="h-4 w-4" />
                          <span className="font-medium">{counts[c]?.totalDownloads || 0}</span>
                          <span className="sr-only">downloads</span>
                        </div>
                      </div>
                      <div className="mt-4">
                        <Button onClick={() => navigate(`/categories/${encodeURIComponent(c)}`)}>Open</Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {pageItems.map((c) => (
                  <div key={c} className="flex items-center justify-between p-4 border rounded-md hover:shadow-sm transition-shadow bg-background">
                    <div>
                      <div className="font-medium">{c}</div>
                      <div className="text-sm text-muted-foreground flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          <BookOpen className="h-4 w-4" />
                          <span>{counts[c]?.bookCount || 0} books</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Video className="h-4 w-4" />
                          <span>{counts[c]?.tutorialCount || 0} tutorials</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span>📥 {counts[c]?.totalDownloads || 0} downloads</span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <Button onClick={() => navigate(`/categories/${encodeURIComponent(c)}`)}>Open</Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-6">
                <Button variant="ghost" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>

                {/* Simple page numbers */}
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }).map((_, i) => {
                    const p = i + 1;
                    return (
                      <Button key={p} variant={p === page ? "default" : "ghost"} onClick={() => setPage(p)}>{p}</Button>
                    );
                  })}
                </div>

                <Button variant="ghost" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next</Button>
              </div>
            )}
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Categories;
