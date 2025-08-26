import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Plus, Edit, Trash2, BookOpen, Star, Download, List, Grid3X3, Search, Tag, Link, ShoppingCart, FileText, Loader, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useNavigate } from 'react-router-dom';
import { FileUpload } from '@/components/ui/file-upload';
import { DeleteConfirmDialog } from '@/components/ui/confirm-dialog';
import { ThumbsRating } from '@/components/ui/ThumbsRating';
import { generateThumbnail as apiGenerateThumbnail, scrapeCover, updateBookThumbnail } from '@/lib/api';

interface Book {
  id: string;
  title: string;
  author: string;
  description: string | null;
  book_type: 'file' | 'link' | 'purchase';
  cover_image_path: string | null;
  file_path: string | null;
  file_size: number | null;
  file_type: string | null;
  external_link: string | null;
  purchase_link: string | null;
  price: number | null;
  currency: string | null;
  category_id: string | null;
  isbn: string | null;
  published_year: number | null;
  page_count: number | null;
  categories?: { name: string } | null;
  download_count?: number;
  up_votes?: number;
  down_votes?: number;
  user_vote?: -1 | 1 | null;
}

interface Category {
  id: string;
  name: string;
}

type SortField = 'title' | 'author' | 'category' | 'type' | 'isbn' | 'published_year' | 'page_count';
type SortDirection = 'asc' | 'desc';

export default function BooksManager() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [books, setBooks] = useState<Book[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dbConnected, setDbConnected] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'cards'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; book: Book | null }>({
    open: false,
    book: null
  });
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage] = useState(6);
  
  // Sorting state
  const [sortField, setSortField] = useState<SortField>('title');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [thumbnailVersion, setThumbnailVersion] = useState(1);
  
  const [formData, setFormData] = useState({
    title: '',
    author: '',
    description: '',
    book_type: 'file' as 'file' | 'link' | 'purchase',
    cover_image_path: '',
    file_path: '',
    external_link: '',
    purchase_link: '',
    price: '',
    currency: 'USD',
    category_id: '',
    isbn: '',
    published_year: '',
    page_count: ''
  });
  const [fileData, setFileData] = useState<{
    content: string;
    size: number;
    type: string;
  } | null>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedCoverFile, setSelectedCoverFile] = useState<File | null>(null);
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    checkDatabaseConnection();
    fetchBooks();
    fetchCategories();
  }, []);

  // Reset to first page when search or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCategory]);

  // Debug: Log form data changes
  useEffect(() => {
    console.log('Form data changed:', {
      book_type: formData.book_type,
      file_path: formData.file_path,
      external_link: formData.external_link,
      purchase_link: formData.purchase_link
    });
  }, [formData.book_type, formData.file_path, formData.external_link, formData.purchase_link]);

  const checkDatabaseConnection = async () => {
    try {
      const response = await fetch('/api/books');
      setDbConnected(response.ok);
    } catch (error) {
      setDbConnected(false);
      console.error('Database connection check failed:', error);
    }
  };

  const fetchBooks = async () => {
    try {
      // First try to fetch from admin endpoint, fallback to public endpoint
      let response = await fetch('/api/admin/books');
      if (!response.ok) {
        // Fallback to public endpoint
        response = await fetch('/api/books');
        if (!response.ok) {
          throw new Error('Failed to fetch books');
        }
      }
      const data = await response.json();
      
      // Handle both array and object responses
      const booksData = Array.isArray(data) ? data : (data.books || []);
      
      // Transform the data to match our Book interface
      const transformedBooks: Book[] = booksData.map((book: any) => ({
        id: book.id.toString(),
        title: book.title,
        author: book.author,
        description: book.description,
        book_type: book.book_type || 'file',
        cover_image_path: book.cover_image_path,
        file_path: book.file_path,
        file_size: book.file_size,
        file_type: book.file_type,
        external_link: book.external_link,
        purchase_link: book.purchase_link,
        price: book.price,
        currency: book.currency,
        category_id: book.category_id?.toString(),
        isbn: book.isbn,
        published_year: book.published_year,
        page_count: book.page_count,
        categories: book.category_name ? { name: book.category_name } : null,
        download_count: book.download_count,
        up_votes: book.up_votes,
        down_votes: book.down_votes,
        user_vote: book.user_vote
      }));
      
      setBooks(transformedBooks);
    } catch (error) {
      console.error('Error fetching books:', error);
      toast({
        title: "Error",
        description: "Failed to fetch books. Please check if the server is running and database is connected.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories');
      if (!response.ok) {
        throw new Error('Failed to fetch categories');
      }
      const data = await response.json();
      
      // Transform the data to match our Category interface
      const transformedCategories: Category[] = data.map((category: any) => ({
        id: category.id.toString(),
        name: category.name
      }));
      
      setCategories(transformedCategories);
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast({
        title: "Error",
        description: "Failed to fetch categories. Please check if the server is running and database is connected.",
        variant: "destructive"
      });
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      author: '',
      description: '',
      book_type: 'file',
      cover_image_path: '',
      file_path: '',
      external_link: '',
      purchase_link: '',
      price: '',
      currency: 'USD',
      category_id: '',
      isbn: '',
      published_year: '',
      page_count: ''
    });
    setFileData(null);
    setSelectedFile(null);
    setSelectedCoverFile(null);
    setEditingBook(null);
  };

  const handleEdit = (book: Book) => {
    setEditingBook(book);
    setSelectedFile(null); // Clear selected file when editing
    setSelectedCoverFile(null);
    setFormData({
      title: book.title,
      author: book.author,
      description: book.description || '',
      book_type: book.book_type || 'file',
      cover_image_path: book.cover_image_path || '',
      file_path: book.file_path || '',
      external_link: book.external_link || '',
      purchase_link: book.purchase_link || '',
      price: book.price?.toString() || '',
      currency: book.currency || 'USD',
      category_id: book.category_id || '',
      isbn: book.isbn || '',
      published_year: book.published_year?.toString() || '',
      page_count: book.page_count?.toString() || ''
    });
    setShowDialog(true);
  };

  const openBookFile = (book: Book) => {
    // Prefer direct file_path when available (local uploads or external URLs)
    if (book.file_path) {
      // If it's an S3-like path (s3://) we can't open directly in browser; fall back to download endpoint
      if (String(book.file_path).startsWith('s3://')) {
        window.open(`/api/books/${book.id}/download`, '_blank');
        return;
      }

      // If it's an absolute URL or a server-served path (e.g. /uploads/...), open directly
      if (String(book.file_path).startsWith('http') || String(book.file_path).startsWith('/')) {
        window.open(book.file_path, '_blank');
        return;
      }

      // Fallback: try opening the file_path as-is, otherwise use the download endpoint
      try {
        window.open(book.file_path, '_blank');
      } catch (e) {
        window.open(`/api/books/${book.id}/download`, '_blank');
      }
      return;
    }

    // No file_path: fall back to existing download endpoint
    window.open(`/api/books/${book.id}/download`, '_blank');
  };

  const openBookLink = (book: Book) => {
    if (book.external_link) {
      window.open(book.external_link, '_blank');
    }
  };

  const openPurchaseLink = (book: Book) => {
    if (book.purchase_link) {
      window.open(book.purchase_link, '_blank');
    }
  };

  const generateThumbnail = async (book: Book) => {
    if (!user?.email) {
      toast({ title: "Authentication Error", description: "Please log in to perform this action.", variant: "destructive" });
      return;
    }

    const { id: toastId } = toast({
      title: "Generating Thumbnail...",
      description: `Processing "${book.title}". This may take a moment.`,
    });

    try {
      let thumbnailPath = null;
      
      if (book.book_type === 'purchase' && book.purchase_link) {
        // Try to extract cover from purchase link
        const response = await scrapeCover(book.purchase_link, user.email);
        const data = await response.json();
        thumbnailPath = data.coverUrl;
      } else if (book.book_type === 'link' && book.external_link) {
        // Try to extract cover from external link
        const response = await scrapeCover(book.external_link, user.email);
        const data = await response.json();
        thumbnailPath = data.coverUrl;
      } else if (book.book_type === 'file' && book.file_path) {
        // Generate thumbnail from uploaded file
        const response = await apiGenerateThumbnail(book.file_path, undefined, user.email);
        const data = await response.json();
        thumbnailPath = data.thumbnailPath;
      }
      
      if (thumbnailPath) {
        // Update the book with the new thumbnail
        await updateBookThumbnail(book.id, thumbnailPath);
        // Refresh the books list
        fetchBooks();
        toast({
          title: "Success",
          description: "Thumbnail generated successfully!",
        });
      }
    } catch (error) {
      console.error('Failed to generate thumbnail:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An unknown error occurred.",
        variant: "destructive"
      });
    }
  };



  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      
      // Get the current user's email from auth context
      if (!user?.email) {
        toast({
          title: "Error",
          description: "User not authenticated",
          variant: "destructive"
        });
        return;
      }

      let uploadedFilePath = formData.book_type === 'file' ? formData.file_path : null;

      // If we have a selected file, upload it first
      if (selectedFile) {
        try {
          const formData = new FormData();
          formData.append('file', selectedFile);
          formData.append('userEmail', user.email);

          const uploadResponse = await fetch('/api/admin/upload-file', {
            method: 'POST',
            body: formData
          });

          if (!uploadResponse.ok) {
            const errorData = await uploadResponse.json();
            throw new Error(errorData.error || 'Failed to upload file');
          }

          const uploadResult = await uploadResponse.json();
          uploadedFilePath = uploadResult.filePath;
        } catch (uploadError) {
          console.error('Error uploading file:', uploadError);
          toast({
            title: "Error",
            description: uploadError instanceof Error ? uploadError.message : "Failed to upload file",
            variant: "destructive"
          });
          return;
        }
      } else if (formData.book_type === 'file' && !formData.file_path) {
        // No file selected and no existing file path for file type books
        toast({
          title: "Error",
          description: "Please select a book file to upload",
          variant: "destructive"
        });
        return;
      }

      // If a cover image file is selected, convert to base64 and include in payload
      let coverBase64: string | null = null;
      let coverMimeType: string | null = null;
      if (selectedCoverFile) {
        try {
          coverMimeType = selectedCoverFile.type || null;
          coverBase64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              const result = reader.result as string;
              const base64 = result.split(',')[1];
              resolve(base64);
            };
            reader.onerror = (e) => reject(new Error('Failed to read cover image file'));
            reader.readAsDataURL(selectedCoverFile);
          });
        } catch (coverError) {
          console.error('Error processing cover image:', coverError);
          toast({ title: 'Error', description: coverError instanceof Error ? coverError.message : 'Failed to process cover image', variant: 'destructive' });
          return;
        }
      }

      const bookData = {
        title: formData.title,
        author: formData.author,
        description: formData.description || null,
        book_type: formData.book_type,
        cover_image_path: formData.cover_image_path || null,
        cover_image_base64: coverBase64,
        cover_image_type: coverMimeType,
        file_path: formData.book_type === 'file' ? uploadedFilePath : null,
        file_content: formData.book_type === 'file' ? (fileData?.content || null) : null,
        file_size: formData.book_type === 'file' ? (fileData?.size || selectedFile?.size || null) : null,
        file_type: formData.book_type === 'file' ? (fileData?.type || selectedFile?.type || null) : null,
        external_link: formData.book_type === 'link' ? formData.external_link : null,
        purchase_link: formData.book_type === 'purchase' ? formData.purchase_link : null,
        price: formData.book_type === 'purchase' ? (formData.price ? parseFloat(formData.price) : null) : null,
        currency: formData.book_type === 'purchase' ? formData.currency : null,
        category_id: formData.category_id,
        isbn: formData.isbn || null,
        published_year: formData.published_year ? parseInt(formData.published_year) : null,
        page_count: formData.page_count ? parseInt(formData.page_count) : null
      };

      // Debug logging
      console.log('Submitting book data:', {
        book_type: formData.book_type,
        file_path: bookData.file_path,
        external_link: bookData.external_link,
        purchase_link: bookData.purchase_link,
        price: bookData.price,
        currency: bookData.currency
      });

      let response;
      if (editingBook) {
        // Update existing book
        response = await fetch(`/api/admin/books/${editingBook.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'x-user-email': user.email
          },
          body: JSON.stringify(bookData)
        });
      } else {
        // Create new book
        response = await fetch('/api/admin/books', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-email': user.email
          },
          body: JSON.stringify(bookData)
        });
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save book');
      }

      const savedBook = await response.json();
      
      toast({
        title: "Success",
        description: editingBook ? "Book updated successfully" : "Book created successfully"
      });

      setShowDialog(false);
      resetForm();
      fetchBooks();
      setThumbnailVersion(v => v + 1);
    } catch (error) {
      console.error('Error saving book:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save book",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (bookId: string) => {
    try {
      // Get the current user's email from auth context
      if (!user?.email) {
        toast({
          title: "Error",
          description: "User not authenticated",
          variant: "destructive"
        });
        return;
      }

      const response = await fetch(`/api/admin/books/${bookId}`, {
        method: 'DELETE',
        headers: {
          'x-user-email': user.email
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete book');
      }

      toast({
        title: "Success",
        description: "Book deleted successfully"
      });

      fetchBooks();
    } catch (error) {
      console.error('Error deleting book:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete book",
        variant: "destructive"
      });
    }
  };

  const openDeleteDialog = (book: Book) => {
    setDeleteDialog({ open: true, book });
  };

  const closeDeleteDialog = () => {
    setDeleteDialog({ open: false, book: null });
  };

  const confirmDelete = async () => {
    if (deleteDialog.book) {
      await handleDelete(deleteDialog.book.id);
      closeDeleteDialog();
    }
  };

  const getBookTypeInfo = (bookType: string) => {
    switch (bookType) {
      case 'file':
        return { icon: FileText, label: 'File', color: 'bg-blue-100 text-blue-800' };
      case 'link':
        return { icon: Link, label: 'Link', color: 'bg-green-100 text-green-800' };
      case 'purchase':
        return { icon: ShoppingCart, label: 'Purchase', color: 'bg-orange-100 text-orange-800' };
      default:
        return { icon: FileText, label: 'Unknown', color: 'bg-gray-100 text-gray-800' };
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // If clicking the same field, toggle direction
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // If clicking a new field, set it as sort field and default to asc
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1); // Reset to first page when sorting
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ChevronsUpDown className="h-4 w-4" />;
    }
    return sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />;
  };

  const sortBooks = (booksToSort: Book[]) => {
    return [...booksToSort].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'title':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case 'author':
          aValue = a.author.toLowerCase();
          bValue = b.author.toLowerCase();
          break;
        case 'category':
          aValue = a.categories?.name?.toLowerCase() || '';
          bValue = b.categories?.name?.toLowerCase() || '';
          break;
        case 'type':
          aValue = a.book_type || '';
          bValue = b.book_type || '';
          break;
        case 'isbn':
          aValue = a.isbn || '';
          bValue = b.isbn || '';
          break;
        case 'published_year':
          aValue = a.published_year || 0;
          bValue = b.published_year || 0;
          break;
        case 'page_count':
          aValue = a.page_count || 0;
          bValue = b.page_count || 0;
          break;
        default:
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        if (sortDirection === 'asc') {
          return aValue.localeCompare(bValue);
        } else {
          return bValue.localeCompare(aValue);
        }
      } else {
        if (sortDirection === 'asc') {
          return aValue - bValue;
        } else {
          return bValue - aValue;
        }
      }
    });
  };

  // Filter books based on search and category
  const filteredBooks = books.filter(book => {
    const matchesSearch = book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         book.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (book.isbn && book.isbn.includes(searchTerm));
    const matchesCategory = selectedCategory === 'all' || !selectedCategory || book.category_id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Sort filtered books
  const sortedBooks = sortBooks(filteredBooks);

  // Pagination calculations
  const totalPages = Math.ceil(sortedBooks.length / recordsPerPage);
  const startIndex = (currentPage - 1) * recordsPerPage;
  const endIndex = startIndex + recordsPerPage;
  const currentBooks = sortedBooks.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center p-8">Loading books...</div>;
  }

  if (!dbConnected) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold">Books Management</h2>
            <p className="text-muted-foreground">Manage your library collection</p>
            <div className="flex items-center gap-2 mt-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span className="text-sm text-red-600">Database Disconnected</span>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={checkDatabaseConnection}
                className="ml-2"
              >
                Retry Connection
              </Button>
            </div>
          </div>
        </div>
        
        <div className="border rounded-lg p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold mb-2">Database Connection Failed</h3>
          <p className="text-muted-foreground mb-4">
            Unable to connect to the database. Please check:
          </p>
          <ul className="text-sm text-muted-foreground text-left max-w-md mx-auto space-y-1">
            <li>• XAMPP MySQL service is running</li>
            <li>• Database 'ghana_code_library' exists</li>
            <li>• Server is running on port 5000</li>
            <li>• Environment variables are configured</li>
          </ul>
          <div className="mt-6 space-x-3">
            <Button onClick={checkDatabaseConnection}>
              Retry Connection
            </Button>
            <Button variant="outline" onClick={() => window.location.reload()}>
              Refresh Page
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Books Management</h2>
          <p className="text-muted-foreground">Manage your library collection</p>
          <div className="flex items-center gap-2 mt-2">
            <div className={`w-3 h-3 rounded-full ${dbConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className={`text-sm ${dbConnected ? 'text-green-600' : 'text-red-600'}`}>
              {dbConnected ? 'Database Connected' : 'Database Disconnected'}
            </span>
            {!dbConnected && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={checkDatabaseConnection}
                className="ml-2"
              >
                Retry Connection
              </Button>
            )}
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Button variant="outline" onClick={() => navigate('/admin/categories')}>
            <Tag className="h-4 w-4 mr-2" />
            Manage Categories
          </Button>
          <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogTrigger asChild>
              <Button onClick={() => { resetForm(); setShowDialog(true); }}>
                <Plus className="h-4 w-4 mr-2" />
                Add Book
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader className="space-y-3">
                <DialogTitle className="text-2xl font-bold flex items-center gap-3">
                  <BookOpen className="h-6 w-6 text-primary" />
                  {editingBook ? 'Edit Book' : 'Add New Book'}
                </DialogTitle>
                <p className="text-muted-foreground text-sm">
                  {editingBook ? 'Update the book information below' : 'Fill in the details to add a new book to your library'}
                </p>
              </DialogHeader>
              
              <div className="space-y-8">
                {/* Basic Information Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b">
                    <FileText className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-semibold">Basic Information</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="title" className="text-sm font-medium">
                        Book Title <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="title"
                        value={formData.title}
                        onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="Enter book title"
                        className="h-11"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="author" className="text-sm font-medium">
                        Author <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="author"
                        value={formData.author}
                        onChange={(e) => setFormData(prev => ({ ...prev, author: e.target.value }))}
                        placeholder="Enter author name"
                        className="h-11"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="category" className="text-sm font-medium">
                        Category <span className="text-red-500">*</span>
                      </Label>
                      <Select value={formData.category_id} onValueChange={(value) => setFormData(prev => ({ ...prev, category_id: value }))}>
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="book_type" className="text-sm font-medium">
                        Book Type <span className="text-red-500">*</span>
                      </Label>
                      <Select value={formData.book_type} onValueChange={(value: 'file' | 'link' | 'purchase') => {
                        setFormData(prev => {
                          const newData = { ...prev, book_type: value };
                          // Clear irrelevant fields when book type changes
                          if (value === 'file') {
                            newData.external_link = '';
                            newData.purchase_link = '';
                            newData.price = '';
                          } else if (value === 'link') {
                            newData.file_path = '';
                            newData.purchase_link = '';
                            newData.price = '';
                          } else if (value === 'purchase') {
                            newData.file_path = '';
                            newData.external_link = '';
                          }
                          return newData;
                        });
                      }}>
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder="Select book type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="file">
                            <div className="flex items-center gap-3 py-1">
                              <div className="p-2 bg-blue-100 rounded-lg">
                                <FileText className="h-4 w-4 text-blue-600" />
                              </div>
                              <div>
                                <div className="font-medium">File Upload</div>
                                <div className="text-xs text-muted-foreground">Free download</div>
                              </div>
                            </div>
                          </SelectItem>
                          <SelectItem value="link">
                            <div className="flex items-center gap-3 py-1">
                              <div className="p-2 bg-green-100 rounded-lg">
                                <Link className="h-4 w-4 text-green-600" />
                              </div>
                              <div>
                                <div className="font-medium">External Link</div>
                                <div className="text-xs text-muted-foreground">Free access</div>
                              </div>
                            </div>
                          </SelectItem>
                          <SelectItem value="purchase">
                            <div className="flex items-center gap-3 py-1">
                              <div className="p-2 bg-orange-100 rounded-lg">
                                <ShoppingCart className="h-4 w-4 text-orange-600" />
                              </div>
                              <div>
                                <div className="font-medium">Purchase Required</div>
                                <div className="text-xs text-muted-foreground">Paid content</div>
                              </div>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Book Type Specific Fields */}
                {formData.book_type === 'file' && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b">
                      <Download className="h-5 w-5 text-blue-600" />
                      <h3 className="text-lg font-semibold text-blue-700">File Upload</h3>
                    </div>
                    
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <FileUpload
                        label="Book File"
                        description="Upload PDF, DOC, or other book formats. Maximum file size: 50MB"
                        accept=".pdf,.doc,.docx,.txt,.epub"
                        maxSize={50}
                        value={formData.file_path}
                        onChange={(value) => setFormData(prev => ({ ...prev, file_path: value }))}
                        onFileData={setFileData}
                        onFileSelect={(file) => setSelectedFile(file)}
                        uploadMode={true}
                        required
                      />
                    </div>
                  </div>
                )}

                {formData.book_type === 'link' && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b">
                      <Link className="h-5 w-5 text-green-600" />
                      <h3 className="text-lg font-semibold text-green-700">External Link</h3>
                    </div>
                    
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="space-y-2">
                        <Label htmlFor="external_link" className="text-sm font-medium">
                          External Link <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="external_link"
                          value={formData.external_link}
                          onChange={(e) => setFormData(prev => ({ ...prev, external_link: e.target.value }))}
                          placeholder="https://example.com/book.pdf"
                          type="url"
                          className="h-11"
                        />
                        <p className="text-xs text-muted-foreground">
                          Direct link to the book (PDF, webpage, etc.)
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {formData.book_type === 'purchase' && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b">
                      <ShoppingCart className="h-5 w-5 text-orange-600" />
                      <h3 className="text-lg font-semibold text-orange-700">Purchase Information</h3>
                    </div>
                    
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="purchase_link" className="text-sm font-medium">
                          Purchase Link <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="purchase_link"
                          value={formData.purchase_link}
                          onChange={(e) => setFormData(prev => ({ ...prev, purchase_link: e.target.value }))}
                          placeholder="https://amazon.com/book-link"
                          type="url"
                          className="h-11"
                        />
                        <p className="text-xs text-muted-foreground">
                          Link where users can purchase the book
                        </p>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="price" className="text-sm font-medium">Price</Label>
                          <Input
                            id="price"
                            type="number"
                            step="0.01"
                            min="0"
                            value={formData.price}
                            onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                            placeholder="29.99"
                            className="h-11"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="currency" className="text-sm font-medium">Currency</Label>
                          <Select value={formData.currency} onValueChange={(value) => setFormData(prev => ({ ...prev, currency: value }))}>
                            <SelectTrigger className="h-11">
                              <SelectValue placeholder="USD" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="USD">USD ($)</SelectItem>
                              <SelectItem value="EUR">EUR (€)</SelectItem>
                              <SelectItem value="GBP">GBP (£)</SelectItem>
                              <SelectItem value="GHS">GHS (₵)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Cover Image Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <div className="w-5 h-5 bg-purple-600 rounded"></div>
                    </div>
                    <h3 className="text-lg font-semibold text-purple-700">Cover Image</h3>
                  </div>
                  
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Cover Image (Optional)</Label>
                        <p className="text-xs text-muted-foreground">
                          Upload a cover image to use as the book thumbnail. If left empty, the system will attempt to auto-generate one.
                        </p>
                      </div>
                      
                      <FileUpload
                        label="Upload Cover Image"
                        description="Supports JPG, PNG, GIF. Max 5MB"
                        accept="image/*"
                        maxSize={5}
                        value={formData.cover_image_path}
                        onChange={(value) => setFormData(prev => ({ ...prev, cover_image_path: value }))}
                        onFileSelect={(file) => setSelectedCoverFile(file)}
                        uploadMode={false}
                      />
                      
                      {editingBook && (
                        <div className="mt-4 p-4 bg-white rounded-lg border">
                          <Label className="text-sm font-medium mb-3 block">Current Cover</Label>
                          <div className="flex items-center gap-4">
                            <div className="w-24 h-36 bg-muted rounded-lg overflow-hidden border">
                              <img
                                src={`/api/books/${editingBook.id}/thumbnail?v=${thumbnailVersion}`}
                                alt="Current cover"
                                className="w-full h-full object-cover"
                                onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src="/placeholder.svg"; }}
                              />
                            </div>
                            <div className="flex-1">
                              <p className="text-sm text-muted-foreground mb-2">
                                Current cover image. Upload a new one above to replace it.
                              </p>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setThumbnailVersion(prev => prev + 1)}
                              >
                                Refresh Preview
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Additional Information Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      <div className="w-5 h-5 bg-gray-600 rounded"></div>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-700">Additional Information</h3>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="description" className="text-sm font-medium">Description</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Enter a detailed description of the book..."
                        rows={4}
                        className="resize-none"
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="isbn" className="text-sm font-medium">ISBN</Label>
                        <Input
                          id="isbn"
                          value={formData.isbn}
                          onChange={(e) => setFormData(prev => ({ ...prev, isbn: e.target.value }))}
                          placeholder="ISBN number"
                          className="h-11"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="published_year" className="text-sm font-medium">Published Year</Label>
                        <Input
                          id="published_year"
                          type="number"
                          value={formData.published_year}
                          onChange={(e) => setFormData(prev => ({ ...prev, published_year: e.target.value }))}
                          placeholder="Year"
                          className="h-11"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="page_count" className="text-sm font-medium">Page Count</Label>
                        <Input
                          id="page_count"
                          type="number"
                          value={formData.page_count}
                          onChange={(e) => setFormData(prev => ({ ...prev, page_count: e.target.value }))}
                          placeholder="Pages"
                          className="h-11"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-6 border-t">
                <Button 
                  variant="outline" 
                  onClick={() => setShowDialog(false)}
                  className="px-6"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleSubmit} 
                  disabled={
                    isSubmitting ||
                    !formData.title || 
                    !formData.author || 
                    !formData.category_id || 
                    (formData.book_type === 'file' && !formData.file_path) ||
                    (formData.book_type === 'link' && !formData.external_link) ||
                    (formData.book_type === 'purchase' && !formData.purchase_link)
                  }
                  className="px-6"
                >
                  {isSubmitting ? (
                    <>
                      <Loader className="mr-2 h-4 w-4 animate-spin" />
                      {editingBook ? 'Updating...' : 'Creating...'}
                    </>
                  ) : (
                    editingBook ? 'Update Book' : 'Create Book'
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search and Filter Section */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search books by title, author, or ISBN..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center border rounded-md">
          <Button
            variant={viewMode === 'list' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('list')}
            className="rounded-r-none"
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'cards' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('cards')}
            className="rounded-l-none"
          >
            <Grid3X3 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Results Summary */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="text-sm text-muted-foreground">
          Showing {startIndex + 1}-{Math.min(endIndex, sortedBooks.length)} of {sortedBooks.length} books
        </div>
        
        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={goToPreviousPage}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            
            <div className="flex items-center space-x-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                
                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? "default" : "outline"}
                    size="sm"
                    onClick={() => goToPage(pageNum)}
                    className="w-8 h-8 p-0"
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={goToNextPage}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        )}
      </div>

      {/* List View */}
      {viewMode === 'list' && (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('title')}
                >
                  <div className="flex items-center gap-2">
                    Book
                    {getSortIcon('title')}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('author')}
                >
                  <div className="flex items-center gap-2">
                    Author
                    {getSortIcon('author')}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('category')}
                >
                  <div className="flex items-center gap-2">
                    Category
                    {getSortIcon('category')}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('type')}
                >
                  <div className="flex items-center gap-2">
                    Type
                    {getSortIcon('type')}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('isbn')}
                >
                  <div className="flex items-center gap-2">
                    ISBN
                    {getSortIcon('isbn')}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('published_year')}
                >
                  <div className="flex items-center gap-2">
                    Year
                    {getSortIcon('published_year')}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('page_count')}
                >
                  <div className="flex items-center gap-2">
                    Pages
                    {getSortIcon('page_count')}
                  </div>
                </TableHead>
                                 <TableHead className="w-20">Downloads</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentBooks.map((book) => (
                <TableRow key={book.id}>
                  <TableCell className="h-20">
                    <div className="flex items-start space-x-3">
                      <div className="w-12 h-12 bg-muted rounded flex items-center justify-center flex-shrink-0">
                        <img
                          src={`/api/books/${book.id}/thumbnail?v=${thumbnailVersion}`}
                          alt={book.title}
                          className="w-full h-full object-cover rounded"
                          onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src="/placeholder.svg"; }}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div 
                          className="font-medium leading-tight line-clamp-2 cursor-help" 
                          title={book.title.length > 50 ? book.title : undefined}
                        >
                          {book.title}
                        </div>
                        <div className="text-sm text-muted-foreground leading-tight mt-1">{book.author}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="h-20 font-medium">{book.author}</TableCell>
                  <TableCell className="h-20">
                    {book.categories && (
                      <Badge variant="secondary">{book.categories.name}</Badge>
                    )}
                  </TableCell>
                  <TableCell className="h-20">
                    {(() => {
                      const typeInfo = getBookTypeInfo(book.book_type || 'file');
                      const IconComponent = typeInfo.icon;
                      return (
                        <Badge className={typeInfo.color}>
                          <IconComponent className="h-3 w-3 mr-1" />
                          {typeInfo.label}
                        </Badge>
                      );
                    })()}
                  </TableCell>
                  <TableCell className="h-20 text-muted-foreground">{book.isbn || '-'}</TableCell>
                  <TableCell className="h-20 text-muted-foreground">{book.published_year || '-'}</TableCell>
                  <TableCell className="h-20 text-muted-foreground">{book.page_count || '-'}</TableCell>
                                     <TableCell className="h-20 w-20 text-muted-foreground text-center">{book.download_count || 0}</TableCell>
                  <TableCell className="h-20">
                    <ThumbsRating
                      contentId={book.id}
                      contentType="book"
                      initialUpVotes={book.up_votes || 0}
                      initialDownVotes={book.down_votes || 0}
                      initialUserVote={book.user_vote || null}
                      readonly={true}
                    />
                  </TableCell>
                  <TableCell className="h-20 text-right">
                    <div className="flex items-center justify-end space-x-1">
                      {book.book_type === 'file' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openBookFile(book)}
                          title="Download"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      )}
                      {book.book_type === 'link' && book.external_link && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openBookLink(book)}
                          title="Open Link"
                        >
                          <Link className="h-4 w-4" />
                        </Button>
                      )}
                      {book.book_type === 'purchase' && book.purchase_link && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openPurchaseLink(book)}
                          title="Purchase"
                        >
                          <ShoppingCart className="h-4 w-4" />
                        </Button>
                      )}
                      {/* Generate Thumbnail button removed - thumbnails are handled automatically */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(book)}
                        title="Edit"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openDeleteDialog(book)}
                        className="text-destructive hover:text-destructive"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {currentBooks.length === 0 && (
            <div className="p-8 text-center">
              <BookOpen className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No books found</h3>
              <p className="text-muted-foreground">
                {searchTerm || (selectedCategory !== 'all') ? 'Try adjusting your search or filters.' : 'Get started by adding your first book.'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Cards View */}
      {viewMode === 'cards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {currentBooks.map((book) => (
            <Card key={book.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="w-12 h-12 bg-muted rounded flex items-center justify-center flex-shrink-0">
                    <img
                      src={`/api/books/${book.id}/thumbnail?v=${thumbnailVersion}`}
                      alt={book.title}
                      className="w-full h-full object-cover rounded"
                      onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src="/placeholder.svg"; }}
                    />
                  </div>
                  <div className="flex space-x-1">
                    {book.book_type === 'file' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openBookFile(book)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    )}
                    {book.book_type === 'link' && book.external_link && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openBookLink(book)}
                      >
                        <Link className="h-4 w-4" />
                      </Button>
                    )}
                    {book.book_type === 'purchase' && book.purchase_link && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openPurchaseLink(book)}
                      >
                        <ShoppingCart className="h-4 w-4" />
                      </Button>
                    )}
                    {/* Generate Thumbnail button removed - thumbnails are handled automatically */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(book)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openDeleteDialog(book)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <CardTitle className="text-lg line-clamp-2">{book.title}</CardTitle>
                <p className="text-sm text-muted-foreground">by {book.author}</p>
                <div className="flex gap-2">
                  {book.categories && (
                    <Badge variant="secondary" className="w-fit">
                      {book.categories.name}
                    </Badge>
                  )}
                  {(() => {
                    const typeInfo = getBookTypeInfo(book.book_type || 'file');
                    const IconComponent = typeInfo.icon;
                    return (
                      <Badge className={typeInfo.color}>
                        <IconComponent className="h-3 w-3 mr-1" />
                        {typeInfo.label}
                      </Badge>
                    );
                  })()}
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center">
                      <BookOpen className="h-4 w-4 mr-1 text-muted-foreground" />
                      <span>Author</span>
                    </div>
                    <span className="font-medium">{book.author}</span>
                  </div>
                  {book.page_count && (
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center">
                        <BookOpen className="h-4 w-4 mr-1 text-muted-foreground" />
                        <span>Pages</span>
                      </div>
                      <span className="font-medium">{book.page_count}</span>
                    </div>
                  )}
                  {book.published_year && (
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center">
                        <BookOpen className="h-4 w-4 mr-1 text-muted-foreground" />
                        <span>Year</span>
                      </div>
                      <span className="font-medium">{book.published_year}</span>
                    </div>
                  )}
                   <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center">
                        <Download className="h-4 w-4 mr-1 text-muted-foreground" />
                        <span>Downloads</span>
                      </div>
                      <span className="font-medium">{book.download_count || 0}</span>
                    </div>
                    <ThumbsRating
                      contentId={book.id}
                      contentType="book"
                      initialUpVotes={book.up_votes || 0}
                      initialDownVotes={book.down_votes || 0}
                      initialUserVote={book.user_vote || null}
                      readonly={true}
                    />
                </div>
              </CardContent>
            </Card>
          ))}
          
          {currentBooks.length === 0 && (
            <Card className="p-8 text-center col-span-full">
              <BookOpen className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No books found</h3>
              <p className="text-muted-foreground">
                {searchTerm || (selectedCategory !== 'all') ? 'Try adjusting your search or filters.' : 'Get started by adding your first book.'}
              </p>
            </Card>
          )}
        </div>
      )}

      {/* Pagination Controls for Cards View */}
      {viewMode === 'cards' && totalPages > 1 && (
        <div className="flex justify-center">
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={goToPreviousPage}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            
            <div className="flex items-center space-x-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                
                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? "default" : "outline"}
                    size="sm"
                    onClick={() => goToPage(pageNum)}
                    className="w-8 h-8 p-0"
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={goToNextPage}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog(prev => ({ ...prev, open }))}
        title="Delete Book"
        description={
          deleteDialog.book
            ? `Are you sure you want to delete "${deleteDialog.book.title}"? This action cannot be undone.`
            : ""
        }
        onConfirm={confirmDelete}
      />
    </div>
  );
}