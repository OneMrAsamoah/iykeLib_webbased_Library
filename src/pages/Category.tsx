import { useMemo, useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Book } from "@/lib/books";
// `categories` static list removed from lib; prefer API categories via `/api/categories`.
import { fetchBooks } from "@/lib/api";
import { apiCall } from "@/lib/api";
import Thumbnail from "@/components/ui/thumbnail";
import { Input } from "@/components/ui/input";
import { Search, List, Grid } from "lucide-react";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
} from "@/components/ui/pagination";

const CategoryPage = () => {
  const params = useParams();
  const navigate = useNavigate();
  const name = params.name ? decodeURIComponent(params.name) : "";

  const [query, setQuery] = useState("");
  const [view, setView] = useState<"cards" | "list">("list");
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState<'all' | 'books' | 'tutorials'>('all');
  const [books, setBooks] = useState<any[]>([]);
  const [expandedDescriptions, setExpandedDescriptions] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categoriesList, setCategoriesList] = useState<string[]>([]);
  const [catsLoading, setCatsLoading] = useState(false);
  const [counts, setCounts] = useState<Record<string, number>>({});
  
  // maximum items per page for category listing
  const pageSize = 15;

  const loadBooks = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchBooks();
      const data = await res.json();
      // normalize category field coming from backend (category_name or category)
      const normalized = Array.isArray(data)
        ? data.map((b: any) => ({
            ...b,
            __type: 'book',
            category: b.category ?? b.category_name ?? b.category_name ?? "",
          }))
        : [];
      setBooks(normalized);
    } catch (err: any) {
      console.error(err);
      setError(err?.message ?? "Failed to fetch books");
    } finally {
      setLoading(false);
    }
  };

  const loadTutorials = async () => {
    try {
      const res = await apiCall('/api/tutorials');
      const data = await res.json();
      const extractYouTubeId = (input: string | undefined | null): string | null => {
        if (!input) return null;
        const s = String(input);
        const re = /(?:youtube\.com\/(?:.*v=|embed\/|v\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/;
        const m = s.match(re);
        if (m && m[1]) return m[1];
        try {
          const url = new URL(s);
          const v = url.searchParams.get('v');
          if (v && /^[A-Za-z0-9_-]{11}$/.test(v)) return v;
        } catch (e) {
          // not a URL
        }
        if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s;
        return null;
      };

      const normalized = Array.isArray(data)
        ? data.map((t: any) => {
            // prefer explicit youtube fields if provided by backend
            const raw = t.youtube_video_id ?? t.youtube_id ?? t.youtubeId ?? t.youtube ?? t.youtube_url ?? t.content_url ?? '';
            const youtubeId = extractYouTubeId(raw) ?? '';
            const thumbnail = t.thumbnail ?? (youtubeId ? `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg` : undefined);
            return {
              id: t.id?.toString(),
              title: t.title,
              description: t.description,
              __type: 'tutorial',
              category: t.category_name ?? '',
              content_url: t.content_url ?? t.youtube_url ?? null,
              youtubeId,
              thumbnail,
            };
          })
        : [];
      return normalized;
    } catch (err) {
      console.error('Failed to load tutorials', err);
      return [];
    }
  };

  useEffect(() => {
    let mounted = true;
    if (mounted) loadBooks();
    // fetch categories for sidebar
    const loadCats = async () => {
      setCatsLoading(true);
      try {
        const res = await fetch('/api/categories');
        if (!res.ok) throw new Error('Failed to fetch categories');
        const data = await res.json();
        if (!mounted) return;
        const names = Array.isArray(data) ? data.map((c: any) => c.name) : [];
        const countsMap: Record<string, number> = {};
        if (Array.isArray(data)) {
          data.forEach((c: any) => {
            countsMap[c.name] = Number(c.bookCount || 0) + Number(c.tutorialCount || 0);
          });
        }
        setCategoriesList(names);
        setCounts(countsMap);
      } catch (err) {
        console.error('Failed to load categories', err);
      } finally {
        if (mounted) setCatsLoading(false);
      }
    };

    // also prefetch tutorials when viewing 'all' or 'tutorials'
    const prefetch = async () => {
      const tuts = await loadTutorials();
      if (!mounted) return;
      // merge tutorials into books state so filtering by category works
      setBooks((prev) => [...prev, ...tuts]);
    };

    loadCats();
    prefetch();

    // set view to list on small screens and listen for changes
    let mq: MediaQueryList | null = null;
    const handleMq = (e: MediaQueryListEvent) => {
      if (e.matches) setView('list');
    };
    if (typeof window !== 'undefined' && window.matchMedia) {
      mq = window.matchMedia('(max-width: 640px)');
      if (mq.matches) setView('list');
      if (mq.addEventListener) mq.addEventListener('change', handleMq as any);
      else mq.addListener(handleMq as any);
    }

    return () => {
      mounted = false;
      if (mq) {
        if (mq.removeEventListener) mq.removeEventListener('change', handleMq as any);
        else mq.removeListener(handleMq as any);
      }
    };
  }, []);

  const booksInCategory = useMemo(() => {
    const byCategory = (items: any[]) => items.filter((b) => (b as any).category === name);
    if (!name || name === "All") {
      if (typeFilter === 'all') return books;
      return books.filter((b) => (b as any).__type === (typeFilter === 'books' ? 'book' : 'tutorial'));
    }
    if (typeFilter === 'all') return byCategory(books);
    return byCategory(books).filter((b) => (b as any).__type === (typeFilter === 'books' ? 'book' : 'tutorial'));
  }, [books, name, typeFilter]);

  const truncateWords = (text?: string | null, maxWords = 25) => {
    if (!text) return '';
    const words = String(text).trim().split(/\s+/).filter(Boolean);
    if (words.length <= maxWords) return text;
    return words.slice(0, maxWords).join(' ') + '…';
  };

  const handleOpenResource = (book: any) => {
    if ((book as any).__type === 'tutorial') {
      navigate(`/tutorials/${book.id}`, { state: { openModal: true } });
      return;
    }
    navigate(`/books/${book.id}`);
  };

  const filtered = useMemo(() => {
    if (!query) return booksInCategory;
    const q = query.toLowerCase();
    return booksInCategory.filter((b) => `${b.title} ${b.author} ${b.category} ${b.description}`.toLowerCase().includes(q));
  }, [booksInCategory, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));

  useEffect(() => {
    // Reset to first page when filter changes
    setPage(1);
  }, [filtered]);

  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const paginated = filtered.slice(start, end);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto max-w-6xl px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <aside className="hidden md:block md:col-span-1">
            <div className="sticky top-24">
              <h3 className="font-semibold mb-3">Categories</h3>
              <div className="flex flex-col gap-2">
                {/* Desktop: dropdown like Books.tsx */}
                <div className="hidden md:block">
                  <select
                    aria-label="Filter categories"
                    value={name || 'All'}
                    onChange={(e) => {
                      const v = e.target.value;
                      navigate(`/categories/${encodeURIComponent(v)}`);
                    }}
                    className="w-full rounded border px-3 py-2 bg-background"
                  >
                    <option value={"All"}>All</option>
                    {(categoriesList.length ? categoriesList : []).map((c) => (
                      <option key={c} value={c}>{c}{typeof counts[c] === 'number' ? ` (${counts[c]})` : ''}</option>
                    ))}
                  </select>
                  <div className="mt-4">
                    <label htmlFor="type-filter" className="sr-only">Filter by type</label>
                    <select
                      id="type-filter"
                      aria-label="Filter by type"
                      value={typeFilter}
                      onChange={(e) => { setTypeFilter(e.target.value as any); setPage(1); }}
                      className="w-full rounded border px-3 py-2 bg-background"
                    >
                      <option value="all">All</option>
                      <option value="books">Books</option>
                      <option value="tutorials">Tutorials</option>
                    </select>
                  </div>
                </div>
                {/* Mobile: nothing (filter hidden on mobile) */}
              </div>
            </div>
          </aside>

          <section className="md:col-span-3">
            <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
              <div>
                <h1 className="text-2xl font-bold">{name}</h1>
                <p className="text-muted-foreground">{loading ? 'Loading...' : `${booksInCategory.length} resources`}</p>
              </div>

              <div className="flex items-center gap-2 justify-end">
                <div className="ml-2 flex items-center gap-2">
                  <Button variant={view === "cards" ? "default" : "ghost"} onClick={() => setView("cards")}> 
                    <Grid className="h-4 w-4 mr-2" /> Cards
                  </Button>
                  <Button variant={view === "list" ? "default" : "ghost"} onClick={() => setView("list")}> 
                    <List className="h-4 w-4 mr-2" /> List
                  </Button>
                </div>

                {/* Type filter moved to sidebar */}
              </div>
            </div>

            <div className="flex justify-center mt-6 mb-8">
              <form role="search" onSubmit={(e) => e.preventDefault()} className="w-full max-w-md relative">
                <label htmlFor="category-search" className="sr-only">Search within {name}</label>
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  id="category-search"
                  aria-label={`Search within ${name}`}
                  placeholder={`Search within ${name}`}
                  className="pl-10 h-10"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </form>
            </div>

            {loading ? (
              <div className="text-center py-12 text-muted-foreground">Loading resources...</div>
            ) : error ? (
              <div className="text-center py-12 text-destructive">
                <p className="mb-4">Failed to load books: {error}</p>
                <div className="flex justify-center">
                  <Button onClick={loadBooks}>Retry</Button>
                </div>
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">No resources found for this category.</div>
            ) : (
              <>
                {view === "cards" ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {paginated.map((book) => (
                      <Card key={book.id} className="hover:shadow-md transition-shadow h-48 flex flex-col">
                        <CardHeader>
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-4">
                              <Thumbnail src={book.thumbnail ?? undefined} bookId={book.id} alt={`${book.title} cover`} className="h-12 w-8 object-cover rounded" />
                              <CardTitle className="truncate">{book.title}</CardTitle>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge className="text-xs">{(book as any).__type === 'tutorial' ? 'Tutorial' : 'Book'}</Badge>
                              <Badge variant="secondary">{book.category}</Badge>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="flex-1 overflow-hidden">
                          <p className="text-muted-foreground mb-3">by {book.author}</p>
                          {expandedDescriptions[String(book.id)] ? (
                            <p className="text-sm text-muted-foreground">{book.description}</p>
                          ) : (
                            <p className="text-sm text-muted-foreground overflow-hidden">{truncateWords(book.description, 25)}</p>
                          )}
                          <div className="mt-2 flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">📥 {(book as any).download_count || 0} downloads</span>
                            <Button variant="link" size="sm" onClick={(e) => { e.stopPropagation(); setExpandedDescriptions((s) => ({ ...s, [String(book.id)]: !s[String(book.id)] })); }}>
                              {expandedDescriptions[String(book.id)] ? 'Show less' : 'Read more'}
                            </Button>
                            <Button size="sm" onClick={() => handleOpenResource(book)}>View</Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {paginated.map((book) => (
                      <div key={book.id} className="py-4 flex items-start justify-between border rounded-md p-4 hover:shadow-sm transition-shadow bg-background">
                        <div className="flex items-start gap-4">
                          <Thumbnail src={book.thumbnail ?? undefined} bookId={book.id} alt={`${book.title} cover`} className="h-16 w-12 object-cover rounded" />
                          <div>
                            <h4 className="font-semibold">{book.title}</h4>
                            <div className="text-sm text-muted-foreground">by {book.author} <span className="font-medium">{book.category}</span> <span className="ml-2 inline-block text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-800">{(book as any).__type === 'tutorial' ? 'Tutorial' : 'Book'}</span> <span className="ml-2 text-xs">📥 {(book as any).download_count || 0} downloads</span></div>
                            <p className="text-sm text-muted-foreground mt-2">{truncateWords(book.description, 25)}</p>
                          </div>
                        </div>
                        <div>
                          <Button size="sm" onClick={() => handleOpenResource(book)}>View</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Pagination */}
            {filtered.length > pageSize && (
              <div className="mt-6">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          setPage((p) => Math.max(1, p - 1));
                        }}
                      />
                    </PaginationItem>

                    {Array.from({ length: totalPages }).map((_, i) => (
                      <PaginationItem key={i}>
                        <PaginationLink
                          href="#"
                          isActive={page === i + 1}
                          onClick={(e) => {
                            e.preventDefault();
                            setPage(i + 1);
                          }}
                        >
                          {i + 1}
                        </PaginationLink>
                      </PaginationItem>
                    ))}

                    <PaginationItem>
                      <PaginationNext
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          setPage((p) => Math.min(totalPages, p + 1));
                        }}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
};

export default CategoryPage;
