import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Upload, Cloud } from 'lucide-react';

interface Connection {
  id: number;
  name: string;
  type: string;
  isValid: boolean;
}

export function NewSourcePage() {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedConnection, setSelectedConnection] = useState<string>('');

  const { data: connections } = useQuery<Connection[]>({
    queryKey: ['connections'],
    queryFn: () => api.get('/connections'),
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      return api.upload(`/projects/${projectId}/sources/upload`, formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId, 'sources'] });
      toast({
        title: 'Source uploaded',
        description: 'Your file has been uploaded and is being processed.',
      });
      navigate(`/projects/${projectId}`);
    },
    onError: (error: Error) => {
      toast({
        title: 'Upload failed',
        description: error.message || 'Failed to upload file.',
        variant: 'destructive',
      });
    },
  });

  const apiSourceMutation = useMutation({
    mutationFn: async (connectionId: number) => {
      return api.post(`/projects/${projectId}/sources/api`, {
        connectionId,
        config: {},
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId, 'sources'] });
      toast({
        title: 'API source created',
        description: 'Data import has been queued.',
      });
      navigate(`/projects/${projectId}`);
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to create source',
        description: error.message || 'Failed to create API source.',
        variant: 'destructive',
      });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = () => {
    if (selectedFile) {
      uploadMutation.mutate(selectedFile);
    }
  };

  const handleApiSource = () => {
    if (selectedConnection) {
      apiSourceMutation.mutate(parseInt(selectedConnection, 10));
    }
  };

  return (
    <div>
      <PageHeader
        title="Add Data Source"
        description="Upload a file or connect to an API to import data"
        actions={
          <Button variant="outline" asChild>
            <Link to={`/projects/${projectId}`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Project
            </Link>
          </Button>
        }
      />

      <div className="p-8">
        <Tabs defaultValue="file">
          <TabsList>
            <TabsTrigger value="file">
              <Upload className="mr-2 h-4 w-4" />
              File Upload
            </TabsTrigger>
            <TabsTrigger value="api">
              <Cloud className="mr-2 h-4 w-4" />
              API Connection
            </TabsTrigger>
          </TabsList>

          <TabsContent value="file" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Upload File</CardTitle>
                <CardDescription>
                  Upload a CSV, Excel, or JSON file containing your data.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="file">Select File</Label>
                  <Input
                    id="file"
                    type="file"
                    accept=".csv,.xlsx,.xls,.json"
                    onChange={handleFileChange}
                  />
                  <p className="text-sm text-muted-foreground">
                    Supported formats: CSV, XLSX, XLS, JSON. Max size: 100MB.
                  </p>
                </div>
                {selectedFile && (
                  <p className="text-sm">
                    Selected: <strong>{selectedFile.name}</strong> (
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                )}
                <Button
                  onClick={handleUpload}
                  disabled={!selectedFile || uploadMutation.isPending}
                >
                  {uploadMutation.isPending ? 'Uploading...' : 'Upload File'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="api" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Import from API</CardTitle>
                <CardDescription>
                  Select a configured API connection to import data.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="connection">API Connection</Label>
                  <Select
                    value={selectedConnection}
                    onValueChange={setSelectedConnection}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a connection" />
                    </SelectTrigger>
                    <SelectContent>
                      {connections?.filter(c => c.isValid).map((conn) => (
                        <SelectItem key={conn.id} value={conn.id.toString()}>
                          {conn.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {(!connections || connections.filter(c => c.isValid).length === 0) && (
                    <p className="text-sm text-muted-foreground">
                      No valid connections available.{' '}
                      <Link to="/connections" className="text-primary underline">
                        Configure a connection
                      </Link>{' '}
                      first.
                    </p>
                  )}
                </div>
                <Button
                  onClick={handleApiSource}
                  disabled={!selectedConnection || apiSourceMutation.isPending}
                >
                  {apiSourceMutation.isPending ? 'Creating...' : 'Import Data'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
