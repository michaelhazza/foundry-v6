import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
  Upload,
  Play,
  Trash2,
  Download,
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  Settings,
  ArrowLeft,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface Project {
  id: number;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Source {
  id: number;
  name: string;
  type: 'file' | 'api';
  status: string;
  recordCount: number | null;
  createdAt: string;
}

interface ProcessingRun {
  id: number;
  status: string;
  totalRecords: number;
  processedRecords: number;
  failedRecords: number;
  startedAt: string | null;
  completedAt: string | null;
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'completed':
      return (
        <Badge variant="success" className="flex items-center gap-1">
          <CheckCircle className="h-3 w-3" />
          Completed
        </Badge>
      );
    case 'processing':
      return (
        <Badge variant="default" className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          Processing
        </Badge>
      );
    case 'failed':
      return (
        <Badge variant="destructive" className="flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          Failed
        </Badge>
      );
    case 'pending':
      return (
        <Badge variant="secondary" className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          Pending
        </Badge>
      );
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const { data: project, isLoading: projectLoading } = useQuery<Project>({
    queryKey: ['project', id],
    queryFn: () => api.get(`/projects/${id}`),
  });

  const { data: sources, isLoading: sourcesLoading } = useQuery<Source[]>({
    queryKey: ['project', id, 'sources'],
    queryFn: () => api.get(`/projects/${id}/sources`),
  });

  const { data: runs } = useQuery<ProcessingRun[]>({
    queryKey: ['project', id, 'runs'],
    queryFn: () => api.get(`/projects/${id}/runs`),
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/projects/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast({
        title: 'Project deleted',
        description: 'The project has been deleted successfully.',
      });
      navigate('/projects');
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete project.',
        variant: 'destructive',
      });
    },
  });

  const startProcessingMutation = useMutation({
    mutationFn: () => api.post(`/projects/${id}/runs`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', id, 'runs'] });
      toast({
        title: 'Processing started',
        description: 'Your data is being processed.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to start processing.',
        variant: 'destructive',
      });
    },
  });

  if (projectLoading) {
    return (
      <div className="p-8">
        <Skeleton className="mb-4 h-8 w-48" />
        <Skeleton className="h-4 w-96" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-8">
        <Card className="flex flex-col items-center justify-center py-12">
          <CardTitle className="mb-2">Project not found</CardTitle>
          <CardDescription className="mb-4">
            The project you're looking for doesn't exist.
          </CardDescription>
          <Button asChild>
            <Link to="/projects">Back to Projects</Link>
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={project.name}
        description={project.description || 'No description'}
        actions={
          <div className="flex items-center gap-3">
            <Button variant="outline" asChild>
              <Link to="/projects">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Link>
            </Button>
            <Button
              variant="outline"
              onClick={() => startProcessingMutation.mutate()}
              disabled={startProcessingMutation.isPending || !sources?.length}
            >
              <Play className="mr-2 h-4 w-4" />
              Start Processing
            </Button>
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Delete Project</DialogTitle>
                  <DialogDescription>
                    Are you sure you want to delete this project? This action
                    cannot be undone.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setDeleteDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => deleteMutation.mutate()}
                    disabled={deleteMutation.isPending}
                  >
                    {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        }
      />

      <div className="p-8">
        <Tabs defaultValue="sources">
          <TabsList>
            <TabsTrigger value="sources">Sources</TabsTrigger>
            <TabsTrigger value="runs">Processing Runs</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="sources" className="mt-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Data Sources</CardTitle>
                  <CardDescription>
                    Upload files or connect to APIs to import data.
                  </CardDescription>
                </div>
                <Button asChild>
                  <Link to={`/projects/${id}/sources/new`}>
                    <Upload className="mr-2 h-4 w-4" />
                    Add Source
                  </Link>
                </Button>
              </CardHeader>
              <CardContent>
                {sourcesLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : sources?.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <FileText className="mb-4 h-12 w-12 text-muted-foreground" />
                    <p className="mb-2 font-medium">No sources yet</p>
                    <p className="mb-4 text-sm text-muted-foreground">
                      Add a data source to start processing.
                    </p>
                    <Button asChild>
                      <Link to={`/projects/${id}/sources/new`}>
                        <Upload className="mr-2 h-4 w-4" />
                        Add Source
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Records</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sources?.map((source) => (
                        <TableRow key={source.id}>
                          <TableCell className="font-medium">
                            {source.name}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {source.type === 'file' ? 'File' : 'API'}
                            </Badge>
                          </TableCell>
                          <TableCell>{source.recordCount || '-'}</TableCell>
                          <TableCell>{getStatusBadge(source.status)}</TableCell>
                          <TableCell>{formatDate(source.createdAt)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="runs" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Processing Runs</CardTitle>
                <CardDescription>
                  View the history of processing runs for this project.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!runs?.length ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Clock className="mb-4 h-12 w-12 text-muted-foreground" />
                    <p className="mb-2 font-medium">No processing runs yet</p>
                    <p className="text-sm text-muted-foreground">
                      Start processing to see results here.
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Run ID</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Progress</TableHead>
                        <TableHead>Started</TableHead>
                        <TableHead>Completed</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {runs.map((run) => (
                        <TableRow key={run.id}>
                          <TableCell className="font-medium">
                            #{run.id}
                          </TableCell>
                          <TableCell>{getStatusBadge(run.status)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Progress
                                value={
                                  run.totalRecords > 0
                                    ? (run.processedRecords / run.totalRecords) *
                                      100
                                    : 0
                                }
                                className="w-24"
                              />
                              <span className="text-sm text-muted-foreground">
                                {run.processedRecords}/{run.totalRecords}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {run.startedAt
                              ? formatDate(run.startedAt)
                              : '-'}
                          </TableCell>
                          <TableCell>
                            {run.completedAt
                              ? formatDate(run.completedAt)
                              : '-'}
                          </TableCell>
                          <TableCell>
                            {run.status === 'completed' && (
                              <Button variant="ghost" size="sm">
                                <Download className="mr-2 h-4 w-4" />
                                Export
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Project Settings</CardTitle>
                <CardDescription>
                  Configure processing options for this project.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" asChild>
                  <Link to={`/projects/${id}/config`}>
                    <Settings className="mr-2 h-4 w-4" />
                    Configure Processing
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
