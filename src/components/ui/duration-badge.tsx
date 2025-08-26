import React from "react";
import { Clock } from "lucide-react";
import { Badge } from "./badge";

interface DurationBadgeProps {
  duration: string | number;
  variant?: "default" | "secondary" | "destructive" | "outline";
  size?: "sm" | "default" | "lg";
  showIcon?: boolean;
  className?: string;
}

export function DurationBadge({ 
  duration, 
  variant = "secondary", 
  size = "default",
  showIcon = true,
  className = ""
}: DurationBadgeProps) {
  // Format duration if it's a number (seconds)
  const formatDuration = (dur: string | number): string => {
    if (typeof dur === 'number') {
      if (dur <= 0) return '0:00';
      
      const hours = Math.floor(dur / 3600);
      const minutes = Math.floor((dur % 3600) / 60);
      const seconds = Math.floor(dur % 60);
      
      if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      }
      
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
    
    return dur;
  };

  const formattedDuration = formatDuration(duration);
  
  return (
    <Badge 
      variant={variant} 
      className={`inline-flex items-center gap-1 ${className}`}
    >
      {showIcon && <Clock className="h-3 w-3" />}
      <span>{formattedDuration}</span>
    </Badge>
  );
}
