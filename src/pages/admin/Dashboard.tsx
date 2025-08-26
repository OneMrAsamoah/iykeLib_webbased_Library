import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  BookOpen, 
  GraduationCap, 
  Users, 
  Download, 
  Plus, 
  Video, 
  RefreshCw, 
  BarChart3, 
  Eye, 
  Star,
  Activity,
  Clock
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { getUserEmail } from '@/lib/auth-helper';

interface DashboardStats {
  users: {
    total: number;
    newThisMonth: number;
    activeThisWeek: number;
  };
  content: {
    totalBooks: number;
    totalTutorials: number;
    totalCategories: number;
  };
  engagement: {
    totalViews: number;
    totalDownloads: number;
    totalRatings: number;
  };
}

interface RecentActivity {
  id: string;
  action: string;
  time: string;
  author: string;
  type: 'book' | 'tutorial';
  created_at: string;
}

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      const userEmail = getUserEmail();
      
      if (!userEmail) {
        toast({
          title: "Authentication Error",
          description: "Please log in to view dashboard data",
          variant: "destructive"
        });
        return;
      }

      // Fetch analytics data
      const analyticsResponse = await fetch('/api/admin/analytics', {
        headers: {
          'x-user-email': userEmail
        }
      });

      if (!analyticsResponse.ok) {
        throw new Error('Failed to fetch analytics data');
      }

      const analyticsData: DashboardStats = await analyticsResponse.json();

      // Fetch recent activity
      const activityResponse = await fetch(`/api/admin/analytics/recent-activity?limit=8`, {
        headers: {
          'x-user-email': userEmail
        }
      });

      if (!activityResponse.ok) {
        throw new Error('Failed to fetch recent activity');
      }

      const activityData: RecentActivity[] = await activityResponse.json();

      setStats(analyticsData);
      setRecentActivities(activityData);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const statsCards = [
    {
      title: "Total Books",
      value: stats?.content.totalBooks?.toString() || "0",
      icon: <BookOpen className="h-5 w-5 text-blue-600 dark:text-blue-400" />,
      description: "Books in library"
    },
    {
      title: "Users",
      value: stats?.users.total?.toString() || "0",
      icon: <Users className="h-5 w-5 text-green-600 dark:text-green-400" />,
      description: "Registered users"
    },
    {
      title: "Tutorials",
      value: stats?.content.totalTutorials?.toString() || "0",
      icon: <GraduationCap className="h-5 w-5 text-purple-600 dark:text-purple-400" />,
      description: "Learning resources"
    },
    {
      title: "Downloads",
      value: stats?.engagement.totalDownloads?.toString() || "0",
      icon: <Download className="h-5 w-5 text-orange-600 dark:text-orange-400" />,
      description: "Total downloads"
    },
    {
      title: "Views",
      value: stats?.engagement.totalViews?.toString() || "0",
      icon: <Eye className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />,
      description: "Content views"
    },
    {
      title: "Ratings",
      value: stats?.engagement.totalRatings?.toString() || "0",
      icon: <Star className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />,
      description: "User ratings"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Library overview and analytics
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {lastUpdated.toLocaleTimeString()}
            </div>
          )}
          <button
            onClick={loadDashboardData}
            disabled={isLoading}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-background border border-border rounded-md hover:bg-accent hover:text-accent-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, index) => (
            <Card key={index} className="border border-border">
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="h-5 w-5 bg-muted rounded animate-pulse"></div>
                  <div className="space-y-2">
                    <div className="h-4 w-16 bg-muted rounded animate-pulse"></div>
                    <div className="h-6 w-12 bg-muted rounded animate-pulse"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          statsCards.map((stat, index) => (
            <Card key={index} className="border border-border hover:border-border/60 transition-colors">
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    {stat.icon}
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                    <p className="text-xs font-medium text-muted-foreground">{stat.title}</p>
                    <p className="text-xs text-muted-foreground/70">{stat.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Dashboard Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2">
          <Card className="border border-border">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Activity className="h-5 w-5 text-muted-foreground" />
                  Recent Activity
                </CardTitle>
                <Link to="/admin/activity-log" className="text-sm text-primary hover:text-primary/80 hover:underline">
                  View All
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {isLoading ? (
                  <div className="flex items-center justify-center py-6">
                    <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
                    <span className="ml-2 text-sm text-muted-foreground">Loading...</span>
                  </div>
                ) : recentActivities.length > 0 ? (
                  recentActivities.map((activity, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                        {activity.type === 'book' ? (
                          <BookOpen className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        ) : (
                          <GraduationCap className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">
                          {activity.action}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {activity.time} • by {activity.author}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6 text-muted-foreground">
                    <p className="text-sm">No recent activity</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div>
          <Card className="border border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-muted-foreground" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Link to="/admin/books">
                  <div className="p-4 border border-border rounded-lg hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/20 transition-all cursor-pointer group">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-950/30 flex items-center justify-center group-hover:bg-blue-200 dark:group-hover:bg-blue-950/50 transition-colors">
                        <Plus className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <h3 className="font-medium text-foreground text-sm">Add Book</h3>
                        <p className="text-xs text-muted-foreground">Upload new book</p>
                      </div>
                    </div>
                  </div>
                </Link>

                <Link to="/admin/tutorials">
                  <div className="p-4 border border-border rounded-lg hover:border-purple-300 dark:hover:border-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/20 transition-all cursor-pointer group">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-950/30 flex items-center justify-center group-hover:bg-purple-200 dark:group-hover:bg-purple-950/50 transition-colors">
                        <Video className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div>
                        <h3 className="font-medium text-foreground text-sm">Add Tutorial</h3>
                        <p className="text-xs text-muted-foreground">Create tutorial</p>
                      </div>
                    </div>
                  </div>
                </Link>

                <Link to="/admin/analytics">
                  <div className="p-4 border border-border rounded-lg hover:border-green-300 dark:hover:border-green-600 hover:bg-green-50 dark:hover:bg-green-950/20 transition-all cursor-pointer group">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-950/30 flex items-center justify-center group-hover:bg-green-200 dark:group-hover:bg-green-950/50 transition-colors">
                        <BarChart3 className="h-5 w-5 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <h3 className="font-medium text-foreground text-sm">View Analytics</h3>
                        <p className="text-xs text-muted-foreground">Detailed reports</p>
                      </div>
                    </div>
                  </div>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
