export interface AnalyticsData {
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
  topContent: Array<{
    id: string;
    title: string;
    type: 'book' | 'tutorial';
    views: number;
    downloads?: number;
    category: string;
  }>;
  categoryStats: Array<{
    name: string;
    bookCount: number;
    tutorialCount: number;
    totalViews: number;
  }>;
}

export const getAnalyticsData = async (userEmail: string): Promise<AnalyticsData> => {
  try {
    const response = await fetch('/api/admin/analytics', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-user-email': userEmail
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching analytics data:', error);
    // Return default data structure on error
    return {
      users: { total: 0, newThisMonth: 0, activeThisWeek: 0 },
      content: { totalBooks: 0, totalTutorials: 0, totalCategories: 0 },
      engagement: { totalViews: 0, totalDownloads: 0, totalRatings: 0 },
      topContent: [],
      categoryStats: [],
    };
  }
};

export const getMonthlyUserGrowth = async (userEmail: string, months: number = 6): Promise<Array<{
  month: string;
  newUsers: number;
  totalUsers: number;
}>> => {
  try {
    const response = await fetch(`/api/admin/analytics/user-growth?months=${months}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-user-email': userEmail
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching user growth data:', error);
    return [];
  }
};

export const getDailyActivity = async (userEmail: string, days: number = 7): Promise<Array<{
  date: string;
  activeUsers: number;
  pageViews: number;
  downloads: number;
}>> => {
  try {
    const response = await fetch(`/api/admin/analytics/daily-activity?days=${days}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-user-email': userEmail
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching daily activity data:', error);
    return [];
  }
};
