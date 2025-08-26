import React, { useMemo, useState, useEffect } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, List, LayoutGrid, Play, Eye, Clock, User, X, Heart, Share2, ExternalLink, Youtube } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

type Tutorial = {
  id: string;
  title: string;
  description?: string;
  youtubeId: string;
  thumbnail?: string;
  category: string;
  view_count?: number;
  duration?: string;
  author?: string;
  created_at?: string;
};

import { apiCall } from "@/lib/api";
import { getVideoDuration } from "@/lib/youtube-utils";

// will be populated from the server
const INITIAL_TUTORIALS: Tutorial[] = [];

export default function Tutorials() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"grid" | "list">("list");
  const [playing, setPlaying] = useState(false);
  const [active, setActive] = useState<Tutorial | null>(null);
  const [tutorials, setTutorials] = useState<Tutorial[]>(INITIAL_TUTORIALS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Tutorial preview modal state
  const [selectedTutorial, setSelectedTutorial] = useState<Tutorial | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  
  const navigate = useNavigate();

  const categories = useMemo(() => {
    const set = new Set<string>();
    tutorials.forEach((t) => set.add(t.category));
    return Array.from(set);
  }, [tutorials]);

  const filtered = useMemo(() => {
    let items = tutorials;
    if (selectedCategory) items = items.filter((t) => t.category === selectedCategory);
    if (query.trim()) {
      const q = query.toLowerCase();
      items = items.filter((t) => t.title.toLowerCase().includes(q) || (t.description || "").toLowerCase().includes(q));
    }
    return items;
  }, [tutorials, selectedCategory, query]);

  // Load favorites from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('tutorialFavorites');
      if (stored) {
        const favoritesArray = JSON.parse(stored) as string[];
        setFavorites(new Set(favoritesArray));
      }
    } catch (error) {
      console.error('Error loading favorites:', error);
    }
  }, []);

  // Save favorites to localStorage
  const saveFavorites = (newFavorites: Set<string>) => {
    try {
      localStorage.setItem('tutorialFavorites', JSON.stringify(Array.from(newFavorites)));
    } catch (error) {
      console.error('Error saving favorites:', error);
    }
  };

  // Toggle favorite status
  const handleToggleFavorite = (tutorial: Tutorial) => {
    setFavorites(prev => {
      const newFavorites = new Set(prev);
      if (newFavorites.has(tutorial.id)) {
        newFavorites.delete(tutorial.id);
      } else {
        newFavorites.add(tutorial.id);
      }
      saveFavorites(newFavorites);
      return newFavorites;
    });
  };

  // Share tutorial functionality
  const handleShareTutorial = async (tutorial: Tutorial) => {
    const shareData = {
      title: tutorial.title,
      text: `Check out "${tutorial.title}" tutorial`,
      url: `${window.location.origin}/tutorials/${tutorial.id}`,
    };

    try {
      if (navigator.share && navigator.canShare(shareData)) {
        await navigator.share(shareData);
        console.log('Tutorial shared successfully via native share API');
      } else {
        // Fallback: copy to clipboard
        const shareText = `${tutorial.title}\n${shareData.url}`;
        await navigator.clipboard.writeText(shareText);
        alert('Tutorial link copied to clipboard!');
      }
    } catch (error) {
      console.error('Error sharing tutorial:', error);
      try {
        const shareText = `${tutorial.title}\n${shareData.url}`;
        await navigator.clipboard.writeText(shareText);
        alert('Tutorial link copied to clipboard!');
      } catch (clipboardError) {
        console.error('Error copying to clipboard:', clipboardError);
        const shareText = `${tutorial.title}\n${shareData.url}`;
        alert(`Failed to copy to clipboard. Please copy manually:\n\n${shareText}`);
      }
    }
  };

  const handleTutorialClick = (tutorial: Tutorial) => {
    setSelectedTutorial(tutorial);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedTutorial(null);
  };

  const handleViewFullTutorial = (tutorial: Tutorial) => {
    handleModalClose();
    navigate(`/tutorials/${tutorial.id}`);
  };

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiCall('/api/tutorials');
        const data = await res.json();
        if (!mounted) return;
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
              const id = extractYouTubeId(raw) ?? '';
              const thumbnail = t.thumbnail ?? (id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : undefined);
              return {
                id: String(t.id),
                title: t.title,
                description: t.description,
                youtubeId: id,
                thumbnail,
                category: t.category_name ?? t.category ?? "",
                view_count: t.view_count || 0,
                duration: t.duration || "Unknown",
                author: t.author || "Unknown Author",
                created_at: t.created_at || "Recently",
              } as Tutorial;
            })
          : [];
        setTutorials(normalized);

        // Fetch durations for tutorials that don't have a duration yet
        (async () => {
          try {
            const durationPromises = normalized.map(async (t: any) => {
              if (t.duration && t.duration !== "Unknown" && t.duration !== "Loading...") return null;
              if (!t.youtubeId) return null;
              const d = await getVideoDuration(t.youtubeId);
              return d ? { id: t.id, duration: d } : null;
            });

            const resolved = await Promise.all(durationPromises);
            if (!mounted) return;

            setTutorials((prev) => {
              const byId = new Map<string, Tutorial>(prev.map((p) => [String(p.id), p]));
              resolved.forEach((r) => {
                if (r && r.id != null && byId.has(String(r.id))) {
                  const existing = byId.get(String(r.id));
                  if (existing) {
                    byId.set(String(r.id), { ...existing, duration: r.duration });
                  }
                }
              });
              return Array.from(byId.values());
            });
          } catch (err) {
            console.warn('Failed to fetch tutorial durations', err);
          }
        })();
      } catch (err: any) {
        console.error('Failed to fetch tutorials', err);
        if (mounted) setError(err?.message ?? 'Failed to load tutorials');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => { mounted = false; };
  }, []);

  function openTutorial(t: Tutorial) {
    // navigate to tutorial page
    navigate(`/tutorials/${t.id}`, { state: { openModal: true } });
  }

  function Thumbnail({ src, alt, className }: { src?: string; alt?: string; className?: string }) {
    const [loaded, setLoaded] = useState(false);
    const [errored, setErrored] = useState(false);

    if (!src || errored) {
      return (
        <div className={`bg-gray-100 rounded ${className || ''} flex items-center justify-center`}>
          <svg className="h-6 w-6 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <path d="M8 14l2.5-3 2 2.5L16 10l4 6H4z" />
          </svg>
        </div>
      );
    }

    return (
      <div className={`relative ${className || ''}`}>
        {!loaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 animate-pulse rounded" />
        )}
        <img
          src={src}
          alt={alt}
          className={`w-full h-full object-cover rounded ${loaded ? '' : 'hidden'}`}
          loading="lazy"
          onLoad={() => setLoaded(true)}
          onError={() => setErrored(true)}
        />
        {/* Play button overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 hover:opacity-100 transition-opacity duration-200">
          <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center shadow-lg">
            <Play className="w-8 h-8 text-white ml-1" />
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto max-w-6xl px-4 py-8">
          <div className="flex justify-center items-center min-h-[60vh]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading tutorials...</p>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="container mx-auto max-w-6xl py-12 px-4 grid grid-cols-1 md:grid-cols-4 gap-6">
        <aside className="md:col-span-1">
          <div className="sticky top-24">
            <h3 className="text-lg font-semibold mb-4">Filter by Category</h3>
            <div className="flex flex-col space-y-2">
              <Button variant={!selectedCategory ? "secondary" : "outline"} onClick={() => setSelectedCategory(null)}>
                All
              </Button>
              {categories.map((c) => (
                <Button
                  key={c}
                  variant={selectedCategory === c ? "secondary" : "outline"}
                  onClick={() => setSelectedCategory(c)}
                >
                  {c}
                </Button>
              ))}
            </div>
          </div>
        </aside>

        <main className="md:col-span-3">
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold">Tutorials</h2>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>{filtered.length} results</span>
                {favorites.size > 0 && (
                  <span className="flex items-center gap-1">
                    <Heart className="h-4 w-4 text-red-500 fill-current" />
                    {favorites.size} in favorites
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input value={query} onChange={(e) => setQuery(e.target.value)} className="pl-10 pr-3 h-10" placeholder="Search tutorials..." />
              </div>

              <div className="inline-flex items-center rounded-md border bg-background p-1">
                <Button variant={view === "grid" ? "secondary" : "ghost"} size="icon" onClick={() => setView("grid")} aria-label="Grid view">
                  <LayoutGrid className="h-4 w-4" />
                </Button>
                <Button variant={view === "list" ? "secondary" : "ghost"} size="icon" onClick={() => setView("list")} aria-label="List view">
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <div className={view === "grid" ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" : "flex flex-col gap-4"}>
            {filtered.map((t) => (
              <Card key={t.id} className={`cursor-pointer hover:shadow-lg transition-all duration-200 ${view === "list" ? "flex items-center gap-4 p-4 border rounded-md" : ""}`} onClick={() => handleTutorialClick(t)}>
                {view === "grid" ? (
                  <>
                    <CardHeader className="p-0">
                      <div className="w-full h-44 bg-gray-100 relative">
                        <Thumbnail
                          src={t.thumbnail ?? (t.youtubeId ? `https://img.youtube.com/vi/${t.youtubeId}/mqdefault.jpg` : undefined)}
                          alt={t.title}
                          className="w-full h-44 rounded-t-lg"
                        />
                      </div>
                    </CardHeader>

                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <Badge variant="secondary" className="text-xs">
                          {t.category}
                        </Badge>
                        {favorites.has(t.id) && (
                          <div className="p-1 bg-red-100 rounded-full">
                            <Heart className="h-3 w-3 text-red-500 fill-current" />
                          </div>
                        )}
                      </div>
                      <CardTitle className="text-lg line-clamp-2 mb-2">{t.title}</CardTitle>
                      <CardDescription className="text-sm text-muted-foreground line-clamp-2 mb-3">{t.description}</CardDescription>
                      
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          {t.view_count || 0}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {t.duration}
                        </div>
                      </div>
                    </CardContent>
                  </>
                ) : (
                  <>
                    <div className="w-40 flex-shrink-0">
                      <Thumbnail
                        src={t.thumbnail ?? (t.youtubeId ? `https://img.youtube.com/vi/${t.youtubeId}/mqdefault.jpg` : undefined)}
                        alt={t.title}
                        className="w-full h-24 rounded-md"
                      />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="text-lg font-semibold line-clamp-2">{t.title}</h3>
                        {favorites.has(t.id) && (
                          <div className="p-1 bg-red-100 rounded-full ml-2">
                            <Heart className="h-3 w-3 text-red-500 fill-current" />
                          </div>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{t.description}</p>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <Badge variant="secondary" className="text-xs">
                          {t.category}
                        </Badge>
                        <span className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          {t.view_count || 0}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {t.duration}
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </Card>
            ))}
          </div>
        </main>
      </div>

      {/* Professional Tutorial Preview Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedTutorial && (
            <>
              <DialogHeader className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-red-600/10 rounded-full">
                      <Youtube className="h-6 w-6 text-red-600" />
                    </div>
                    <div>
                      <DialogTitle className="text-2xl font-bold text-left">
                        {selectedTutorial.title}
                      </DialogTitle>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span>by {selectedTutorial.author}</span>
                        {favorites.has(selectedTutorial.id) && (
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
                {/* Tutorial Thumbnail and Basic Info */}
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="flex-shrink-0">
                    <div className="relative group">
                      <img
                        src={selectedTutorial.thumbnail ?? `https://img.youtube.com/vi/${selectedTutorial.youtubeId}/hqdefault.jpg`}
                        alt={`${selectedTutorial.title} thumbnail`}
                        className="w-64 h-48 object-cover rounded-xl shadow-lg group-hover:shadow-xl transition-shadow duration-300"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 rounded-xl" />
                      {/* Play button overlay */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-20 h-20 bg-red-600 rounded-full flex items-center justify-center shadow-2xl opacity-90 group-hover:opacity-100 transition-opacity duration-300">
                          <Play className="w-10 h-10 text-white ml-1" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 space-y-4">
                    {/* Tutorial Type and Category */}
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary" className="px-3 py-1">
                        {selectedTutorial.category}
                      </Badge>
                      <Badge className="bg-red-100 text-red-800 px-3 py-1">
                        Video Tutorial
                      </Badge>
                    </div>

                    {/* Tutorial Stats */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center gap-2 text-sm">
                        <Eye className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{selectedTutorial.view_count || 0}</span>
                        <span className="text-muted-foreground">views</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{selectedTutorial.duration}</span>
                        <span className="text-muted-foreground">duration</span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row gap-3 pt-2">
                      <Button 
                        onClick={() => handleViewFullTutorial(selectedTutorial)}
                        className="flex-1 sm:flex-none"
                      >
                        <Play className="h-4 w-4 mr-2" />
                        Watch Full Tutorial
                      </Button>
                      <Button 
                        variant="outline"
                        onClick={() => handleToggleFavorite(selectedTutorial)}
                        className="flex-1 sm:flex-none"
                      >
                        <Heart className={`h-4 w-4 mr-2 ${favorites.has(selectedTutorial.id) ? 'text-red-500 fill-current' : ''}`} />
                        {favorites.has(selectedTutorial.id) ? 'Remove from Favorites' : 'Add to Favorites'}
                      </Button>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Description Section */}
                {selectedTutorial.description && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-semibold">Description</h3>
                    </div>
                    <div className="bg-muted/30 rounded-lg p-4">
                      <p className="text-foreground leading-relaxed">
                        {selectedTutorial.description}
                      </p>
                    </div>
                  </div>
                )}

                {/* Tutorial Details Grid */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="h-5 w-5 rounded-full bg-primary/20" />
                    <h3 className="text-lg font-semibold">Tutorial Details</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-muted/30 rounded-lg p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Author</span>
                        <span className="text-sm text-muted-foreground ml-auto">{selectedTutorial.author}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-4 w-4 rounded-full bg-primary/20" />
                        <span className="text-sm font-medium">Category</span>
                        <span className="text-sm text-muted-foreground ml-auto">{selectedTutorial.category}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Youtube className="h-4 w-4 text-red-600" />
                        <span className="text-sm font-medium">Platform</span>
                        <span className="text-sm text-muted-foreground ml-auto">YouTube</span>
                      </div>
                    </div>
                    
                    <div className="bg-muted/30 rounded-lg p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <Eye className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Views</span>
                        <span className="text-sm text-muted-foreground ml-auto">{selectedTutorial.view_count || 0}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Duration</span>
                        <span className="text-sm text-muted-foreground ml-auto">{selectedTutorial.duration}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-4 w-4 rounded-full bg-green-100" />
                        <span className="text-sm font-medium">Added</span>
                        <span className="text-sm text-muted-foreground ml-auto">{selectedTutorial.created_at}</span>
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
                      onClick={() => handleViewFullTutorial(selectedTutorial)}
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Full Tutorial Page
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => handleShareTutorial(selectedTutorial)}
                    >
                      <Share2 className="h-4 w-4 mr-2" />
                      Share Tutorial
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
}
