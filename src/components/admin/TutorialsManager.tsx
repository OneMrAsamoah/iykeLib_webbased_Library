import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Plus, Edit, Trash2, Play, Tag, Youtube, List, Grid3X3, Search, Eye, Clock, User, BookOpen, Video, FileText, BarChart3, Filter } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useNavigate } from 'react-router-dom';
import { ThumbsRating } from '@/components/ui/ThumbsRating';
import { Separator } from '@/components/ui/separator';
import { getVideoDuration, extractYouTubeId } from '@/lib/youtube-utils';

interface Tutorial {
  id: string;
  title: string;
  category_id: string | null;
  description: string | null;
  author?: string | null;
  creator?: string | null;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  content_type: 'Video' | 'PDF';
  content_url: string | null;
  file_path: string | null;
  created_at: string | null;
  updated_at: string | null;
  categories?: { name: string } | null;
  view_count?: number;
  up_votes?: number;
  down_votes?: number;
  user_vote?: -1 | 1 | null;
  duration?: string;
}

interface Category {
  id: string;
  name: string;
}

export default function TutorialsManager() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tutorials, setTutorials] = useState<Tutorial[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingDuration, setIsLoadingDuration] = useState(false);
  const [dbConnected, setDbConnected] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [editingTutorial, setEditingTutorial] = useState<Tutorial | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'cards'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category_id: '',
    creator: '',
    difficulty: 'Beginner' as 'Beginner' | 'Intermediate' | 'Advanced',
    content_type: 'Video' as 'Video' | 'PDF',
    content_url: '',
    embed_url: '',
    file_path: ''
  });
  const { toast } = useToast();

  useEffect(() => {
  checkDatabaseConnection();
  fetchTutorials();
  fetchCategories();
  }, []);

  // Use relative paths for API calls (Vite proxy will handle forwarding to backend)
  const API_BASE = '';

  const fetchTutorials = async () => {
    try {
      // Try admin endpoint first (if user is admin), fallback to public endpoint
      let response: Response | null = null;
      if (user?.email) {
        response = await fetch(`${API_BASE}/api/admin/tutorials`, {
          headers: { 'x-user-email': user.email }
        });
      }

      if (!response || !response.ok) {
        response = await fetch(`${API_BASE}/api/tutorials`);
        if (!response.ok) {
          throw new Error('Failed to fetch tutorials');
        }
      }

      const data = await response.json();
      const tutorialsData = Array.isArray(data) ? data : (data.tutorials || data);

      setIsLoadingDuration(true);
      const transformed: Tutorial[] = await Promise.all(tutorialsData.map(async (t: any) => {
        // Get video duration from YouTube API if content_url is available
        let duration = 'Unknown';
        if (t.content_url) {
          try {
            duration = await getVideoDuration(t.content_url);
            // If duration is still 'Unknown' after API call, it means API failed
            if (duration === 'Unknown') {
              duration = 'Duration N/A';
            }
          } catch (err) {
            console.warn('Failed to get duration for tutorial:', t.id, err);
            duration = 'Duration N/A';
          }
        }
        
        return {
          id: t.id?.toString(),
          title: t.title,
          description: t.description,
          creator: t.creator || null,
          content_url: t.content_url,
          embed_url: t.embed_url || null,
          category_id: t.category_id ? t.category_id.toString() : null,
          difficulty: t.difficulty || 'Beginner',
          content_type: t.content_type || 'Video',
          file_path: t.file_path || null,
          created_at: t.created_at || null,
          updated_at: t.updated_at || null,
          categories: t.category_name ? { name: t.category_name } : null,
          view_count: t.view_count,
          up_votes: t.up_votes,
          down_votes: t.down_votes,
          user_vote: t.user_vote,
          duration
        };
      }));
      setIsLoadingDuration(false);

      setTutorials(transformed);
    } catch (error) {
      console.error('Error fetching tutorials:', error);
      toast({ title: 'Error', description: 'Failed to fetch tutorials. Ensure server & DB are running.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
  const response = await fetch(`${API_BASE}/api/categories`);
      if (!response.ok) throw new Error('Failed to fetch categories');
      const data = await response.json();
      const transformed: Category[] = data.map((c: any) => ({ id: c.id.toString(), name: c.name }));
      setCategories(transformed);
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast({ title: 'Error', description: 'Failed to fetch categories.', variant: 'destructive' });
    }
  };

  const checkDatabaseConnection = async () => {
    try {
  const resp = await fetch(`${API_BASE}/api/tutorials`);
      setDbConnected(resp.ok);
    } catch (err) {
      setDbConnected(false);
      console.error('Database connection check failed:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Require title, category and some form of content (description OR video URL OR file path)
    if (!formData.title || !formData.category_id) {
      toast({
        title: "Validation Error",
        description: "Please fill in the title and category",
        variant: "destructive"
      });
      return;
    }

    const hasDescription = !!(formData.description && formData.description.trim());
    const hasVideoUrl = formData.content_type === 'Video' && !!(formData.content_url && formData.content_url.trim());
    const hasFilePath = formData.content_type === 'PDF' && !!(formData.file_path && formData.file_path.trim());

    if (!hasDescription && !hasVideoUrl && !hasFilePath) {
      toast({
        title: "Validation Error",
        description: "Please provide tutorial content: description, video URL, or PDF file path",
        variant: "destructive"
      });
      return;
    }

    try {
      if (!user?.email) {
        toast({ title: 'Error', description: 'User not authenticated', variant: 'destructive' });
        return;
      }

      // Prefer description as the main 'content' field; fall back to the specific content fields.
      const contentValue = hasDescription
        ? formData.description
        : (formData.content_type === 'Video' ? formData.content_url : formData.file_path) || null;

      const payload = {
        title: formData.title,
        category_id: formData.category_id,
        creator: formData.creator || null,
        content: contentValue,
        description: formData.description || null,
        difficulty: formData.difficulty,
        content_type: formData.content_type,
        content_url: formData.content_url || null,
        embed_url: formData.embed_url || null,
        file_path: formData.file_path || null
      };

      let response: Response;
      if (editingTutorial) {
        response = await fetch(`${API_BASE}/api/admin/tutorials/${editingTutorial.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'x-user-email': user.email },
          body: JSON.stringify(payload)
        });
      } else {
        response = await fetch(`${API_BASE}/api/admin/tutorials`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-user-email': user.email },
          body: JSON.stringify(payload)
        });
      }

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to save tutorial');
      }

      toast({ title: 'Success', description: editingTutorial ? 'Tutorial updated' : 'Tutorial created' });
      resetForm();
      setShowDialog(false);
      fetchTutorials();
    } catch (error) {
      console.error('Error saving tutorial:', error);
      toast({ title: 'Error', description: (error as Error).message || 'Failed to save tutorial', variant: 'destructive' });
    }
  };

  const handleEdit = (tutorial: Tutorial) => {
    setEditingTutorial(tutorial);
    setFormData({
      title: tutorial.title,
      description: tutorial.description || '',
      category_id: tutorial.category_id || '',
      creator: tutorial.creator || '',
      difficulty: tutorial.difficulty,
      content_type: 'Video',
      content_url: tutorial.content_url || '',
      embed_url: (tutorial as any).embed_url || '',
      file_path: ''
    });
    setShowDialog(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this tutorial?')) {
      try {
        if (!user?.email) {
          toast({ title: 'Error', description: 'User not authenticated', variant: 'destructive' });
          return;
        }

        const response = await fetch(`${API_BASE}/api/admin/tutorials/${id}`, {
          method: 'DELETE',
          headers: { 'x-user-email': user.email }
        });

        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err.error || 'Failed to delete tutorial');
        }

        toast({ title: 'Success', description: 'Tutorial deleted successfully' });
        fetchTutorials();
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to delete tutorial",
          variant: "destructive"
        });
      }
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      category_id: '',
      creator: '',
      difficulty: 'Beginner',
      content_type: 'Video',
      content_url: '',
      embed_url: '',
      file_path: ''
    });
    setEditingTutorial(null);
  };

  const filteredTutorials = tutorials.filter(tutorial => {
    const matchesSearch = tutorial.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tutorial.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || tutorial.category_id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getYouTubeThumbnail = (youtubeId: string | null) => {
    if (!youtubeId) return undefined;
    // YouTube provides multiple thumbnail sizes, we'll use the medium quality (mqdefault)
    return `https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg`;
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Beginner': return 'bg-green-100 text-green-800 border-green-200';
      case 'Intermediate': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Advanced': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getContentTypeIcon = (contentType: string) => {
    switch (contentType) {
      case 'Video': return <Video className="h-4 w-4" />;
      case 'PDF': return <FileText className="h-4 w-4" />;
      default: return <BookOpen className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading tutorials...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Compact Header */}
      <div className="rounded-lg p-4 border-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-600/10 rounded-full">
                <BookOpen className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold tracking-tight">Tutorials Management</h2>
                <p className="text-sm text-muted-foreground">
                  Manage your video tutorial content
                </p>
              </div>
            </div>
          </div>
          <Button 
            onClick={() => setShowDialog(true)} 
            className="w-full sm:w-auto h-10 px-4 text-base font-medium"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Tutorial
          </Button>
        </div>
      </div>

      {/* YouTube API Key Warning */}
      {!import.meta.env.VITE_YOUTUBE_API_KEY && (
        <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-full">
                <Youtube className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-orange-800 dark:text-orange-200">YouTube API Key Required</h3>
                <p className="text-sm text-orange-700 dark:text-orange-300">
                  To display video durations, add <code className="bg-orange-100 dark:bg-orange-900/30 px-1 rounded">VITE_YOUTUBE_API_KEY</code> to your <code className="bg-orange-100 dark:bg-orange-900/30 px-1 rounded">.env</code> file.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Brief Analytics Overview - Moved before filters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border border-border">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 dark:bg-blue-950/30 rounded-xl">
                <BookOpen className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{tutorials.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border border-border">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 dark:bg-green-950/30 rounded-xl">
                <Video className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Videos</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{tutorials.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border border-border">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-orange-100 dark:bg-orange-950/30 rounded-xl">
                <Eye className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Views</p>
                <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{tutorials.reduce((sum, t) => sum + (t.view_count || 0), 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Compact Filters and Search */}
      <Card className="border border-border">
        <CardContent className="p-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Filter className="h-4 w-4" />
              Filters & Search
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search tutorials..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 h-9"
                  />
                </div>
              </div>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-full sm:w-40 h-9">
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
              <div className="flex border rounded-md overflow-hidden">
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className="rounded-r-none px-3 h-9"
                >
                  <List className="h-3 w-3 mr-1" />
                  List
                </Button>
                <Button
                  variant={viewMode === 'cards' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('cards')}
                  className="rounded-l-none px-3 h-9"
                >
                  <Grid3X3 className="h-3 w-3 mr-1" />
                  Cards
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tutorials List/Cards */}
      {viewMode === 'list' ? (
        <Card className="border-0 shadow-md">
          <CardHeader className="bg-muted/30 py-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <BarChart3 className="h-4 w-4" />
              Tutorials ({filteredTutorials.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">Tutorial</TableHead>
                  <TableHead className="font-semibold">Creator</TableHead>
                  <TableHead className="font-semibold">Category</TableHead>
                  <TableHead className="font-semibold">Difficulty</TableHead>
                  <TableHead className="font-semibold">Duration</TableHead>
                  <TableHead className="font-semibold">Views</TableHead>
                  <TableHead className="font-semibold">Rating</TableHead>
                  <TableHead className="font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTutorials.map((tutorial) => (
                  <TableRow key={tutorial.id} className="hover:bg-muted/30">
                    <TableCell>
                      <div className="flex items-center space-x-4">
                        <div className="relative">
                          {tutorial.content_url?.includes('youtube.com/watch?v=') ? (
                            <img
                              src={getYouTubeThumbnail(tutorial.content_url.split('v=')[1])}
                              alt={tutorial.title || 'Tutorial thumbnail'}
                              className="w-20 h-12 rounded-lg object-cover shadow-md"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                target.nextElementSibling?.classList.remove('hidden');
                              }}
                            />
                          ) : null}
                          <div className={`w-20 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center shadow-md ${tutorial.content_url?.includes('youtube.com/watch?v=') ? 'hidden' : ''}`}>
                            <Youtube className="h-6 w-6 text-white" />
                          </div>
                          {tutorial.content_type === 'Video' && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center opacity-90">
                                <Play className="h-4 w-4 text-white" />
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="space-y-1">
                          <div className="font-semibold text-base">{tutorial.title}</div>
                          <div className="text-sm text-muted-foreground line-clamp-2 max-w-xs">
                            {tutorial.description || 'No description available'}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {tutorial.creator || 'Unknown'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="px-3 py-1">
                        {tutorial.categories?.name || 'Uncategorized'}
                      </Badge>
                    </TableCell>

                    <TableCell>
                      <Badge className={`${getDifficultyColor(tutorial.difficulty)} px-3 py-1 border`}>
                        {tutorial.difficulty}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">
                          {isLoadingDuration ? (
                            <span className="flex items-center gap-1">
                              <div className="animate-spin rounded-full h-3 w-3 border-b border-current"></div>
                              Loading...
                            </span>
                          ) : (
                            tutorial.duration || 'Unknown'
                          )}
                        </span>
                        {!import.meta.env.VITE_YOUTUBE_API_KEY && (
                          <span className="text-xs text-muted-foreground ml-1" title="Set VITE_YOUTUBE_API_KEY in your .env file to show video durations">
                            (API key needed)
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Eye className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{tutorial.view_count || 0}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <ThumbsRating
                        contentId={tutorial.id}
                        contentType="tutorial"
                        initialUpVotes={tutorial.up_votes || 0}
                        initialDownVotes={tutorial.down_votes || 0}
                        initialUserVote={tutorial.user_vote || null}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(tutorial)}
                          className="h-9 w-9 p-0 hover:bg-blue-100 hover:text-blue-700"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(tutorial.id)}
                          className="h-9 w-9 p-0 hover:bg-red-100 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTutorials.map((tutorial) => (
            <Card key={tutorial.id} className="overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 group">
              <div className="relative">
                {tutorial.content_url?.includes('youtube.com/watch?v=') ? (
                  <img
                    src={getYouTubeThumbnail(tutorial.content_url.split('v=')[1])}
                    alt={tutorial.title || 'Tutorial thumbnail'}
                    className="w-full h-40 object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      target.nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                ) : null}
                <div className={`w-full h-40 bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center group-hover:scale-105 transition-transform duration-300 ${tutorial.content_url?.includes('youtube.com/watch?v=') ? 'hidden' : ''}`}>
                  <Youtube className="h-20 w-20 text-white" />
                </div>
                <div className="absolute top-3 right-3">
                  <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center shadow-lg">
                    <Play className="h-5 w-5 text-white" />
                  </div>
                </div>
                <div className="absolute top-3 left-3">
                  <Badge className="bg-black/70 text-white border-0 hover:bg-black/80">
                    <Video className="h-4 w-4" />
                    <span className="ml-1">Video</span>
                  </Badge>
                </div>
              </div>
              <CardHeader className="pb-3">
                <div className="space-y-2">
                  <CardTitle className="text-lg line-clamp-2 group-hover:text-blue-600 transition-colors">
                    {tutorial.title}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {tutorial.description || 'No description available'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    by {tutorial.creator || 'Unknown'}
                  </p>
                </div>
              </CardHeader>
              <CardContent className="pt-0 space-y-4">
                <div className="flex items-center justify-between">
                  <Badge variant="secondary" className="px-3 py-1">
                    {tutorial.categories?.name || 'Uncategorized'}
                  </Badge>
                  <Badge className={`${getDifficultyColor(tutorial.difficulty)} px-3 py-1 border`}>
                    {tutorial.difficulty}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <div className="flex items-center space-x-1">
                    <Eye className="h-4 w-4" />
                    <span>{tutorial.view_count || 0} views</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Clock className="h-4 w-4" />
                    <span>
                      {isLoadingDuration ? (
                        <span className="flex items-center gap-1">
                          <div className="animate-spin rounded-full h-3 w-3 border-b border-current"></div>
                          Loading...
                        </span>
                      ) : (
                        tutorial.duration || 'Unknown'
                      )}
                    </span>
                    {!import.meta.env.VITE_YOUTUBE_API_KEY && (
                      <span className="text-xs text-muted-foreground ml-1" title="Set VITE_YOUTUBE_API_KEY in your .env file to show video durations">
                        (API key needed)
                      </span>
                    )}
                  </div>
                </div>

                <Separator />

                <ThumbsRating
                  contentId={tutorial.id}
                  contentType="tutorial"
                  initialUpVotes={tutorial.up_votes || 0}
                  initialDownVotes={tutorial.down_votes || 0}
                  initialUserVote={tutorial.user_vote || null}
                />

                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 h-10 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700"
                    onClick={() => handleEdit(tutorial)}
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 h-10 hover:bg-red-50 hover:border-red-200 hover:text-red-700"
                    onClick={() => handleDelete(tutorial.id)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Compact Add/Edit Tutorial Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent aria-describedby="dialog-description" className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader className="space-y-1 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-primary/10 rounded-full">
                <BookOpen className="h-4 w-4 text-primary" />
              </div>
              <DialogTitle className="text-lg font-bold">
                {editingTutorial ? 'Edit Tutorial' : 'Add New Tutorial'}
              </DialogTitle>
            </div>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Main Form Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-sm font-medium">Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Enter tutorial title"
                  className="h-9"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="category_id" className="text-sm font-medium">Category *</Label>
                <Select
                  value={formData.category_id || ''}
                  onValueChange={(value) => setFormData({ ...formData, category_id: value })}
                  required
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select category" />
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
                <Label htmlFor="creator" className="text-sm font-medium">Creator/Author</Label>
                <Input
                  id="creator"
                  value={formData.creator}
                  onChange={(e) => setFormData({ ...formData, creator: e.target.value })}
                  placeholder="Enter creator name"
                  className="h-9"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="difficulty" className="text-sm font-medium">Difficulty</Label>
                <Select
                  value={formData.difficulty}
                  onValueChange={(value: 'Beginner' | 'Intermediate' | 'Advanced') => 
                    setFormData({ ...formData, difficulty: value })
                  }
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Beginner">Beginner</SelectItem>
                    <SelectItem value="Intermediate">Intermediate</SelectItem>
                    <SelectItem value="Advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-medium">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter tutorial description"
                rows={3}
                className="resize-none"
              />
            </div>

            {/* Video URL */}
            <div className="space-y-2">
              <Label htmlFor="content_url" className="text-sm font-medium">Video URL *</Label>
              <div className="relative">
                <Youtube className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  id="content_url"
                  value={formData.content_url}
                  onChange={(e) => setFormData({ ...formData, content_url: e.target.value })}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="pl-10 h-9"
                  required
                />
              </div>
            </div>

            {/* Embed URL for external quizzes/certificates */}
            <div className="space-y-2">
              <Label htmlFor="embed_url" className="text-sm font-medium">Embed URL (quiz/certificate)</Label>
              <Input
                id="embed_url"
                value={formData.embed_url}
                onChange={(e) => setFormData({ ...formData, embed_url: e.target.value })}
                placeholder="https://example.com/embed?quiz=XYZ"
                className="h-9"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowDialog(false);
                  resetForm();
                }}
                className="h-9 px-4"
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                className="h-9 px-4"
              >
                {editingTutorial ? 'Update Tutorial' : 'Create Tutorial'}
              </Button>
            </div>
            <div id="dialog-description" className="hidden">Provide a description for this dialog.</div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}