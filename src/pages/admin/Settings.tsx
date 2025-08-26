import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Save, Globe, RefreshCw } from 'lucide-react';

interface SiteSettings {
  siteName: string;
  siteDescription: string;
  siteUrl: string;
  contactEmail: string;
  maintenanceMode: boolean;
  allowRegistration: boolean;
}

const Settings: React.FC = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  // Site Settings - attempt to load from API, otherwise use sensible defaults
  const [siteSettings, setSiteSettings] = useState<SiteSettings>({
    siteName: 'iykeLib - Ghana Code Library',
    siteDescription: 'A comprehensive library of programming resources, tutorials, and books for Ghanaian developers',
    siteUrl: 'https://ghana-code-library.com',
    contactEmail: 'admin@ghana-code-library.com',
    maintenanceMode: false,
    allowRegistration: true
  });

  // Load persisted settings from backend
  useEffect(() => {
    let mounted = true;
    const loadSettings = async () => {
      try {
        const res = await fetch('/api/admin/settings');
        if (!res.ok) return;
        const data = await res.json();
        if (!mounted) return;
        setSiteSettings(prev => ({ ...prev, ...data }));
      } catch (e) {
        console.warn('Could not load site settings from backend, using defaults');
      }
    };
    loadSettings();
    return () => { mounted = false; };
  }, []);

  const handleSaveSettings = async () => {
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "Settings Saved",
        description: "Site settings have been updated successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your basic site configuration
        </p>
      </div>

      {/* Site Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Globe className="h-5 w-5" />
            <span>Site Settings</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="siteName">Site Name</Label>
              <Input
                id="siteName"
                value={siteSettings.siteName}
                onChange={(e) => setSiteSettings({ ...siteSettings, siteName: e.target.value })}
                placeholder="Enter site name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="siteUrl">Site URL</Label>
              <Input
                id="siteUrl"
                value={siteSettings.siteUrl}
                onChange={(e) => setSiteSettings({ ...siteSettings, siteUrl: e.target.value })}
                placeholder="https://example.com"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="siteDescription">Site Description</Label>
            <Textarea
              id="siteDescription"
              value={siteSettings.siteDescription}
              onChange={(e) => setSiteSettings({ ...siteSettings, siteDescription: e.target.value })}
              placeholder="Enter site description"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contactEmail">Contact Email</Label>
            <Input
              id="contactEmail"
              type="email"
              value={siteSettings.contactEmail}
              onChange={(e) => setSiteSettings({ ...siteSettings, contactEmail: e.target.value })}
              placeholder="admin@example.com"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="maintenanceMode">Maintenance Mode</Label>
              <p className="text-sm text-muted-foreground">
                Temporarily disable the site for maintenance
              </p>
            </div>
            <Switch
              id="maintenanceMode"
              checked={siteSettings.maintenanceMode}
              onCheckedChange={(checked) => setSiteSettings({ ...siteSettings, maintenanceMode: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="allowRegistration">Allow User Registration</Label>
              <p className="text-sm text-muted-foreground">
                Enable new user registrations
              </p>
            </div>
            <Switch
              id="allowRegistration"
              checked={siteSettings.allowRegistration}
              onCheckedChange={(checked) => setSiteSettings({ ...siteSettings, allowRegistration: checked })}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button 
          onClick={handleSaveSettings} 
          disabled={isLoading}
          className="min-w-[120px]"
        >
          {isLoading ? (
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save Changes
        </Button>
      </div>
    </div>
  );
};

export default Settings;
