import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Search, 
  Filter, 
  Download, 
  RefreshCw, 
  User, 
  BookOpen, 
  GraduationCap, 
  Tag, 
  Settings,
  AlertCircle,
  CheckCircle,
  Info,
  Clock,
  Calendar,
  Activity
} from 'lucide-react';
import { format } from 'date-fns';

interface ActivityLog {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  action: string;
  resource_type: 'user' | 'book' | 'tutorial' | 'category' | 'system';
  resource_id: string;
  resource_name: string;
  details: string;
  ip_address: string;
  user_agent: string;
  status: 'success' | 'warning' | 'error' | 'info';
  created_at: string;
  metadata?: Record<string, any>;
}

interface ActivityStats {
  total_activities: number;
  today_activities: number;
  this_week_activities: number;
  this_month_activities: number;
  success_rate: number;
  top_users: Array<{ user_name: string; activity_count: number }>;
  top_actions: Array<{ action: string; count: number }>;
}

export default function ActivityLog() {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [filteredActivities, setFilteredActivities] = useState<ActivityLog[]>([]);
  const [stats, setStats] = useState<ActivityStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedResourceType, setSelectedResourceType] = useState<string>('all');
  const [selectedDateRange, setSelectedDateRange] = useState<string>('7d');
  const [selectedUser, setSelectedUser] = useState<string>('all');

  useEffect(() => {
    fetchActivityLogs();
    fetchActivityStats();
  }, []);

  useEffect(() => {
    filterActivities();
  }, [activities, searchTerm, selectedStatus, selectedResourceType, selectedDateRange, selectedUser]);

  const fetchActivityLogs = async () => {
    try {
      setIsLoading(true);
      // Try fetching activity logs from API
      const res = await fetch('/api/admin/activity-logs');
      if (!res.ok) {
        const fallback = await fetch('/api/activity-logs');
        if (!fallback.ok) throw new Error('Failed to fetch activity logs');
        const data = await fallback.json();
        setActivities(Array.isArray(data) ? data : (data.logs || []));
        return;
      }
      const data = await res.json();
      setActivities(Array.isArray(data) ? data : (data.logs || []));
    } catch (error) {
      console.error('Error fetching activity logs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchActivityStats = async () => {
    try {
      // Fetch stats from backend
      const res = await fetch('/api/admin/activity-stats');
      if (!res.ok) {
        setStats(null);
        return;
      }
      const data = await res.json();
      setStats(data || null);
    } catch (error) {
      console.error('Error fetching activity stats:', error);
    }
  };

  const filterActivities = () => {
    let filtered = [...activities];

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(activity =>
        activity.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        activity.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        activity.resource_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        activity.details.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by status
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(activity => activity.status === selectedStatus);
    }

    // Filter by resource type
    if (selectedResourceType !== 'all') {
      filtered = filtered.filter(activity => activity.resource_type === selectedResourceType);
    }

    // Filter by user
    if (selectedUser !== 'all') {
      filtered = filtered.filter(activity => activity.user_id === selectedUser);
    }

    // Filter by date range
    const now = new Date();
    const filterDate = new Date();
    
    switch (selectedDateRange) {
      case '1d':
        filterDate.setDate(now.getDate() - 1);
        break;
      case '7d':
        filterDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        filterDate.setDate(now.getDate() - 30);
        break;
      case '90d':
        filterDate.setDate(now.getDate() - 90);
        break;
    }

    if (selectedDateRange !== 'all') {
      filtered = filtered.filter(activity => new Date(activity.created_at) >= filterDate);
    }

    setFilteredActivities(filtered);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'info':
        return <Info className="h-4 w-4 text-blue-500" />;
      default:
        return <Info className="h-4 w-4 text-gray-500" />;
    }
  };

  const getResourceTypeIcon = (type: string) => {
    switch (type) {
      case 'user':
        return <User className="h-4 w-4" />;
      case 'book':
        return <BookOpen className="h-4 w-4" />;
      case 'tutorial':
        return <GraduationCap className="h-4 w-4" />;
      case 'category':
        return <Tag className="h-4 w-4" />;
      case 'system':
        return <Settings className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      success: { variant: 'default', className: 'bg-green-100 text-green-800 hover:bg-green-100' },
      warning: { variant: 'secondary', className: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100' },
      error: { variant: 'destructive', className: 'bg-red-100 text-red-800 hover:bg-red-100' },
      info: { variant: 'secondary', className: 'bg-blue-100 text-blue-800 hover:bg-blue-100' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.info;

    return (
      <Badge variant={config.variant as any} className={config.className}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const exportActivityLogs = () => {
    // Implementation for exporting activity logs
    console.log('Exporting activity logs...');
  };

  const refreshData = () => {
    fetchActivityLogs();
    fetchActivityStats();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Activity Log</h1>
          <p className="text-muted-foreground mt-2">
            Monitor and track all system activities, user actions, and resource changes
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={refreshData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={exportActivityLogs}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Activities</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_activities.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                All time activities
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.today_activities}</div>
              <p className="text-xs text-muted-foreground">
                Activities today
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">This Week</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.this_week_activities}</div>
              <p className="text-xs text-muted-foreground">
                Activities this week
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.success_rate}%</div>
              <p className="text-xs text-muted-foreground">
                Successful operations
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>Filters & Search</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            <div className="lg:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search activities..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="error">Error</SelectItem>
                <SelectItem value="info">Info</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedResourceType} onValueChange={setSelectedResourceType}>
              <SelectTrigger>
                <SelectValue placeholder="Resource Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="user">Users</SelectItem>
                <SelectItem value="book">Books</SelectItem>
                <SelectItem value="tutorial">Tutorials</SelectItem>
                <SelectItem value="category">Categories</SelectItem>
                <SelectItem value="system">System</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedDateRange} onValueChange={setSelectedDateRange}>
              <SelectTrigger>
                <SelectValue placeholder="Date Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1d">Last 24 hours</SelectItem>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                <SelectItem value="all">All time</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Activity Log Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Activity Log</span>
            <div className="text-sm text-muted-foreground">
              {filteredActivities.length} activities found
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Resource</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>IP Address</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredActivities.map((activity) => (
                  <TableRow key={activity.id}>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <div className="font-medium">{activity.user_name}</div>
                          <div className="text-sm text-muted-foreground">{activity.user_email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {getResourceTypeIcon(activity.resource_type)}
                        <Badge variant="outline">{activity.action}</Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {getResourceTypeIcon(activity.resource_type)}
                        <span className="font-medium">{activity.resource_name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-xs truncate" title={activity.details}>
                        {activity.details}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(activity.status)}
                        {getStatusBadge(activity.status)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {activity.ip_address}
                      </code>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{format(new Date(activity.created_at), 'MMM dd, yyyy')}</div>
                        <div className="text-muted-foreground">
                          {format(new Date(activity.created_at), 'HH:mm:ss')}
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredActivities.length === 0 && (
            <div className="text-center py-8">
              <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground mb-2">No activities found</h3>
              <p className="text-muted-foreground">
                Try adjusting your filters or search terms
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
