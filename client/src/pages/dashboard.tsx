import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
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
import { Plus, FolderKanban, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface Project {
  id: number;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  sourceCount?: number;
  latestRunStatus?: string | null;
}

function getStatusBadge(status: string | null) {
  if (!status) {
    return <Badge variant="secondary">No runs</Badge>;
  }

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
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

export function DashboardPage() {
  const { data: projects, isLoading } = useQuery<Project[]>({
    queryKey: ['projects'],
    queryFn: () => api.get('/projects'),
  });

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Welcome back! Here are your recent projects."
        actions={
          <Button asChild>
            <Link to="/projects/new">
              <Plus className="mr-2 h-4 w-4" />
              New Project
            </Link>
          </Button>
        }
      />

      <div className="p-8">
        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : projects?.length === 0 ? (
          <Card className="flex flex-col items-center justify-center py-12">
            <FolderKanban className="mb-4 h-12 w-12 text-muted-foreground" />
            <CardTitle className="mb-2">No projects yet</CardTitle>
            <CardDescription className="mb-4">
              Create your first project to start processing data.
            </CardDescription>
            <Button asChild>
              <Link to="/projects/new">
                <Plus className="mr-2 h-4 w-4" />
                Create Project
              </Link>
            </Button>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {projects?.map((project) => (
              <Link key={project.id} to={`/projects/${project.id}`}>
                <Card className="h-full transition-shadow hover:shadow-lg">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <CardTitle className="line-clamp-1">
                        {project.name}
                      </CardTitle>
                      {getStatusBadge(project.latestRunStatus ?? null)}
                    </div>
                    <CardDescription className="line-clamp-2">
                      {project.description || 'No description'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>
                        {project.sourceCount || 0} source
                        {project.sourceCount !== 1 ? 's' : ''}
                      </span>
                      <span>Updated {formatDate(project.updatedAt)}</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
