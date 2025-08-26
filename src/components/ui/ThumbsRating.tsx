import { ThumbsUp, ThumbsDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';

interface ThumbsRatingProps {
  contentId: string;
  contentType: 'book' | 'tutorial';
  initialUpVotes: number;
  initialDownVotes: number;
  initialUserVote: 1 | -1 | null;
  readonly?: boolean;
}

export function ThumbsRating({
  contentId,
  contentType,
  initialUpVotes,
  initialDownVotes,
  initialUserVote,
  readonly = false,
}: ThumbsRatingProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [upVotes, setUpVotes] = useState(initialUpVotes);
  const [downVotes, setDownVotes] = useState(initialDownVotes);

  const voteStatus = initialUserVote === 1 ? 'up' : initialUserVote === -1 ? 'down' : null;
  const [userVote, setUserVote] = useState<'up' | 'down' | null>(voteStatus);
  const [isVoting, setIsVoting] = useState(false);

  const handleVote = async (vote: 'up' | 'down') => {
    if (readonly) return;
    
    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'You must be logged in to vote.',
        variant: 'destructive',
      });
      return;
    }

    setIsVoting(true);

    const oldUserVote = userVote;
    const oldUpVotes = upVotes;
    const oldDownVotes = downVotes;

    let newUserVote: 'up' | 'down' | null = vote;
    if (userVote === vote) {
      newUserVote = null;
    }

    // Optimistic UI update
    setUserVote(newUserVote);
    if (vote === 'up') {
      if (oldUserVote === 'up') setUpVotes(v => v - 1);
      else if (oldUserVote === 'down') { setUpVotes(v => v + 1); setDownVotes(v => v - 1); }
      else setUpVotes(v => v + 1);
    } else {
      if (oldUserVote === 'down') setDownVotes(v => v - 1);
      else if (oldUserVote === 'up') { setDownVotes(v => v + 1); setUpVotes(v => v - 1); }
      else setDownVotes(v => v + 1);
    }

    try {
      const response = await fetch('/api/ratings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': user.email,
        },
        body: JSON.stringify({
          content_id: contentId,
          content_type: contentType,
          vote,
        }),
      });

      if (!response.ok) {
        // If server returns validation about duplicate vote, fetch current vote state
        const errText = await response.text().catch(() => null);
        throw new Error(errText || 'Failed to submit vote.');
      }

      // After a successful POST, fetch the latest vote counts and user vote to ensure UI sync
      const refreshRes = await fetch(`/api/${contentType === 'book' ? 'books' : 'tutorials'}/${contentId}`);
      if (refreshRes.ok) {
        const refreshed = await refreshRes.json();
        setUpVotes(typeof refreshed.up_votes === 'number' ? refreshed.up_votes : upVotes);
        setDownVotes(typeof refreshed.down_votes === 'number' ? refreshed.down_votes : downVotes);
        setUserVote(refreshed.user_vote === 1 ? 'up' : refreshed.user_vote === -1 ? 'down' : null);
      }
    } catch (error) {
      // Revert optimistic update on failure
      setUserVote(oldUserVote);
      setUpVotes(oldUpVotes);
      setDownVotes(oldDownVotes);
      toast({
        title: 'Error',
        description: 'Your vote could not be saved. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsVoting(false);
    }
  };

  if (readonly) {
    return (
      <div className="flex items-center space-x-2">
        <div className="flex items-center space-x-1 text-muted-foreground">
          <ThumbsUp className="h-4 w-4" />
          <span>{upVotes}</span>
        </div>
        <div className="flex items-center space-x-1 text-muted-foreground">
          <ThumbsDown className="h-4 w-4" />
          <span>{downVotes}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-2">
      <Button
        variant="ghost"
        size="sm"
        onClick={(e) => { e.stopPropagation(); handleVote('up'); }}
        disabled={isVoting}
        className={`flex items-center space-x-1 ${userVote === 'up' ? 'text-blue-600' : 'text-muted-foreground'}`}
      >
        <ThumbsUp className="h-4 w-4" />
        <span>{upVotes}</span>
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={(e) => { e.stopPropagation(); handleVote('down'); }}
        disabled={isVoting}
        className={`flex items-center space-x-1 ${userVote === 'down' ? 'text-red-600' : 'text-muted-foreground'}`}
      >
        <ThumbsDown className="h-4 w-4" />
        <span>{downVotes}</span>
      </Button>
    </div>
  );
}
