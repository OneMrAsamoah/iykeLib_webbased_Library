import { useState, useEffect } from "react";
import { Search, List, Grid as GridIcon, ChevronLeft, ChevronRight, Download, X, BookOpen, User, Calendar, FileText, Link, ShoppingCart, Star, Eye, Heart } from "lucide-react";
import Header from "@/components/Header";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Thumbnail from "@/components/ui/thumbnail";
import { ThumbsRating } from "@/components/ui/ThumbsRating";
import { useNavigate } from "react-router-dom";
import Footer from "@/components/Footer";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

type BackendBook = {
  id: number | string;
  title: string;
  author: string;
  description?: string | null;
  thumbnail?: string | null;
  cover_image_path?: string | null;
  file_path?: string | null;
  external_link?: string | null;
  purchase_link?: string | null;
  book_type?: 'file' | 'link' | 'purchase';
  category_name?: string | null;
  up_votes?: number;
  down_votes?: number;
  user_vote?: number | null;
  download_count?: number;
};

const Books = () => {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | 'All'>('All');
  const [view, setView] = useState<"cards" | "list">("list");
  const [isSmallScreen, setIsSmallScreen] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(12);
  const [books, setBooks] = useState<BackendBook[]>([]);
  const [categories, setCategories] = useState<string[]>(['All']);
  const [isLoading, setIsLoading] = useState(true);
  
  // Book preview modal state
  const [selectedBook, setSelectedBook] = useState<BackendBook | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  const navigate = useNavigate();
  
  const truncateText = (text?: string | null, max = 150) => {
    if (!text) return '';
    return text.length > max ? text.slice(0, max).trimEnd() + '…' : text;
  };

  const getBookTypeInfo = (bookType: string) => {
    switch (bookType) {
      case 'file':
        return { label: 'File', color: 'bg-blue-100 text-blue-800' };
      case 'link':
        return { label: 'Link', color: 'bg-green-100 text-green-800' };
      case 'purchase':
        return { label: 'Purchase', color: 'bg-orange-100 text-orange-800' };
      default:
        return { label: 'Unknown', color: 'bg-gray-100 text-gray-800' };
    }
  };

  const handleBookClick = (book: BackendBook) => {
    setSelectedBook(book);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedBook(null);
  };

  const handleViewFullDetails = (book: BackendBook) => {
    handleModalClose();
    navigate(`/books/${book.id}`);
  };

  const handleAddToFavorites = (book: BackendBook) => {
    const bookId = String(book.id);
    setFavorites(prev => {
      const newFavorites = new Set(prev);
      if (newFavorites.has(bookId)) {
        newFavorites.delete(bookId);
        // Show feedback
        console.log(`Removed "${book.title}" from favorites`);
      } else {
        newFavorites.add(bookId);
        // Show feedback
        console.log(`Added "${book.title}" to favorites`);
      }
      return newFavorites;
    });
  };

  const handleShareBook = async (book: BackendBook) => {
    const shareData = {
      title: book.title,
      text: `Check out "${book.title}" by ${book.author}`,
      url: `${window.location.origin}/books/${book.id}`,
    };

    try {
      if (navigator.share && navigator.canShare(shareData)) {
        await navigator.share(shareData);
        console.log('Book shared successfully via native share API');
      } else {
        // Fallback: copy to clipboard
        const shareText = `${book.title} by ${book.author}\n${shareData.url}`;
        await navigator.clipboard.writeText(shareText);
        
        // Show success message (you can replace this with a toast notification)
        console.log('Book link copied to clipboard!');
        alert('Book link copied to clipboard!');
      }
    } catch (error) {
      console.error('Error sharing book:', error);
      // Fallback: copy to clipboard
      try {
        const shareText = `${book.title} by ${book.author}\n${shareData.url}`;
        await navigator.clipboard.writeText(shareText);
        console.log('Book link copied to clipboard!');
        alert('Book link copied to clipboard!');
      } catch (clipboardError) {
        console.error('Error copying to clipboard:', clipboardError);
        // Final fallback: show the URL for manual copying
        const shareText = `${book.title} by ${book.author}\n${shareData.url}`;
        alert(`Failed to copy to clipboard. Please copy manually:\n\n${shareText}`);
      }
    }
  };

  useEffect(() => {
    fetchBooks();
    fetchCategories();

    // Detect small screens (Tailwind's `sm` breakpoint is 640px)
    if (typeof window !== 'undefined' && window.matchMedia) {
      const mq = window.matchMedia('(max-width: 640px)');
      const handleMq = (e: any) => {
        setIsSmallScreen(e.matches);
        if (e.matches) setView('cards'); // force cards on small screens
      };
      setIsSmallScreen(mq.matches);
      // Add listener (support older browsers)
      if (mq.addEventListener) mq.addEventListener('change', handleMq);
      else mq.addListener(handleMq);
      return () => {
        if (mq.removeEventListener) mq.removeEventListener('change', handleMq);
        else mq.removeListener(handleMq);
      };
    }
  }, []);

  const fetchBooks = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/books');
      if (!res.ok) throw new Error('Failed to fetch books');
      const data = await res.json();
      
      console.log('Raw API response:', data);
      
      // Transform the data to match our BackendBook interface
      const transformedBooks: BackendBook[] = (data || []).map((book: any) => ({
        id: book.id,
        title: book.title || 'Untitled',
        author: book.author || 'Unknown Author',
        description: book.description,
        thumbnail: book.thumbnail,
        cover_image_path: book.cover_image_path,
        file_path: book.file_path,
        external_link: book.external_link,
        purchase_link: book.purchase_link,
        book_type: book.book_type || 'file',
        category_name: book.category_name
        ,
        up_votes: typeof book.up_votes === 'number' ? book.up_votes : 0,
        down_votes: typeof book.down_votes === 'number' ? book.down_votes : 0,
        user_vote: typeof book.user_vote === 'number' ? book.user_vote : null,
        download_count: typeof book.download_count === 'number' ? book.download_count : 0,
      }));
      
      console.log('Transformed books:', transformedBooks);
      setBooks(transformedBooks);
    } catch (err) {
      console.error('Error fetching books', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/categories');
      if (!res.ok) throw new Error('Failed to fetch categories');
      const data = await res.json();
      const names = Array.isArray(data) ? data.map((c: any) => c.name) : [];
      setCategories(['All', ...names]);
    } catch (err) {
      console.error('Error fetching categories', err);
    }
  };

  const filtered = books.filter((b) => {
    const matchesCategory = activeCategory === 'All' || b.category_name === activeCategory;
    const combined = `${b.title || ''} ${b.author || ''} ${b.category_name || ''}`.toLowerCase();
    const matchesQuery = combined.includes(query.toLowerCase());
    return matchesCategory && matchesQuery;
  });

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const paginated = filtered.slice(start, end);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto max-w-6xl px-4 py-8">
          <div className="flex justify-center p-8">Loading books...</div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto max-w-6xl px-4 py-8">
        {/* Hero / Controls */}
        <div className="mb-8 grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <div className="lg:col-span-2">
            <h1 className="text-3xl sm:text-4xl font-extrabold leading-tight font-sans">Discover Books</h1>
            <p className="text-muted-foreground mt-2">Curated titles across categories — search, filter, and preview books quickly.</p>
            <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground h-5 w-5" />
                <Input
                  placeholder="Search by title, author or category"
                  className="pl-12 h-12 w-full"
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); setPage(1); }}
                />
              </div>

              {/* Category filter moved into the search row */}
              <div className="hidden sm:flex items-center">
                <label htmlFor="category-filter" className="sr-only">Filter by category</label>
                <select
                  id="category-filter"
                  value={activeCategory}
                  onChange={(e) => { setActiveCategory(e.target.value); setPage(1); }}
                  className="ml-2 rounded border px-3 py-2 bg-background text-sm"
                  aria-label="Filter books by category"
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <div className="inline-flex items-center rounded-md border bg-background p-1">
                  <Button variant={view === "cards" ? "secondary" : "ghost"} size="icon" onClick={() => setView("cards")} aria-label="Grid view">
                    <GridIcon className="h-4 w-4" />
                  </Button>
                  <Button variant={view === "list" ? "secondary" : "ghost"} size="icon" onClick={() => setView("list")} aria-label="List view">
                    <List className="h-4 w-4" />
                  </Button>
                </div>

                <div className="text-sm text-muted-foreground hidden sm:flex">
                  <span className="mr-3">{filtered.length} results</span>
                  {favorites.size > 0 && (
                    <span className="flex items-center gap-1">
                      <Heart className="h-4 w-4 text-red-500 fill-current" />
                      {favorites.size}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Filters column for larger screens */}
          <aside className="order-first lg:order-last lg:col-span-1">
            <div className="bg-card rounded-lg p-4 shadow-sm">
              <div className="text-sm text-muted-foreground">Use the category filter in the search bar.</div>
            </div>
          </aside>
        </div>

        {/* Content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <section className="lg:col-span-4">
            {filtered.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">No books found.</div>
            ) : (
              <>
                <div className={view === "cards" ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" : "flex flex-col gap-4"}>
                  {paginated.map((book) => (
                    <Card
                      key={String(book.id)}
                      className={`cursor-pointer hover:shadow-lg overflow-hidden rounded-lg ${view === "list" ? "flex flex-col sm:flex-row items-start gap-4 p-4 border" : "flex flex-col h-full"}`}
                      onClick={() => handleBookClick(book)}
                    >
                      {view === "cards" ? (
                        <>
                          <CardHeader className="p-0">
                            <div className="w-full h-48 bg-gray-100 relative">
                              <Thumbnail
                                src={book.thumbnail ?? (book as any).cover_image_path ?? undefined}
                                bookId={typeof book.id === 'number' ? book.id : Number(book.id) || undefined}
                                alt={book.title}
                                className="w-full h-full object-cover rounded-t-lg"
                                fallback={'/placeholder.svg'}
                                loading="lazy"
                              />
                            </div>
                          </CardHeader>

                          <CardContent className="p-4 flex flex-col flex-1">
                            <div className="flex-1 flex flex-col">
                              <CardTitle className="text-lg break-words max-w-full line-clamp-2 mb-2">{book.title}</CardTitle>
                              <p className="text-sm text-muted-foreground break-words mb-2">by {book.author}</p>

                              <div className="mb-2 flex items-center justify-between">
                                <Badge variant="secondary" className="w-fit">{book.category_name || 'Uncategorized'}</Badge>
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-xs">
                                    <Download className="h-3 w-3 mr-1" />
                                    {book.download_count || 0}
                                  </Badge>
                                  {favorites.has(String(book.id)) && (
                                    <div className="p-1 bg-red-100 rounded-full">
                                      <Heart className="h-3 w-3 text-red-500 fill-current" />
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="mt-4 mt-auto flex items-center justify-end gap-3">
                              <ThumbsRating
                                contentId={String(book.id)}
                                contentType="book"
                                initialUpVotes={book.up_votes ?? 0}
                                initialDownVotes={book.down_votes ?? 0}
                                initialUserVote={book.user_vote === 1 ? 1 : book.user_vote === -1 ? -1 : null}
                              />
                            </div>
                          </CardContent>
                        </>
                      ) : (
                        <>
                          <div className="w-full sm:w-40 flex-shrink-0">
                            <Thumbnail
                              src={book.thumbnail ?? (book as any).cover_image_path ?? undefined}
                              bookId={typeof book.id === 'number' ? book.id : Number(book.id) || undefined}
                              alt={book.title}
                              className="w-full h-40 sm:h-24 object-cover rounded-md"
                              fallback={'/placeholder.svg'}
                              loading="lazy"
                            />
                          </div>

                          <div className="flex-1">
                            <h3 className="text-lg sm:text-xl font-semibold break-words max-w-full line-clamp-2 mb-2">{book.title}</h3>
                            <p className="text-sm text-muted-foreground break-words mb-2">by {book.author}</p>

                            <div className="mb-2 flex items-center justify-between">
                              <Badge variant="secondary" className="w-fit">{book.category_name || 'Uncategorized'}</Badge>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">
                                  <Download className="h-3 w-3 mr-1" />
                                  {book.download_count || 0}
                                </Badge>
                                {favorites.has(String(book.id)) && (
                                  <div className="p-1 bg-red-100 rounded-full">
                                    <Heart className="h-3 w-3 text-red-500 fill-current" />
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex-shrink-0 self-start sm:self-center">
                            <ThumbsRating
                              contentId={String(book.id)}
                              contentType="book"
                              initialUpVotes={book.up_votes ?? 0}
                              initialDownVotes={book.down_votes ?? 0}
                              initialUserVote={book.user_vote === 1 ? 1 : book.user_vote === -1 ? -1 : null}
                            />
                          </div>
                        </>
                      )}
                    </Card>
                  ))}
                </div>

                <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-sm text-muted-foreground">
                    Showing {Math.min(total, start + 1)} - {Math.min(total, end)} of {total}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="ghost" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>

                    <div className="hidden sm:flex items-center gap-1">
                      {Array.from({ length: totalPages }).map((_, i) => {
                        const p = i + 1;
                        return (
                          <Button key={p} size="sm" variant={p === page ? "secondary" : "ghost"} onClick={() => setPage(p)}>
                            {p}
                          </Button>
                        );
                      })}
                    </div>

                    <Button size="sm" variant="ghost" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>

                    <div className="sm:hidden ml-2">
                      <select
                        value={pageSize}
                        onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                        className="rounded border bg-transparent px-2 py-1 text-sm"
                        aria-label="Items per page"
                      >
                        <option value={6}>6 / page</option>
                        <option value={12}>12 / page</option>
                        <option value={24}>24 / page</option>
                      </select>
                    </div>
                  </div>
                </div>
              </>
            )}
          </section>
        </div>
      </main>
      {/* Professional Book Preview Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedBook && (
            <>
              <DialogHeader className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-primary/10 rounded-full">
                      <BookOpen className="h-6 w-6 text-primary" />
                    </div>
                                         <div>
                       <DialogTitle className="text-2xl font-bold text-left">
                         {selectedBook.title}
                       </DialogTitle>
                       <div className="flex items-center gap-3 text-sm text-muted-foreground">
                         <span>by {selectedBook.author}</span>
                         {favorites.has(String(selectedBook.id)) && (
                           <span className="flex items-center gap-1 text-red-500">
                             <Heart className="h-3 w-3 fill-current" />
                             In favorites
                           </span>
                         )}
                       </div>
                     </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleModalClose}
                    className="h-8 w-8 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </DialogHeader>

              <div className="space-y-6">
                {/* Book Cover and Basic Info */}
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="flex-shrink-0">
                    <div className="relative group">
                      <Thumbnail
                        src={selectedBook.thumbnail ?? selectedBook.cover_image_path}
                        bookId={typeof selectedBook.id === 'number' ? selectedBook.id : Number(selectedBook.id)}
                        alt={`${selectedBook.title} cover`}
                        className="w-48 h-64 object-cover rounded-lg shadow-lg group-hover:shadow-xl transition-shadow duration-300"
                        fallback="/placeholder.svg"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 rounded-lg" />
                    </div>
                  </div>

                  <div className="flex-1 space-y-4">
                    {/* Book Type and Category */}
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary" className="px-3 py-1">
                        {selectedBook.category_name || 'Uncategorized'}
                      </Badge>
                      {selectedBook.book_type && (
                        <Badge className={`${getBookTypeInfo(selectedBook.book_type).color} px-3 py-1`}>
                          {getBookTypeInfo(selectedBook.book_type).label}
                        </Badge>
                      )}
                    </div>

                    {/* Book Stats */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center gap-2 text-sm">
                        <Download className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{selectedBook.download_count || 0}</span>
                        <span className="text-muted-foreground">downloads</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Eye className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Book Preview</span>
                      </div>
                    </div>

                    {/* Rating */}
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">Community Rating</p>
                      <ThumbsRating
                        contentId={String(selectedBook.id)}
                        contentType="book"
                        initialUpVotes={selectedBook.up_votes ?? 0}
                        initialDownVotes={selectedBook.down_votes ?? 0}
                        initialUserVote={selectedBook.user_vote === 1 ? 1 : selectedBook.user_vote === -1 ? -1 : null}
                      />
                    </div>

                                         {/* Action Buttons */}
                     <div className="flex flex-col sm:flex-row gap-3 pt-2">
                       <Button 
                         onClick={() => handleViewFullDetails(selectedBook)}
                         className="flex-1 sm:flex-none"
                       >
                         <BookOpen className="h-4 w-4 mr-2" />
                         View Full Details
                       </Button>
                       <Button 
                         variant="outline"
                         onClick={() => handleAddToFavorites(selectedBook)}
                         className="flex-1 sm:flex-none"
                       >
                         <Heart className={`h-4 w-4 mr-2 ${favorites.has(String(selectedBook.id)) ? 'text-red-500 fill-current' : ''}`} />
                         {favorites.has(String(selectedBook.id)) ? 'Remove from Favorites' : 'Add to Favorites'}
                       </Button>
                     </div>
                  </div>
                </div>

                <Separator />

                {/* Description Section */}
                {selectedBook.description && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-primary" />
                      <h3 className="text-lg font-semibold">Description</h3>
                    </div>
                    <div className="bg-muted/30 rounded-lg p-4">
                      <p className="text-foreground leading-relaxed">
                        {selectedBook.description.length > 300 
                          ? `${selectedBook.description.substring(0, 300)}...` 
                          : selectedBook.description
                        }
                      </p>
                      {selectedBook.description.length > 300 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewFullDetails(selectedBook)}
                          className="mt-3 text-primary hover:text-primary/80"
                        >
                          Read Full Description
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {/* Book Details Grid */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Star className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-semibold">Book Details</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-muted/30 rounded-lg p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Author</span>
                        <span className="text-sm text-muted-foreground ml-auto">{selectedBook.author}</span>
                      </div>
                      {selectedBook.category_name && (
                        <div className="flex items-center gap-2">
                          <div className="h-4 w-4 rounded-full bg-primary/20" />
                          <span className="text-sm font-medium">Category</span>
                          <span className="text-sm text-muted-foreground ml-auto">{selectedBook.category_name}</span>
                        </div>
                      )}
                      {selectedBook.book_type && (
                        <div className="flex items-center gap-2">
                          {selectedBook.book_type === 'file' && <FileText className="h-4 w-4 text-blue-600" />}
                          {selectedBook.book_type === 'link' && <Link className="h-4 w-4 text-green-600" />}
                          {selectedBook.book_type === 'purchase' && <ShoppingCart className="h-4 w-4 text-orange-600" />}
                          <span className="text-sm font-medium">Type</span>
                          <span className="text-sm text-muted-foreground ml-auto">
                            {getBookTypeInfo(selectedBook.book_type).label}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    <div className="bg-muted/30 rounded-lg p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <Download className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Downloads</span>
                        <span className="text-sm text-muted-foreground ml-auto">{selectedBook.download_count || 0}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Heart className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Rating</span>
                        <span className="text-sm text-muted-foreground ml-auto">
                          {selectedBook.up_votes || 0} likes
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Added</span>
                        <span className="text-sm text-muted-foreground ml-auto">Recently</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="h-5 w-5 rounded-full bg-primary/20" />
                    <h3 className="text-lg font-semibold">Quick Actions</h3>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => handleViewFullDetails(selectedBook)}
                    >
                      <BookOpen className="h-4 w-4 mr-2" />
                      Full Book Page
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => handleShareBook(selectedBook)}
                    >
                      <div className="h-4 w-4 mr-2">📤</div>
                      Share Book
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

export default Books;
