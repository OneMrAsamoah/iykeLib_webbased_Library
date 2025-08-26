import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Thumbnail from "@/components/ui/thumbnail";
import { ThumbsRating } from "@/components/ui/ThumbsRating";
import { Heart, ShoppingCart } from "lucide-react";

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
  isbn?: string | null;
  published_year?: number | null;
  page_count?: number | null;
  price?: number | null;
  currency?: string | null;
};

const BookPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [book, setBook] = useState<BackendBook | null>(null);
  const [recommendations, setRecommendations] = useState<BackendBook[]>([]);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Favorites state
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    if (id) {
      fetchBook(id);
      fetchRecommendations(id);
      // Load favorites from localStorage
      loadFavorites();
    }
  }, [id]);

  // Load favorites from localStorage
  const loadFavorites = () => {
    try {
      const stored = localStorage.getItem('bookFavorites');
      if (stored) {
        const favoritesArray = JSON.parse(stored) as string[];
        const favoritesSet = new Set(favoritesArray);
        setFavorites(favoritesSet);
        if (id) {
          setIsFavorite(favoritesSet.has(id));
        }
      }
    } catch (error) {
      console.error('Error loading favorites:', error);
    }
  };

  // Save favorites to localStorage
  const saveFavorites = (newFavorites: Set<string>) => {
    try {
      localStorage.setItem('bookFavorites', JSON.stringify(Array.from(newFavorites)));
    } catch (error) {
      console.error('Error saving favorites:', error);
    }
  };

  // Toggle favorite status
  const handleToggleFavorite = () => {
    if (!id) return;
    
    setFavorites(prev => {
      const newFavorites = new Set(prev);
      if (newFavorites.has(id)) {
        newFavorites.delete(id);
        setIsFavorite(false);
      } else {
        newFavorites.add(id);
        setIsFavorite(true);
      }
      saveFavorites(newFavorites);
      return newFavorites;
    });
  };

  // Share book functionality
  const handleShareBook = async () => {
    if (!book) return;

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
        alert('Book link copied to clipboard!');
      }
    } catch (error) {
      console.error('Error sharing book:', error);
      // Final fallback: copy to clipboard
      try {
        const shareText = `${book.title} by ${book.author}\n${shareData.url}`;
        await navigator.clipboard.writeText(shareText);
        alert('Book link copied to clipboard!');
      } catch (clipboardError) {
        console.error('Error copying to clipboard:', clipboardError);
        const shareText = `${book.title} by ${book.author}\n${shareData.url}`;
        alert(`Failed to copy to clipboard. Please copy manually:\n\n${shareText}`);
      }
    }
  };

  const fetchBook = async (bookId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/books/${bookId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch book');
      }
      const data = await response.json();
      setBook(data);
      // Check if this book is in favorites
      setIsFavorite(favorites.has(bookId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch book');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRecommendations = async (bookId: string) => {
    try {
      const response = await fetch(`/api/books?exclude=${bookId}&limit=4`);
      if (response.ok) {
        const data = await response.json();
        setRecommendations(data);
      }
    } catch (err) {
      console.error('Failed to fetch recommendations:', err);
    }
  };

  const handleActionClick = (book: BackendBook) => {
    if (book.book_type === 'file' && book.file_path) {
      // Handle file download
      window.open(book.file_path, '_blank');
    } else if (book.book_type === 'link' && book.external_link) {
      // Handle external link
      window.open(book.external_link, '_blank');
    } else if (book.book_type === 'purchase' && book.purchase_link) {
      // Handle purchase link
      window.open(book.purchase_link, '_blank');
    } else {
      // Fallback for unknown types
      console.log('No action available for this book type');
    }
  };

  const getActionButton = (book: BackendBook) => {
    if (book.book_type === 'file' && book.file_path) {
      return (
        <Button onClick={() => handleActionClick(book)} className="w-full">
          📥 Download Book
        </Button>
      );
    } else if (book.book_type === 'link' && book.external_link) {
      return (
        <Button onClick={() => handleActionClick(book)} className="w-full">
          🔗 Access Book
        </Button>
      );
         } else if (book.book_type === 'purchase' && book.purchase_link) {
       return (
         <Button onClick={() => handleActionClick(book)} className="w-full">
           <ShoppingCart className="h-4 w-4 mr-2" />
           Purchase Book
         </Button>
       );
    } else {
      return (
        <Button disabled className="w-full">
          No Action Available
        </Button>
      );
    }
  };

  const needsCollapsible = (description: string) => {
    return description.length > 300;
  };

  const formatDescription = (description: string) => {
    // Split by double newlines to preserve paragraph structure
    const paragraphs = description.split(/\n\n+/);
    return paragraphs.map((paragraph, index) => (
      <p key={index} className="text-foreground leading-relaxed">
        {paragraph.trim()}
      </p>
    ));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto max-w-6xl px-4 py-8">
          <div className="flex justify-center items-center min-h-[60vh]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading book details...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error || !book) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto max-w-6xl px-4 py-8">
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold mb-2">Book Not Found</h2>
            <p className="text-muted-foreground mb-6">
              {error || "The book you're looking for doesn't exist or has been removed."}
            </p>
            <Button onClick={() => navigate('/books')}>
              Back to Books
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto max-w-6xl px-4 py-8">
        {/* Breadcrumb Navigation */}
        <div className="mb-6">
          <nav className="flex items-center gap-2 text-sm text-muted-foreground">
            <button 
              onClick={() => navigate('/books')}
              className="hover:text-foreground transition-colors"
            >
              Books
            </button>
            <span>/</span>
            <span className="text-foreground font-medium">{book.title}</span>
          </nav>
        </div>

        {/* Main Book Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Book Cover and Basic Info */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-6">
              {/* Book Cover */}
              <div className="relative group">
                <Thumbnail 
                  src={book.thumbnail ?? book.cover_image_path ?? undefined} 
                  bookId={typeof book.id === 'number' ? book.id : Number(book.id) || undefined} 
                  alt={`${book.title} cover`} 
                  className="w-full max-w-sm mx-auto lg:mx-0 h-96 object-cover rounded-xl shadow-2xl group-hover:shadow-3xl transition-all duration-300" 
                  fallback="/placeholder.svg"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-300 rounded-xl" />
              </div>

              {/* Quick Actions */}
              <div className="space-y-3">
                <Button 
                  onClick={() => handleActionClick(book)}
                  className="w-full h-12 text-lg font-medium"
                  size="lg"
                >
                  {getActionButton(book).props.children}
                </Button>
                
                <div className="flex gap-2">
                                       <Button 
                       variant="outline" 
                       className="flex-1"
                       onClick={handleToggleFavorite}
                     >
                       <Heart className={`h-4 w-4 mr-2 ${isFavorite ? 'text-red-500 fill-current' : 'text-muted-foreground'}`} />
                       {isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
                     </Button>
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={handleShareBook}
                  >
                    <div className="h-4 w-4 mr-2">📤</div>
                    Share
                  </Button>
                </div>
              </div>

              {/* Book Stats */}
              <div className="bg-muted/30 rounded-xl p-4 space-y-3">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Book Statistics</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Downloads</span>
                    <span className="font-medium">{book.download_count || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Rating</span>
                    <span className="font-medium">{book.up_votes || 0} likes</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Type</span>
                    <Badge variant="outline" className="text-xs">
                      {book.book_type === 'file' ? 'File Download' : 
                       book.book_type === 'link' ? 'External Link' : 
                       book.book_type === 'purchase' ? 'Purchase Required' : 'Unknown'}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Book Details */}
          <div className="lg:col-span-2 space-y-8">
            {/* Header Section */}
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <h1 className="text-4xl font-bold leading-tight">{book.title}</h1>
                  <p className="text-xl text-muted-foreground">by {book.author}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="px-3 py-1 text-sm">
                    {book.category_name || 'Uncategorized'}
                  </Badge>
                  {book.book_type && (
                    <Badge className={`${
                      book.book_type === 'file' ? 'bg-blue-100 text-blue-800' :
                      book.book_type === 'link' ? 'bg-green-100 text-green-800' :
                      'bg-orange-100 text-orange-800'
                    } px-3 py-1 text-sm`}>
                      {book.book_type === 'file' ? 'File Download' : 
                       book.book_type === 'link' ? 'External Link' : 
                       book.book_type === 'purchase' ? 'Purchase Required' : 'Unknown'}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Community Rating */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground">Community Rating:</span>
                  <ThumbsRating
                    contentId={String(book.id)}
                    contentType="book"
                    initialUpVotes={book.up_votes ?? 0}
                    initialDownVotes={book.down_votes ?? 0}
                    initialUserVote={book.user_vote === 1 ? 1 : book.user_vote === -1 ? -1 : null}
                  />
                </div>
              </div>
            </div>

            {/* Description Section */}
            {book.description && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-semibold">Description</h2>
                </div>
                
                <div className="bg-muted/30 rounded-xl p-6">
                  <div className={`space-y-4 ${needsCollapsible(book.description || '') && !isDescriptionExpanded ? 'max-h-96 overflow-hidden' : ''}`}>
                    {formatDescription(book.description || '')}
                  </div>
                  
                  {needsCollapsible(book.description || '') && (
                    <div className="mt-4 pt-4 border-t border-muted-foreground/20">
                      <Button
                        variant="ghost"
                        onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                        className="text-primary hover:text-primary/80"
                      >
                        {isDescriptionExpanded ? 'Show Less' : 'Show More'}
                        <svg 
                          className={`w-4 h-4 ml-2 transition-transform ${isDescriptionExpanded ? 'rotate-180' : ''}`} 
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Book Details Grid */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-semibold">Book Details</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-muted/30 rounded-xl p-6 space-y-4">
                  <h3 className="font-semibold text-lg mb-4">Basic Information</h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <span className="text-sm font-medium text-muted-foreground">Author</span>
                        <p className="font-medium">{book.author}</p>
                      </div>
                    </div>
                    
                    {book.category_name && (
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 rounded-lg">
                          <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <span className="text-sm font-medium text-muted-foreground">Category</span>
                          <p className="font-medium">{book.category_name}</p>
                        </div>
                      </div>
                    )}
                    
                    {book.isbn && (
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 rounded-lg">
                          <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <span className="text-sm font-medium text-muted-foreground">ISBN</span>
                          <p className="font-medium">{book.isbn}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="bg-muted/30 rounded-xl p-6 space-y-4">
                  <h3 className="font-semibold text-lg mb-4">Publication Details</h3>
                  <div className="space-y-3">
                    {book.published_year && (
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-100 rounded-lg">
                          <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <span className="text-sm font-medium text-muted-foreground">Published Year</span>
                          <p className="font-medium">{book.published_year}</p>
                        </div>
                      </div>
                    )}
                    
                    {book.page_count && (
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-100 rounded-lg">
                          <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <span className="text-sm font-medium text-muted-foreground">Page Count</span>
                          <p className="font-medium">{book.page_count} pages</p>
                        </div>
                      </div>
                    )}
                    
                    {book.price && (
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 rounded-lg">
                          <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <span className="text-sm font-medium text-muted-foreground">Price</span>
                          <p className="font-medium">{book.currency || 'USD'} {book.price}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Action Section */}
            <div className="bg-gradient-to-r from-primary/5 to-primary/10 rounded-xl p-6 border border-primary/20">
              <div className="text-center space-y-4">
                <h3 className="text-xl font-semibold">Ready to get this book?</h3>
                <p className="text-muted-foreground">Click the button above to download, access, or purchase this book.</p>
                <div className="flex justify-center gap-3">
                  <Button 
                    onClick={() => handleActionClick(book)}
                    size="lg"
                    className="px-8"
                  >
                    {getActionButton(book).props.children}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="lg"
                    onClick={() => navigate('/books')}
                  >
                    Browse More Books
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recommendations Section */}
        {recommendations.length > 0 && (
          <section className="mt-16">
            <div className="border-t border-muted-foreground/10 pt-8">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold mb-2">You might also like</h2>
                <p className="text-muted-foreground text-lg">
                  Discover more books based on your interests
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {recommendations.map((recBook) => (
                  <div key={recBook.id} className="group hover:shadow-xl transition-all duration-300 cursor-pointer" onClick={() => navigate(`/books/${recBook.id}`)}>
                    <div className="p-4">
                      <div className="space-y-4">
                        <div className="aspect-[3/4] bg-muted rounded-lg overflow-hidden">
                          <Thumbnail 
                            src={recBook.thumbnail ?? recBook.cover_image_path} 
                            bookId={typeof recBook.id === 'number' ? recBook.id : Number(recBook.id) || undefined} 
                            alt={`${recBook.title} cover`} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                            fallback="/placeholder.svg"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <h3 className="font-semibold text-base leading-tight group-hover:text-primary transition-colors line-clamp-2">
                            {recBook.title}
                          </h3>
                          <p className="text-sm text-muted-foreground">by {recBook.author}</p>
                          
                          <div className="flex items-center justify-between">
                            <Badge variant="secondary" className="text-xs">
                              {recBook.category_name || 'Uncategorized'}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              📥 {recBook.download_count || 0}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="text-center mt-8">
                <Button variant="outline" size="lg" onClick={() => navigate('/books')}>
                  View All Books
                </Button>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

export default BookPage;
