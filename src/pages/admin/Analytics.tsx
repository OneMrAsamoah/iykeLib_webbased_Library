import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  BookOpen, 
  GraduationCap, 
  TrendingUp, 
  Eye, 
  Download, 
  Star,
  Activity
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { getAnalyticsData, getMonthlyUserGrowth, getDailyActivity, AnalyticsData } from '@/lib/analytics';
import { useAuth } from '@/hooks/useAuth';
import useTheme from '@/hooks/use-theme';

// Define types for the chart data
interface UserGrowthData {
  month: string;
  newUsers: number;
  totalUsers: number;
}

interface DailyActivityData {
  date: string;
  activeUsers: number;
  pageViews: number;
  downloads: number;
}

const Analytics: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const { theme } = useTheme();
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [userGrowthData, setUserGrowthData] = useState<UserGrowthData[]>([]);
  const [dailyActivityData, setDailyActivityData] = useState<DailyActivityData[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30d');

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.email || !isAdmin) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const [analytics, growth, activity] = await Promise.all([
          getAnalyticsData(user.email),
          getMonthlyUserGrowth(user.email, 6),
          getDailyActivity(user.email, 7)
        ]);
        
        setAnalyticsData(analytics);
        setUserGrowthData(growth);
        setDailyActivityData(activity);
      } catch (error) {
        console.error('Error fetching analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user?.email, isAdmin]);

  // Show access denied if user is not admin
  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h1>
            <p className="text-muted-foreground">
              Access denied. Admin privileges required.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];
  const DARK_COLORS = ['#60A5FA', '#34D399', '#FBBF24', '#F87171', '#A78BFA', '#22D3EE'];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h1>
            <p className="text-muted-foreground">
              Loading platform performance data...
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!analyticsData) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h1>
            <p className="text-muted-foreground">
              Unable to load analytics data
            </p>
          </div>
        </div>
      </div>
    );
  }

  const kpiCards = [
    {
      title: "Total Users",
      value: analyticsData.users.total.toString(),
      change: `+${analyticsData.users.newThisMonth}`,
      changeType: "positive",
      icon: <Users className="h-5 w-5" />,
      description: "new this month"
    },
    {
      title: "Active Users",
      value: analyticsData.users.activeThisWeek.toString(),
      change: "this week",
      changeType: "neutral",
      icon: <Activity className="h-5 w-5" />,
      description: "active users"
    },
    {
      title: "Total Views",
      value: analyticsData.engagement.totalViews.toLocaleString(),
      change: "all time",
      changeType: "neutral",
      icon: <Eye className="h-5 w-5" />,
      description: "content views"
    },
    {
      title: "Downloads",
      value: analyticsData.engagement.totalDownloads.toLocaleString(),
      change: "all time",
      changeType: "neutral",
      icon: <Download className="h-5 w-5" />,
      description: "file downloads"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h1>
          <p className="text-muted-foreground">
            Platform performance and user engagement overview
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-2 border border-input rounded-md bg-background text-sm"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpiCards.map((kpi, index) => (
          <Card key={index} className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{kpi.title}</p>
                  <p className="text-3xl font-bold text-foreground">{kpi.value}</p>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className={`text-sm font-medium ${
                      kpi.changeType === 'positive' ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'
                    }`}>
                      {kpi.change}
                    </span>
                    <span className="text-xs text-muted-foreground">{kpi.description}</span>
                  </div>
                </div>
                <div className="p-3 rounded-full bg-primary/10 text-primary">
                  {kpi.icon}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Content Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Content Summary */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BookOpen className="h-5 w-5" />
              <span>Content Summary</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800">
              <div className="flex items-center space-x-3">
                <BookOpen className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <span className="font-medium text-blue-900 dark:text-blue-100">Books</span>
              </div>
              <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">{analyticsData.content.totalBooks}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 dark:bg-green-950/50 border border-green-200 dark:border-green-800">
              <div className="flex items-center space-x-3">
                <GraduationCap className="h-5 w-5 text-green-600 dark:text-green-400" />
                <span className="font-medium text-green-900 dark:text-green-100">Tutorials</span>
              </div>
              <span className="text-2xl font-bold text-green-600 dark:text-green-400">{analyticsData.content.totalTutorials}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-purple-50 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-800">
              <div className="flex items-center space-x-3">
                <TrendingUp className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                <span className="font-medium text-purple-900 dark:text-purple-100">Categories</span>
              </div>
              <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">{analyticsData.content.totalCategories}</span>
            </div>
          </CardContent>
        </Card>

        {/* User Growth Chart */}
        <Card className="border-0 shadow-lg lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5" />
              <span>User Growth (6 Months)</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={userGrowthData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="totalUsers" 
                  stroke={theme === 'dark' ? DARK_COLORS[0] : COLORS[0]} 
                  strokeWidth={2}
                  name="Total Users"
                />
                <Line 
                  type="monotone" 
                  dataKey="newUsers" 
                  stroke={theme === 'dark' ? DARK_COLORS[1] : COLORS[1]} 
                  strokeWidth={2}
                  name="New Users"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Content & Category Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Performing Content */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Star className="h-5 w-5" />
              <span>Top Performing Content</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analyticsData.topContent.slice(0, 5).map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center space-x-3">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <h4 className="font-medium text-sm truncate max-w-[200px]">{item.title}</h4>
                      <div className="flex items-center space-x-2">
                        <Badge variant="secondary" className="text-xs">{item.type}</Badge>
                        <Badge variant="outline" className="text-xs">{item.category}</Badge>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">{item.views.toLocaleString()} views</div>
                    {item.downloads && item.downloads > 0 && (
                      <div className="text-xs text-muted-foreground">{item.downloads} downloads</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Category Performance */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5" />
              <span>Category Performance</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analyticsData.categoryStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="totalViews" fill={theme === 'dark' ? DARK_COLORS[0] : COLORS[0]} name="Total Views" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Daily Activity */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="h-5 w-5" />
            <span>Daily Activity (Last 7 Days)</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dailyActivityData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="activeUsers" fill={theme === 'dark' ? DARK_COLORS[0] : COLORS[0]} name="Active Users" />
              <Bar dataKey="pageViews" fill={theme === 'dark' ? DARK_COLORS[1] : COLORS[1]} name="Page Views" />
              <Bar dataKey="downloads" fill={theme === 'dark' ? DARK_COLORS[2] : COLORS[2]} name="Downloads" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default Analytics;
