import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { User, Settings, LogOut, ChevronDown } from 'lucide-react';

export default function ProfileAvatar() {
  const { user, userProfile, isLoading, isAdmin, signOut, createProfile, refreshUserData } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Refresh user data if user is logged in but profile is missing
  useEffect(() => {
    if (user && !userProfile && !isLoading) {
      console.log('ProfileAvatar: User logged in but profile missing, refreshing user data');
      refreshUserData();
    }
  }, [user, userProfile, isLoading, refreshUserData]);

  // Safely extract optional avatar URL from user metadata without assuming its shape
  const getAvatarUrlFromMetadata = (metadata: unknown): string | undefined => {
    if (metadata && typeof metadata === 'object' && 'avatar_url' in metadata) {
      const value = (metadata as { avatar_url?: unknown }).avatar_url;
      return typeof value === 'string' ? value : undefined;
    }
    return undefined;
  };

  const avatarUrl = getAvatarUrlFromMetadata(user?.user_metadata);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Don't render anything while loading or if no user
  if (isLoading || !user) return null;
  
  // Show fallback avatar if profile data is missing
  if (!userProfile) {
    return (
      <div ref={dropdownRef} className="relative">
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center space-x-2 p-2 h-auto">
              <Avatar className="h-8 w-8">
                <AvatarImage src={avatarUrl} alt="User" />
                <AvatarFallback className="bg-primary text-primary-foreground text-sm font-medium">
                  {user.email?.[0]?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="hidden md:flex flex-col items-start text-left">
                <span className="text-sm font-medium leading-none">
                  {user.user_metadata?.display_name || user.email?.split('@')[0] || 'User'}
                </span>
                <span className="text-xs text-muted-foreground leading-none">
                  Loading...
                </span>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">
                  {user.user_metadata?.display_name || user.email?.split('@')[0] || 'User'}
                </p>
                <p className="text-xs leading-none text-muted-foreground">
                  {user.email}
                </p>
              </div>
            </DropdownMenuLabel>
            
            <DropdownMenuSeparator />
            
            <DropdownMenuItem onClick={createProfile} className="cursor-pointer">
              <User className="mr-2 h-4 w-4" />
              <span>Create Profile</span>
            </DropdownMenuItem>
            
            <DropdownMenuSeparator />
            
            <DropdownMenuItem onClick={signOut} className="cursor-pointer">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  const getInitials = (name: string | null, email: string | null) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    if (email) {
      return email[0].toUpperCase();
    }
    return 'U';
  };

  // Ensure we always have a meaningful display name
  const displayName = userProfile.display_name || 
                     userProfile.email?.split('@')[0] || 
                     user?.email?.split('@')[0] || 
                     'User';
  
  // Debug logging
  console.log('ProfileAvatar - userProfile:', userProfile);
  console.log('ProfileAvatar - displayName:', displayName);
  console.log('ProfileAvatar - user:', user);
  console.log('ProfileAvatar - user.user_metadata:', user?.user_metadata);

  return (
    <div ref={dropdownRef} className="relative">
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="flex items-center space-x-2 p-2 h-auto">
            <Avatar className="h-8 w-8">
              <AvatarImage src={avatarUrl} alt={displayName} />
              <AvatarFallback className="bg-primary text-primary-foreground text-sm font-medium">
                {getInitials(userProfile.display_name, userProfile.email)}
              </AvatarFallback>
            </Avatar>
            <div className="hidden md:flex flex-col items-start text-left">
              <span className="text-sm font-medium leading-none">{displayName}</span>
              <span className="text-xs text-muted-foreground leading-none">
                {isAdmin ? 'Admin' : 'User'}
              </span>
            </div>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">{displayName}</p>
              <p className="text-xs leading-none text-muted-foreground">
                {userProfile.email}
              </p>
            </div>
          </DropdownMenuLabel>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem asChild>
            <Link to="/profile" className="cursor-pointer">
              <User className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </Link>
          </DropdownMenuItem>
          
          {isAdmin && (
            <DropdownMenuItem asChild>
              <Link to="/admin" className="cursor-pointer">
                <Settings className="mr-2 h-4 w-4" />
                <span>Admin Panel</span>
              </Link>
            </DropdownMenuItem>
          )}
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem onClick={signOut} className="cursor-pointer">
            <LogOut className="mr-2 h-4 w-4" />
            <span>Log out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
