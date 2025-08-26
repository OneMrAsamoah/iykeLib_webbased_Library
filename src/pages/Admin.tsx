import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Users, Shield, Crown, UserCheck, UserX } from 'lucide-react';

interface UserProfile {
  id: string;
  user_id: string;
  display_name: string | null;
  email: string | null;
  created_at: string;
}

interface UserRole {
  id: string;
  user_id: string;
  role: string;
}

export default function Admin() {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isAdmin) {
      fetchUserData();
    }
  }, [isAdmin]);

  const fetchUserData = async () => {
    try {
      // Fetch profiles and roles from backend
      const pResp = await fetch('/api/admin/profiles');
      const rResp = await fetch('/api/admin/roles');
      if (!pResp.ok || !rResp.ok) throw new Error('Failed to fetch user data');
      const pData = await pResp.json();
      const rData = await rResp.json();
      const profilesList: UserProfile[] = Array.isArray(pData) ? pData.map((p: any) => ({ id: p.id?.toString(), user_id: p.user_id, display_name: p.display_name || null, email: p.email || null, created_at: p.created_at || new Date().toISOString() })) : [];
      const rolesList: UserRole[] = Array.isArray(rData) ? rData.map((r: any) => ({ id: r.id?.toString(), user_id: r.user_id, role: r.role })) : [];
      setProfiles(profilesList);
      setRoles(rolesList);
    } catch (error) {
      console.error('Error fetching user data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch user data",
        variant: "destructive"
      });
      setProfiles([]);
      setRoles([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      // TODO: Implement MySQL role update
      console.log('MySQL role update not yet implemented');
      
      toast({
        title: "Success",
        description: `User role updated to ${newRole} (mock)`,
      });
      
      // Update local state
      setRoles(prev => prev.map(role => 
        role.user_id === userId ? { ...role, role: newRole } : role
      ));
    } catch (error) {
      console.error('Error updating user role:', error);
      toast({
        title: "Error",
        description: "Failed to update user role",
        variant: "destructive"
      });
    }
  };

  if (!user || !isAdmin) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">Access denied. Admin privileges required.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
        <p className="text-muted-foreground">Manage users and system settings</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            User Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {profiles.map((profile) => {
              const userRole = roles.find(role => role.user_id === profile.user_id);
              const isCurrentUser = profile.user_id === user.id;
              
              return (
                <div key={profile.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium">
                        {profile.display_name || profile.email?.split('@')[0] || 'Unknown User'}
                        {isCurrentUser && (
                          <Badge variant="secondary" className="ml-2">
                            You
                          </Badge>
                        )}
                      </h3>
                      <p className="text-sm text-muted-foreground">{profile.email}</p>
                      <p className="text-xs text-muted-foreground">
                        Member since {new Date(profile.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Badge variant={userRole?.role === 'admin' ? 'default' : 'secondary'}>
                      {userRole?.role === 'admin' ? (
                        <>
                          <Crown className="h-3 w-3 mr-1" />
                          Admin
                        </>
                      ) : (
                        <>
                          <Shield className="h-3 w-3 mr-1" />
                          {userRole?.role || 'No Role'}
                        </>
                      )}
                    </Badge>
                    
                    {!isCurrentUser && (
                      <Select
                        value={userRole?.role || 'user'}
                        onValueChange={(newRole) => handleRoleChange(profile.user_id, newRole)}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">
                            <div className="flex items-center">
                              <UserCheck className="h-4 w-4 mr-2" />
                              User
                            </div>
                          </SelectItem>
                          <SelectItem value="moderator">
                            <div className="flex items-center">
                              <Shield className="h-4 w-4 mr-2" />
                              Moderator
                            </div>
                          </SelectItem>
                          <SelectItem value="admin">
                            <div className="flex items-center">
                              <Crown className="h-4 w-4 mr-2" />
                              Admin
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}