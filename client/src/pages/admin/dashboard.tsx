import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/layout/page-header';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/ui/status-badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Building, Users, FolderKanban, Clock, AlertCircle } from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface PlatformStats {
  totalOrganizations: number;
  totalUsers: number;
  totalProjects: number;
  activeProcessingRuns: number;
}

interface QueuedRun {
  id: number;
  projectName: string;
  organizationName: string;
  status: 'pending' | 'processing';
  createdAt: string;
  progress: number;
}

interface RecentError {
  id: number;
  projectName: string;
  organizationName: string;
  errorMessage: string;
  failedAt: string;
}

export function AdminDashboardPage() {
  const { data: stats, isLoading: statsLoading } = useQuery<PlatformStats>({
    queryKey: ['admin', 'stats'],
    queryFn: () => api.get('/admin/stats'),
  });

  const { data: queue, isLoading: queueLoading } = useQuery<QueuedRun[]>({
    queryKey: ['admin', 'processing-queue'],
    queryFn: () => api.get('/admin/processing-queue'),
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  const { data: errors, isLoading: errorsLoading } = useQuery<RecentError[]>({
    queryKey: ['admin', 'recent-errors'],
    queryFn: () => api.get('/admin/recent-errors'),
  });

  if (statsLoading) {
    return (
      <div className="p-8">
        <Skeleton className="mb-4 h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Platform Admin"
        description="Monitor and manage the Foundry platform"
      />

      <div className="p-8 space-y-8">
        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Organizations</CardTitle>
              <Building className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalOrganizations || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalUsers || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
              <FolderKanban className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalProjects || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Jobs</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.activeProcessingRuns || 0}</div>
            </CardContent>
          </Card>
        </div>

        {/* Processing Queue */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Processing Queue
            </CardTitle>
            <CardDescription>
              Active and pending processing jobs across all organizations
            </CardDescription>
          </CardHeader>
          <CardContent>
            {queueLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : !queue?.length ? (
              <p className="py-8 text-center text-muted-foreground">
                No active processing jobs
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Project</TableHead>
                    <TableHead>Organization</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Started</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {queue.map((run) => (
                    <TableRow key={run.id}>
                      <TableCell className="font-medium">{run.projectName}</TableCell>
                      <TableCell>{run.organizationName}</TableCell>
                      <TableCell>
                        <StatusBadge status={run.status} />
                      </TableCell>
                      <TableCell>{Math.round(run.progress)}%</TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(run.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Recent Errors */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Recent Errors
            </CardTitle>
            <CardDescription>
              Failed processing jobs in the last 24 hours
            </CardDescription>
          </CardHeader>
          <CardContent>
            {errorsLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : !errors?.length ? (
              <p className="py-8 text-center text-muted-foreground">
                No recent errors
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Project</TableHead>
                    <TableHead>Organization</TableHead>
                    <TableHead>Error</TableHead>
                    <TableHead>Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {errors.map((error) => (
                    <TableRow key={error.id}>
                      <TableCell className="font-medium">{error.projectName}</TableCell>
                      <TableCell>{error.organizationName}</TableCell>
                      <TableCell className="max-w-xs truncate text-destructive">
                        {error.errorMessage}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(error.failedAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
