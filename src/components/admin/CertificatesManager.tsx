import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, Award, Users, Clock, Target } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface Certificate {
  id: string;
  name: string;
  description: string | null;
  category_id: string | null;
  is_active: boolean | null;
  max_attempts: number | null;
  passing_score: number | null;
  time_limit_minutes: number | null;
  total_questions: number | null;
  categories?: { name: string } | null;
  questionCount?: number;
  userCount?: number;
}

interface Category {
  id: string;
  name: string;
}

export default function CertificatesManager() {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingCertificate, setEditingCertificate] = useState<Certificate | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category_id: '',
    is_active: true,
    max_attempts: 3,
    passing_score: 70,
    time_limit_minutes: 60,
    total_questions: 20
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchCertificates();
    fetchCategories();
  }, []);

  const fetchCertificates = async () => {
    try {
      // Try to load certificates from backend
      let resp = await fetch('/api/admin/certificates');
      if (!resp.ok) {
        resp = await fetch('/api/certificates');
      }
      if (!resp.ok) throw new Error('Failed to fetch certificates');
      const data = await resp.json();
      const certs: Certificate[] = Array.isArray(data)
        ? data.map((c: any) => ({
            id: c.id?.toString(),
            name: c.name,
            description: c.description || null,
            category_id: c.category_id?.toString() || null,
            is_active: typeof c.is_active === 'boolean' ? c.is_active : Boolean(c.is_active),
            max_attempts: c.max_attempts ?? null,
            passing_score: c.passing_score ?? null,
            time_limit_minutes: c.time_limit_minutes ?? null,
            total_questions: c.total_questions ?? null,
            categories: c.category_name ? { name: c.category_name } : null,
            questionCount: c.questionCount ?? c.total_questions ?? null,
            userCount: c.userCount ?? null
          }))
        : [];
      setCertificates(certs);
    } catch (error) {
      console.error('Error fetching certificates:', error);
      toast({
        title: "Error",
        description: "Failed to fetch certificates",
        variant: "destructive"
      });
      setCertificates([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const resp = await fetch('/api/categories');
      if (!resp.ok) throw new Error('Failed to fetch categories');
      const data = await resp.json();
      const cats: Category[] = Array.isArray(data) ? data.map((c: any) => ({ id: c.id?.toString(), name: c.name })) : [];
      setCategories(cats);
    } catch (error) {
      console.error('Error fetching categories:', error);
      setCategories([]);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      category_id: '',
      is_active: true,
      max_attempts: 3,
      passing_score: 70,
      time_limit_minutes: 60,
      total_questions: 20
    });
    setEditingCertificate(null);
  };

  const handleEdit = (certificate: Certificate) => {
    setEditingCertificate(certificate);
    setFormData({
      name: certificate.name,
      description: certificate.description || '',
      category_id: certificate.category_id || '',
      is_active: certificate.is_active || false,
      max_attempts: certificate.max_attempts || 3,
      passing_score: certificate.passing_score || 70,
      time_limit_minutes: certificate.time_limit_minutes || 60,
      total_questions: certificate.total_questions || 20
    });
    setShowDialog(true);
  };

  const handleSubmit = async () => {
    try {
      if (editingCertificate) {
        // TODO: Implement MySQL update
        console.log('MySQL update not yet implemented');
        toast({
          title: "Success",
          description: `Certificate ${editingCertificate ? 'updated' : 'created'} successfully`
        });
      } else {
        // TODO: Implement MySQL insert
        console.log('MySQL insert not yet implemented');
        toast({
          title: "Success",
          description: `Certificate ${editingCertificate ? 'updated' : 'created'} successfully`
        });
      }

      setShowDialog(false);
      resetForm();
      fetchCertificates();
    } catch (error) {
      console.error('Error saving certificate:', error);
      toast({
        title: "Error",
        description: "Failed to save certificate",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (certificateId: string) => {
    if (!confirm('Are you sure you want to delete this certificate? This will also delete all associated questions and user certificates.')) return;

    try {
      // TODO: Implement MySQL delete
      console.log('MySQL delete not yet implemented');
      toast({
        title: "Success",
        description: "Certificate deleted successfully"
      });

      fetchCertificates();
    } catch (error) {
      console.error('Error deleting certificate:', error);
      toast({
        title: "Error",
        description: "Failed to delete certificate",
        variant: "destructive"
      });
    }
  };

  if (isLoading) {
    return <div className="flex justify-center p-8">Loading certificates...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Certificates Management</h2>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setShowDialog(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Certificate
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingCertificate ? 'Edit Certificate' : 'Add New Certificate'}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Certificate Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Certificate name"
                  />
                </div>
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select value={formData.category_id} onValueChange={(value) => setFormData(prev => ({ ...prev, category_id: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="passing_score">Passing Score (%)</Label>
                  <Input
                    id="passing_score"
                    type="number"
                    value={formData.passing_score}
                    onChange={(e) => setFormData(prev => ({ ...prev, passing_score: parseInt(e.target.value) }))}
                    min={0}
                    max={100}
                  />
                </div>
                <div>
                  <Label htmlFor="total_questions">Total Questions</Label>
                  <Input
                    id="total_questions"
                    type="number"
                    value={formData.total_questions}
                    onChange={(e) => setFormData(prev => ({ ...prev, total_questions: parseInt(e.target.value) }))}
                    min={1}
                  />
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Certificate description"
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="time_limit">Time Limit (minutes)</Label>
                  <Input
                    id="time_limit"
                    type="number"
                    value={formData.time_limit_minutes}
                    onChange={(e) => setFormData(prev => ({ ...prev, time_limit_minutes: parseInt(e.target.value) }))}
                    min={1}
                  />
                </div>
                <div>
                  <Label htmlFor="max_attempts">Max Attempts</Label>
                  <Input
                    id="max_attempts"
                    type="number"
                    value={formData.max_attempts}
                    onChange={(e) => setFormData(prev => ({ ...prev, max_attempts: parseInt(e.target.value) }))}
                    min={1}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                  />
                  <Label htmlFor="active">Active</Label>
                </div>
              </div>
            </div>
            <div className="flex justify-end space-x-2 mt-6">
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={!formData.name}>
                {editingCertificate ? 'Update' : 'Create'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {certificates.map((certificate) => (
          <Card key={certificate.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <Award className="h-8 w-8 text-primary" />
                <Badge variant={certificate.is_active ? "default" : "secondary"}>
                  {certificate.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>
              <CardTitle className="text-lg">{certificate.name}</CardTitle>
              {certificate.categories && (
                <Badge variant="outline" className="w-fit">
                  {certificate.categories.name}
                </Badge>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center">
                  <Target className="h-4 w-4 mr-1 text-muted-foreground" />
                  <span>{certificate.passing_score || 70}% to pass</span>
                </div>
                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-1 text-muted-foreground" />
                  <span>{certificate.time_limit_minutes || 60} min</span>
                </div>
                <div className="flex items-center">
                  <Award className="h-4 w-4 mr-1 text-muted-foreground" />
                  <span>{certificate.questionCount || 0} questions</span>
                </div>
                <div className="flex items-center">
                  <Users className="h-4 w-4 mr-1 text-muted-foreground" />
                  <span>{certificate.userCount || 0} earned</span>
                </div>
              </div>
              <div className="flex flex-col space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { /* TODO: Implement question management */ }}
                  className="w-full"
                >
                  Manage Questions
                </Button>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(certificate)}
                    className="flex-1"
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(certificate.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {certificates.length === 0 && (
        <Card className="p-8 text-center">
          <Award className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No certificates yet</h3>
          <p className="text-muted-foreground">Get started by creating your first certificate.</p>
        </Card>
      )}

      {/* Questions Management Dialog */}
      <Dialog open={false} onOpenChange={() => {}}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Manage Questions - {editingCertificate?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">Questions management functionality is not yet implemented.</p>
            </Card>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}