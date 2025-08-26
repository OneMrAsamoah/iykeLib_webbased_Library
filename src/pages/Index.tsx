import { useState, useRef } from "react";
import { Search, BookOpen, Users, Globe, Download, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
// Removed fallback imports for in-repo sample data.
import { apiCall } from "@/lib/api";
import { useEffect } from "react";
import { createPortal } from "react-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DurationBadge } from "@/components/ui/duration-badge";
import Header from "@/components/Header";
import { ImageSlider } from "@/components/ImageSlider";
import { getVideoDuration, extractYouTubeId, testYouTubeAPI } from "@/lib/youtube-utils";

const Index = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [featured, setFeatured] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [booksCache, setBooksCache] = useState<any[] | null>(null);
  const [tutorialsCache, setTutorialsCache] = useState<any[] | null>(null);
  const searchWrapperRef = useRef<HTMLDivElement | null>(null);
  const [dropdownStyle, setDropdownStyle] = useState<Record<string, any>>({});

  // Fetch featured books and tutorials from API and derive thumbnails for tutorials
  useEffect(() => {
    let mounted = true;
    
    // Test YouTube API on page load
    testYouTubeAPI().then(isWorking => {
      console.log('YouTube API test result:', isWorking);
    });
    
    const loadFeatured = async () => {
      try {
        const booksResp = await apiCall('/api/books');
        const booksData = await booksResp.json();
        const books = Array.isArray(booksData) ? booksData : (booksData.books || []);

        const tResp = await apiCall('/api/tutorials');
        const tData = await tResp.json();
        const tutorials = Array.isArray(tData) ? tData : (tData.tutorials || []);

        const featuredBooks = books.slice(0, 2).map((b: any) => ({
          id: `book-${b.id}`,
          kind: 'book',
          title: b.title,
          subtitle: `by ${b.author || 'Unknown'} • ${b.category || ''}`,
          description: (b.description || '').length > 120 ? (b.description || '').substring(0, 120) + '...' : (b.description || ''),
          thumbnail: b.thumbnail || '/placeholder.svg',
          link: b.external_link ?? b.externalLink ?? `/books/${b.id}`,
          external: !!(b.external_link || b.externalLink),
        }));

        const extractYouTubeId = (input: string | undefined | null): string | null => {
          if (!input) return null;
          const s = String(input);
          const re = /(?:youtube\.com\/(?:.*v=|embed\/|v\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/;
          const m = s.match(re);
          if (m && m[1]) return m[1];
          try { const url = new URL(s); const v = url.searchParams.get('v'); if (v && /^[A-Za-z0-9_-]{11}$/.test(v)) return v; } catch (e) {}
          if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s;
          return null;
        };

        const featuredTutorials = await Promise.all(tutorials.slice(0, 2).map(async (t: any) => {
          const raw = t.youtube_video_id ?? t.youtube_id ?? t.youtubeId ?? t.youtube ?? t.youtube_url ?? t.content_url ?? '';
          const id = extractYouTubeId(raw) ?? '';
          const thumbnail = t.thumbnail ?? (id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : '/placeholder.svg');
          
          // Get video duration
          let duration = 'Unknown';
          if (raw) {
            try {
              console.log('Getting duration for tutorial:', t.id, 'URL:', raw);
              duration = await getVideoDuration(raw);
              console.log('Duration result for tutorial:', t.id, 'Duration:', duration);
            } catch (err) {
              console.warn('Failed to get duration for tutorial:', t.id, err);
            }
          }
          
          return {
            id: `t-${t.id}`,
            kind: 'tutorial',
            title: t.title,
            subtitle: t.category_name ?? t.category ?? '',
            description: (t.description || '').length > 120 ? (t.description || '').substring(0, 120) + '...' : (t.description || ''),
            thumbnail,
            link: `/tutorials/${t.id}`,
            external: false,
            duration,
            youtubeUrl: raw,
          };
        }));

        if (!mounted) return;
        setFeatured([...featuredBooks, ...featuredTutorials]);
      } catch (err) {
        console.error('Failed to load featured resources', err);
        // If API fails, show no featured items rather than using in-repo sample data
        setFeatured([]);
      }
    };
    loadFeatured();
    return () => { mounted = false; };
  }, []);

  // Load caches for client-side searching (server does not support q/limit params)
  useEffect(() => {
    let cancelled = false;
    const loadCaches = async () => {
      try {
        const [booksResp, tutorialsResp] = await Promise.all([apiCall('/api/books'), apiCall('/api/tutorials')]);
        const [booksJson, tutorialsJson] = await Promise.all([booksResp.json(), tutorialsResp.json()]);
        if (cancelled) return;
        const books = Array.isArray(booksJson) ? booksJson : (booksJson.books || []);
        const tutorials = Array.isArray(tutorialsJson) ? tutorialsJson : (tutorialsJson.tutorials || []);
        setBooksCache(books);
        setTutorialsCache(tutorials);
      } catch (err) {
        console.warn('Failed to load search caches', err);
      }
    };
    loadCaches();
    return () => { cancelled = true; };
  }, []);

  // Live suggestions: fetch books and tutorials as the user types
  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    // Use cached lists if available, otherwise wait until caches load
    const q = searchQuery.trim().toLowerCase();
    const computeSuggestions = () => {
      const bList = Array.isArray(booksCache) ? booksCache : [];
      const tList = Array.isArray(tutorialsCache) ? tutorialsCache : [];

      const bItems = bList
        .filter((b: any) => (String(b.title || '') + ' ' + String(b.author || '') + ' ' + String(b.category_name || b.category || '')).toLowerCase().includes(q))
        .slice(0, 5)
        .map((b: any) => ({ id: b.id, kind: 'book', title: b.title, subtitle: `by ${b.author || 'Unknown'}`, link: `/books/${b.id}` }));

      const tItems = tList
        .filter((t: any) => (String(t.title || '') + ' ' + String(t.category_name || t.category || '')).toLowerCase().includes(q))
        .slice(0, 5)
        .map((t: any) => ({ id: t.id, kind: 'tutorial', title: t.title, subtitle: t.category_name || t.category || '', link: `/tutorials/${t.id}` }));

      setSuggestions([...bItems, ...tItems].slice(0, 8));
    };

    // Debounce locally
    const timer = setTimeout(() => {
      computeSuggestions();
    }, 200);

    return () => clearTimeout(timer);
  }, [searchQuery, booksCache, tutorialsCache]);

  // Position dropdown in the document body so it's not clipped by the frosted hero
  useEffect(() => {
    if (!suggestionsOpen || !searchWrapperRef.current) return;
    const rect = searchWrapperRef.current.getBoundingClientRect();
    setDropdownStyle({
      position: 'absolute',
      left: `${rect.left + window.scrollX}px`,
      top: `${rect.bottom + window.scrollY + 8}px`,
      width: `${rect.width}px`,
      zIndex: 9999,
      maxHeight: '288px',
    });

    const onScroll = () => {
      const r = searchWrapperRef.current?.getBoundingClientRect();
      if (r) setDropdownStyle((s) => ({ ...s, left: `${r.left + window.scrollX}px`, top: `${r.bottom + window.scrollY + 8}px`, width: `${r.width}px` }));
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); };
  }, [suggestionsOpen]);

  const [categoriesList, setCategoriesList] = useState<{ name: string; count?: number; icon?: string }[]>([]);
  const [catsLoading, setCatsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    const loadCats = async () => {
      try {
        const res = await apiCall('/api/categories');
        if (!res.ok) throw new Error('Failed to fetch categories');
        const data = await res.json();
        if (!mounted) return;
        const mapped = Array.isArray(data)
          ? data.map((c: any) => ({ name: c.name, count: Number(c.bookCount || 0) + Number(c.tutorialCount || 0) }))
          : [];
        // deterministic emoji mapping based on category name
        const emojiFor = (n: string) => {
          const emojis = ['💻','⚡','🌐','🤖','🗄️','🔒','📚','📂','🧠','📊','🔧'];
          let h = 0;
          for (let i = 0; i < n.length; i++) h = (h * 31 + n.charCodeAt(i)) >>> 0;
          return emojis[h % emojis.length];
        };
        const withIcons = mapped.map((m: any) => ({ ...m, icon: emojiFor(m.name) }));
        setCategoriesList(withIcons);
        setCatsLoading(false);
      } catch (err) {
        console.error('Failed to load categories for index', err);
        setCatsLoading(false);
      }
    };

    loadCats();
    return () => { mounted = false; };
  }, []);

  const stats = [
    { label: "Total Resources", value: "1,200+", icon: BookOpen },
    { label: "Active Students", value: "15,000+", icon: Users },
    { label: "Universities", value: "25+", icon: Globe },
    { label: "Downloads", value: "50k+", icon: Download }
  ];

  // Hero section background images
  const heroImages = [
    "/slider1.jpg", // Replace with your actual slider.png images
    "/slider2.jpg",
    "/slider3.jpg"
  ];

  const handleSearch = () => {
    const q = searchQuery.trim();
    if (!q) return navigate('/books');
    navigate(`/books?q=${encodeURIComponent(q)}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        {/* Background Image Slider */}
        <div className="absolute inset-0 z-0">
                     <ImageSlider 
             images={heroImages} 
             autoPlayInterval={6000}
             className="w-full h-full"
           />
        </div>
        
        {/* Glass Style Content Overlay */}
        <div className="relative z-10 container mx-auto max-w-6xl text-center px-4">
          {/* Glass Container */}
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-8 md:p-12 shadow-2xl relative overflow-hidden">
            {/* Glass shine effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-white/10 pointer-events-none"></div>
            <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-white via-white to-gray-200 bg-clip-text text-transparent drop-shadow-lg">
              iYKELib
            </h1>
            <p className="text-xl md:text-2xl text-white mb-8 max-w-3xl mx-auto drop-shadow-lg font-medium">
              Open access to quality computing education resources for students across Ghana
            </p>
            
            {/* Search Bar */}
            <div ref={searchWrapperRef} className="relative max-w-2xl mx-auto mb-8">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
              <Input
                type="text"
                placeholder="Search for textbooks, tutorials, research papers..."
                className="pl-12 h-14 text-lg bg-white/90 backdrop-blur-md border border-white/30 shadow-xl"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setSuggestionsOpen(true); }}
                onKeyDown={(e) => { if (e.key === 'Enter') { handleSearch(); } }}
              />
              <Button type="button" size="lg" onClick={handleSearch} className="absolute right-2 top-2 bg-primary/90 hover:bg-primary backdrop-blur-sm shadow-xl">
                Search
              </Button>

              {/* Suggestions dropdown */}
              {suggestionsOpen && suggestions.length > 0 && typeof document !== 'undefined' && createPortal(
                <div style={dropdownStyle as any} className="bg-white rounded-lg shadow-lg overflow-hidden">
                  <ul className="max-h-72 overflow-auto">
                    {suggestions.map((s, idx) => (
                      <li key={`${s.kind}-${s.id}-${idx}`}>
                        <button
                          className="w-full text-left px-4 py-3 hover:bg-muted/20 flex items-center gap-3"
                          onMouseDown={(ev) => ev.preventDefault()}
                          onClick={() => { setSuggestionsOpen(false); navigate(s.link); }}
                        >
                          <div className="flex-1">
                            <div className="font-medium">{s.title}</div>
                            <div className="text-sm text-muted-foreground">{s.subtitle}</div>
                          </div>
                          <div className="text-xs text-muted-foreground uppercase">{s.kind}</div>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>,
                document.body
              )}
            </div>

            {/* Quick Access Categories */}
            <div className="flex flex-wrap justify-center gap-3 mb-4">
              {(() => {
                const fallbackQuick = [
                  { name: 'Computer Science', icon: '💻' },
                  { name: 'Programming', icon: '⚡' },
                  { name: 'Web Development', icon: '🌐' },
                  { name: 'AI/ML', icon: '🤖' },
                ];
                const quick = (categoriesList && categoriesList.length ? categoriesList : fallbackQuick).slice(0, 4);
                return quick.map((category) => (
                  <Button key={category.name} variant="secondary" className="text-sm bg-white/80 hover:bg-white/95 backdrop-blur-md border border-white/30 shadow-xl transition-all duration-300 hover:scale-105" onClick={() => navigate(`/categories/${encodeURIComponent(category.name)}`)}>
                    <span className="mr-2">{(category as any).icon ?? '📚'}</span>
                    {category.name}
                  </Button>
                ));
              })()}
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      {/* <section className="py-12 px-4 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-primary/10 rounded-full mb-3">
                  <stat.icon className="h-6 w-6 text-primary" />
                </div>
                <div className="text-3xl font-bold text-primary mb-1">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section> */}

      {/* Featured Resources */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Featured Resources</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Curated high-quality educational materials for computing students
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-2 gap-8">
            {featured.map((item) => (
              <Card key={item.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="p-0">
                  <div className="w-full h-44 bg-gray-100 relative">
                    <img src={item.thumbnail} alt={item.title} className="w-full h-full object-cover rounded-t-lg" />
                  </div>
                </CardHeader>
                <CardContent>
                  <CardTitle className="text-xl">{item.title}</CardTitle>
                  <CardDescription className="text-base text-muted-foreground mb-2">{item.subtitle}</CardDescription>
                  <p className="text-muted-foreground mb-4">{item.description}</p>
                  
                  {/* Show duration for tutorials */}
                  {item.kind === 'tutorial' && item.duration && (
                    <div className="mb-3">
                      <DurationBadge duration={item.duration} variant="outline" />
                    </div>
                  )}
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">{item.kind === 'book' ? 'Book' : 'Tutorial'}</span>
                    {item.external ? (
                      <Button size="sm" asChild>
                        <a href={item.link} target="_blank" rel="noopener noreferrer">
                          <Download className="h-4 w-4 mr-2" />
                          Access
                        </a>
                      </Button>
                    ) : (
                      <Button size="sm" asChild>
                        <a href={item.link}>
                          <Download className="h-4 w-4 mr-2" />
                          View
                        </a>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Browse by Category</h2>
            <p className="text-lg text-muted-foreground">
              Explore resources organized by computing disciplines
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            {(() => {
              const fallback = [
                { name: 'Computer Science', count: 245, icon: '💻' },
                { name: 'Programming', count: 189, icon: '⚡' },
                { name: 'Web Development', count: 156, icon: '🌐' },
                { name: 'AI/ML', count: 98, icon: '🤖' },
                { name: 'Database Systems', count: 134, icon: '🗄️' },
              ];
              const cats = (categoriesList && categoriesList.length ? categoriesList : fallback).slice(0, 5);
              return (
                <>
                  {cats.map((category, index) => (
                    <Card key={category.name + index} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/categories/${encodeURIComponent(category.name)}`)}>
                      <CardContent className="p-6 text-center">
                        <div className="text-4xl mb-3">{(category as any).icon ?? '📚'}</div>
                        <h3 className="font-semibold text-lg mb-2">{category.name}</h3>
                        <p className="text-muted-foreground">{category.count ?? ''} resources</p>
                      </CardContent>
                    </Card>
                  ))}

                  {/* Browse Categories card */}
                  <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/categories')}>
                    <CardContent className="p-6 text-center">
                      <div className="text-4xl mb-3">📂</div>
                      <h3 className="font-semibold text-lg mb-2">Browse Categories</h3>
                      <p className="text-muted-foreground">See all categories</p>
                    </CardContent>
                  </Card>
                </>
              );
            })()}
          </div>
        </div>
      </section>

      {/* Mission Statement */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">Our Mission</h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            To democratize access to quality computing education resources for students across Ghana, 
            bridging the knowledge gap through open educational resources and fostering independent 
            learning in computing fields. We believe that every student deserves access to the best 
            educational materials, regardless of their economic background.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 bg-muted border-t">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <h3 className="font-semibold text-lg mb-4">iYKELib</h3>
              <p className="text-muted-foreground">
                Empowering computing students across Ghana with open access to quality educational resources.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li><a href="#" className="hover:text-foreground">Browse Resources</a></li>
                <li><a href="#" className="hover:text-foreground">Submit Resource</a></li>
                <li><a href="#" className="hover:text-foreground">About Us</a></li>
                <li><a href="#" className="hover:text-foreground">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Categories</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li><a href="#" className="hover:text-foreground">Computer Science</a></li>
                <li><a href="#" className="hover:text-foreground">Programming</a></li>
                <li><a href="#" className="hover:text-foreground">Web Development</a></li>
                <li><a href="#" className="hover:text-foreground">AI & Machine Learning</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t mt-8 pt-8 text-center text-muted-foreground">
            <p>&copy; 2025 iYKELib. Open access for all students.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;