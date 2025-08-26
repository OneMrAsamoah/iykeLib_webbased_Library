import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import YouTubePlayer from "@/components/YouTubePlayer";
import type { YouTubePlayerHandle } from "@/components/YouTubePlayer";
import { Play, Eye, Clock, User, Youtube, Heart, Share2, ExternalLink, ArrowLeft, Maximize2, BookOpen } from "lucide-react";
import { Separator } from "@/components/ui/separator";

// No local tutorial sample data; always load from API.
import { apiCall } from "@/lib/api";
import TutorialModule from "@/components/TutorialModule";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { getVideoDuration } from "@/lib/youtube-utils";

const TutorialPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tutorial, setTutorial] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const playerRef = useRef<YouTubePlayerHandle | null>(null);
  const location = useLocation();
  const [modalOpen, setModalOpen] = useState(false);
  const [quizOpen, setQuizOpen] = useState(false);
  
  // Favorites state
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [isFavorite, setIsFavorite] = useState(false);

  // Effects and hooks must be called in the same order on every render
  useEffect(() => {
    // load tutorial from API if not present or id changed
    let mounted = true;
    if (!id) return;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiCall(`/api/tutorials/${encodeURIComponent(id)}`);
        const data = await res.json();
        if (!mounted) return;
        // normalize YouTube id and thumbnail from possible backend fields
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

        // prefer explicit youtube fields if provided by backend
        const raw = data.youtube_video_id ?? data.youtube_id ?? data.youtubeId ?? data.youtube ?? data.youtube_url ?? data.content_url ?? null;
        const youtubeId = extractYouTubeId(raw) ?? '';
        const thumbnail = youtubeId ? `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg` : '/placeholder.svg';

        setTutorial((prev) => ({ ...prev, ...data, youtubeId, thumbnail }));

        // If backend didn't provide a duration, try to fetch it on the client
        (async () => {
          try {
            const provided = data.duration ?? data.duration_text ?? data.duration_formatted;
            if (!provided && youtubeId) {
              const d = await getVideoDuration(youtubeId);
              if (!mounted) return;
              setTutorial((prev) => prev ? ({ ...prev, duration: d }) : prev);
            } else if (provided && !mounted) {
              // noop
            }
          } catch (err) {
            console.warn('Failed to fetch tutorial duration', err);
          }
        })();
      } catch (err: any) {
        console.error('Failed to fetch tutorial', err);
        if (mounted) setError(err?.message ?? 'Failed to load tutorial');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    // Always fetch tutorial data from backend API
    load();

    return () => { mounted = false; };
  }, [id]);

  // Load favorites from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('tutorialFavorites');
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
  }, [id]);

  // Save favorites to localStorage
  const saveFavorites = (newFavorites: Set<string>) => {
    try {
      localStorage.setItem('tutorialFavorites', JSON.stringify(Array.from(newFavorites)));
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

  // Share tutorial functionality
  const handleShareTutorial = async () => {
    if (!tutorial) return;

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

  // set meta tags when tutorial data becomes available
  useEffect(() => {
    if (!tutorial) return;

    const prevTitle = document.title;

    const setMeta = (attrName: 'name' | 'property', attrValue: string, content: string) => {
      const selector = attrName === 'name' ? `meta[name="${attrValue}"]` : `meta[property="${attrValue}"]`;
      let el = document.head.querySelector(selector) as HTMLMetaElement | null;
      let created = false;
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attrName, attrValue);
        document.head.appendChild(el);
        created = true;
      }
      const prev = el.getAttribute('content');
      el.setAttribute('content', content);
      return { el, prev, created } as { el: HTMLMetaElement; prev: string | null; created: boolean };
    };

    // Update document title
    document.title = `${tutorial.title} | iYKELib`;

    const url = window.location.href;
    const extractYouTubeId = (input: string | undefined | null): string | null => {
      if (!input) return null;
      const s = String(input);
      const re = /(?:youtube\.com\/(?:.*v=|embed\/|v\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/;
      const m = s.match(re);
      if (m && m[1]) return m[1];
      try {
        const parsed = new URL(s);
        const v = parsed.searchParams.get('v');
        if (v && /^[A-Za-z0-9_-]{11}$/.test(v)) return v;
      } catch (e) {
        // not a URL
      }
      if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s;
      return null;
    };

    const idFromData = tutorial.youtubeId ?? tutorial.youtube_id ?? tutorial.content_url ?? null;
    const youtubeId = extractYouTubeId(idFromData) ?? '';
    const thumbnail = youtubeId ? `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg` : '/placeholder.svg';

    const metas = [
      setMeta('name', 'description', tutorial.description || `${tutorial.title} - tutorial`),
      setMeta('property', 'og:title', tutorial.title),
      setMeta('property', 'og:description', tutorial.description || `${tutorial.title} - tutorial`),
      setMeta('property', 'og:url', url),
      setMeta('property', 'og:image', thumbnail),
      setMeta('property', 'og:video', `https://www.youtube.com/watch?v=${tutorial.youtubeId}`),
      setMeta('property', 'og:video:secure_url', `https://www.youtube.com/watch?v=${tutorial.youtubeId}`),
      setMeta('property', 'og:video:type', 'text/html'),
    ];

    return () => {
      document.title = prevTitle;
      metas.forEach(({ el, prev, created }) => {
        if (prev === null || prev === undefined) {
          if (created) el.remove();
        } else {
          el.setAttribute('content', prev);
        }
      });
    };
  }, [tutorial]);

  // Open tutorial modal if navigated here with state.openModal
  useEffect(() => {
    try {
      const shouldOpen = (location && (location.state as any) && (location.state as any).openModal) || false;
      if (tutorial && shouldOpen) setModalOpen(true);
    } catch (e) {
      // ignore
    }
  }, [location, tutorial]);

  // Mark view after 10 seconds of playback
  const markTutorialView = async (tutorialId: string | number) => {
    try {
      // prevent duplicate counts from same client quickly
      const key = `tutorial_viewed_${tutorialId}`;
      if (localStorage.getItem(key)) return;
      localStorage.setItem(key, '1');

      await fetch(`/api/tutorials/${encodeURIComponent(String(tutorialId))}/views`, { method: 'POST' });
      // Optionally update local UI count
      setTutorial((prev: any) => prev ? ({ ...prev, view_count: (prev.view_count || 0) + 1 }) : prev);
    } catch (err) {
      console.warn('Failed to mark tutorial view', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto max-w-6xl px-4 py-8">
          <div className="flex justify-center items-center min-h-[60vh]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading tutorial details...</p>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!tutorial) {
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
            <h2 className="text-2xl font-bold mb-2">Tutorial Not Found</h2>
            <p className="text-muted-foreground mb-6">
              The tutorial you're looking for doesn't exist or has been removed.
            </p>
            <Button onClick={() => navigate('/tutorials')}>
              Back to Tutorials
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // derive quiz embed URL (uses tutorial.quiz or tutorial.quiz_code if provided)
  // Use tutorial.embed_url from the database. If present, append required query params.
  const embedBase = (tutorial as any)?.embed_url ? String((tutorial as any).embed_url).trim() : null;
  const quizEmbedUrl = embedBase
    ? (embedBase.includes('?') ? `${embedBase}&theme=auto&height=600px&width=100%` : `${embedBase}?theme=auto&height=600px&width=100%`)
    : null;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto max-w-6xl px-4 py-8">
        {/* Breadcrumb Navigation */}
        <div className="mb-6">
          <nav className="flex items-center gap-2 text-sm text-muted-foreground">
            <button 
              onClick={() => navigate('/tutorials')}
              className="hover:text-foreground transition-colors flex items-center gap-1"
            >
              <ArrowLeft className="h-4 w-4" />
              Tutorials
            </button>
            <span>/</span>
            <span className="text-foreground font-medium">{tutorial.title}</span>
          </nav>
        </div>

        {/* Main Tutorial Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Video Player and Basic Info */}
          <div className="lg:col-span-2">
            {/* Video Player */}
            <div className="relative aspect-video w-full bg-black rounded-xl overflow-hidden shadow-2xl mb-6">
              <YouTubePlayer ref={playerRef} youtubeId={tutorial.youtubeId} className="w-full h-full" />
              
              {/* Video Controls Overlay */}
              <div className="absolute top-4 right-4 flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    // request fullscreen on the player container via DOM
                    const el = document.querySelector('.aspect-video') as HTMLElement | null;
                    if (!el) return;
                    try {
                      if (el.requestFullscreen) el.requestFullscreen();
                      else if ((el as HTMLElement & { webkitRequestFullscreen?: () => void }).webkitRequestFullscreen) {
                        (el as HTMLElement & { webkitRequestFullscreen?: () => void }).webkitRequestFullscreen!();
                      }
                    } catch (err) { /* ignore */ }
                  }}
                  className="bg-black/50 hover:bg-black/70 text-white border-0"
                >
                  <Maximize2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Tutorial Header */}
            <div className="space-y-4 mb-6">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <h1 className="text-3xl font-bold leading-tight">{tutorial.title}</h1>
                  <p className="text-lg text-muted-foreground">by {tutorial.author || 'Unknown Author'}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="px-3 py-1 text-sm">
                    {tutorial.category || 'Uncategorized'}
                  </Badge>
                  <Badge className="bg-red-100 text-red-800 px-3 py-1 text-sm">
                    Video Tutorial
                  </Badge>
                </div>
              </div>

              {/* Tutorial Stats */}
              <div className="flex items-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  <span className="font-medium">{tutorial.view_count || 0}</span>
                  <span>views</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span className="font-medium">{tutorial.duration || 'Unknown'}</span>
                  <span>duration</span>
                </div>
                <div className="flex items-center gap-2">
                  <Youtube className="h-4 w-4 text-red-600" />
                  <span>YouTube</span>
                </div>
              </div>
            </div>

            {/* Description */}
            {tutorial.description && (
              <div className="space-y-4 mb-6">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-semibold">Description</h2>
                </div>
                <div className="bg-muted/30 rounded-xl p-6">
                  <p className="text-foreground leading-relaxed text-lg">
                    {tutorial.description}
                  </p>
                </div>
              </div>
            )}

            {/* Action Section */}
            <div className="bg-gradient-to-r from-red-500/5 to-red-500/10 rounded-xl p-6 border border-red-500/20">
              <div className="text-center space-y-4">
                <h3 className="text-xl font-semibold">Ready to learn?</h3>
                <p className="text-muted-foreground">Use the video player above to watch this tutorial and enhance your skills.</p>
                <div className="flex justify-center gap-3">
                  <Button 
                    variant="outline" 
                    size="lg"
                    onClick={() => navigate('/tutorials')}
                  >
                    <BookOpen className="h-4 w-4 mr-2" />
                    Browse More Tutorials
                  </Button>
                  <Button
                    size="lg"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => setQuizOpen(true)}
                  >
                    <BookOpen className="h-4 w-4 mr-2" />
                    Get Certified
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Tutorial Details and Actions */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-6">
              {/* Quick Actions */}
              <div className="space-y-3">
                <Button 
                  onClick={() => {
                    // Scroll to video player and play
                    const videoElement = document.querySelector('.aspect-video');
                    if (videoElement) {
                      videoElement.scrollIntoView({ behavior: 'smooth' });
                    }
                  }}
                  className="w-full h-12 text-lg font-medium bg-red-600 hover:bg-red-700"
                  size="lg"
                >
                  <Play className="h-4 w-4 mr-2" />
                  Watch Tutorial
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
                    onClick={handleShareTutorial}
                  >
                    <Share2 className="h-4 w-4 mr-2" />
                    Share
                  </Button>
                </div>
              </div>

              {/* Tutorial Stats */}
              <div className="bg-muted/30 rounded-xl p-4 space-y-3">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Tutorial Statistics</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Views</span>
                    <span className="font-medium">{tutorial.view_count || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Duration</span>
                    <span className="font-medium">{tutorial.duration || 'Unknown'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Platform</span>
                    <span className="font-medium">YouTube</span>
                  </div>
                </div>
              </div>

              {/* Tutorial Details */}
              <div className="bg-muted/30 rounded-xl p-4 space-y-3">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Tutorial Information</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <User className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <span className="text-sm font-medium text-muted-foreground">Author</span>
                      <p className="font-medium">{tutorial.author || 'Unknown Author'}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <div className="w-4 h-4 rounded-full bg-primary/20" />
                    </div>
                    <div className="flex-1">
                      <span className="text-sm font-medium text-muted-foreground">Category</span>
                      <p className="font-medium">{tutorial.category || 'Uncategorized'}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-100 rounded-lg">
                      <Youtube className="w-4 h-4 text-red-600" />
                    </div>
                    <div className="flex-1">
                      <span className="text-sm font-medium text-muted-foreground">Video ID</span>
                      <p className="font-medium font-mono text-sm">{tutorial.youtubeId}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
      <TutorialModule open={modalOpen} onOpenChange={(v) => setModalOpen(v)} tutorial={tutorial} />

      {/* Quiz Embed Modal */}
      <Dialog open={quizOpen} onOpenChange={(v) => setQuizOpen(v)}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Get Certified</DialogTitle>
            <DialogDescription>Complete the quiz to earn a certificate for this tutorial.</DialogDescription>
          </DialogHeader>

          <div className="mt-4">
            {quizEmbedUrl ? (
              <>
                <iframe
                  src={quizEmbedUrl}
                  width="100%"
                  height="600"
                  frameBorder={0}
                  scrolling="no"
                  style={{ border: 'none', maxWidth: '100%' }}
                  allowFullScreen
                />

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-4">
                  <div className="flex items-center gap-3">
                    <Button
                      onClick={() => window.open(quizEmbedUrl, '_blank', 'noopener')}
                      className="bg-primary text-white"
                    >
                      Open quiz in new tab
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => navigator.clipboard.writeText(quizEmbedUrl)}
                    >
                      Copy quiz URL
                    </Button>
                  </div>

                  <div className="text-sm text-muted-foreground">
                    If the embed is blocked by your site CSP, <strong>open in a new tab</strong> instead or adjust your site's
                    CSP to allow the quiz domain.
                  </div>
                </div>

                <div className="mt-4 p-4 bg-muted/20 rounded-md">
                  <div className="text-sm font-medium mb-2">Embed code (copy & paste into your client site)</div>
                  <pre className="whitespace-pre-wrap text-xs bg-white p-3 rounded border overflow-auto">
{`<iframe src="${quizEmbedUrl}" width="100%" height="600px" frameborder="0" scrolling="no" style="border: none; max-width: 100%;" allow="fullscreen"></iframe>`}
                  </pre>

                  <div className="mt-3 text-xs">
                    <strong>Important:</strong> Do not embed your own site URL (e.g. `gentechsolution.netlify.app`) as the quiz src.
                    Ensure the iframe src points to the deployed quiz domain. If your site sets <code>frame-ancestors 'self'</code>
                    in its CSP, external embeds will be blocked.
                  </div>
                </div>
              </>
            ) : (
              <div className="p-6 text-center text-sm text-muted-foreground">
                No embed URL is configured for this tutorial. Please add an <code>embed_url</code> in the admin panel.
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TutorialPage;
