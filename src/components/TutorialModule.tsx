import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Play, Eye, Clock, User, Youtube, X, ExternalLink } from "lucide-react";
import YouTubePlayer from "@/components/YouTubePlayer";
import { formatDuration } from "@/lib/youtube-utils";
import { DurationBadge } from "@/components/ui/duration-badge";

type Tutorial = {
  id: string;
  title: string;
  description?: string;
  youtubeId: string;
  category?: string;
  view_count?: number;
  duration?: string;
  author?: string;
};

export default function TutorialModule({ open, onOpenChange, tutorial }: { open: boolean; onOpenChange: (v: boolean) => void; tutorial?: Tutorial | null }) {
  const [videoDuration, setVideoDuration] = useState<string>('Unknown');
  
  if (!tutorial) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-red-600/10 rounded-full">
                <Youtube className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold text-left">
                  {tutorial.title}
                </DialogTitle>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <span>by {tutorial.author || 'Unknown Author'}</span>
                  {tutorial.category && (
                    <Badge variant="secondary" className="text-xs">
                      {tutorial.category}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Video Player */}
          <div className="relative aspect-video w-full bg-black rounded-xl overflow-hidden shadow-2xl">
            <YouTubePlayer 
              youtubeId={tutorial.youtubeId} 
              className="w-full h-full"
              onDurationChange={(duration) => setVideoDuration(formatDuration(duration))}
            />
            
            {/* Play button overlay */}
            <div className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/10 transition-colors duration-300">
              <div className="w-20 h-20 bg-red-600 rounded-full flex items-center justify-center shadow-2xl opacity-90 hover:opacity-100 transition-opacity duration-300">
                <Play className="w-10 h-10 text-white ml-1" />
              </div>
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
              <DurationBadge duration={videoDuration} variant="secondary" showIcon={false} />
              <span>duration</span>
            </div>
            <div className="flex items-center gap-2">
              <Youtube className="h-4 w-4 text-red-600" />
              <span>YouTube</span>
            </div>
          </div>

          <Separator />

          {/* Description Section */}
          {tutorial.description && (
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
                  {tutorial.description}
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
                  <span className="text-sm text-muted-foreground ml-auto">{tutorial.author || 'Unknown Author'}</span>
                </div>
                {tutorial.category && (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 rounded-full bg-primary/20" />
                    <span className="text-sm font-medium">Category</span>
                    <span className="text-sm text-muted-foreground ml-auto">{tutorial.category}</span>
                  </div>
                )}
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
                  <span className="text-sm text-muted-foreground ml-auto">{tutorial.view_count || 0}</span>
                </div>
                                 <div className="flex items-center gap-2">
                   <Clock className="h-4 w-4 text-muted-foreground" />
                   <span className="text-sm font-medium">Duration</span>
                   <span className="text-sm text-muted-foreground ml-auto">
                     <DurationBadge duration={videoDuration} variant="outline" size="sm" showIcon={false} />
                   </span>
                 </div>
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 rounded-full bg-green-100" />
                  <span className="text-sm font-medium">Type</span>
                  <span className="text-sm text-muted-foreground ml-auto">Video Tutorial</span>
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
                onClick={() => {
                  // Open tutorial in new tab
                  window.open(`/tutorials/${tutorial.id}`, '_blank');
                }}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Open Full Page
              </Button>
              
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => {
                  // Copy tutorial link to clipboard
                  const url = `${window.location.origin}/tutorials/${tutorial.id}`;
                  navigator.clipboard.writeText(url);
                  alert('Tutorial link copied to clipboard!');
                }}
              >
                <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                </svg>
                Copy Link
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
