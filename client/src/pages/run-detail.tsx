import { useParams, Link } from 'react-router-dom';
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
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/ui/status-badge';
import { useToast } from '@/hooks/use-toast';
import {
  ArrowLeft,
  Download,
  XCircle,
  CheckCircle,
  AlertCircle,
  Clock,
  FileText,
  Filter,
  AlertTriangle,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface ProcessingRun {
  id: number;
  projectId: number;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  totalRecords: number;
  processedRecords: number;
  filteredRecords: number;
  errorRecords: number;
  startedAt: string | null;
  completedAt: string | null;
  errorMessage?: string;
  statistics?: {
    piiCounts?: {
      names: number;
      emails: number;
      phones: number;
      companies: number;
      addresses: number;
    };
    filterBreakdown?: {
      minLength: number;
      status: number;
      dateRange: number;
    };
  };
}

export function RunDetailPage() {
  const { id, runId } = useParams<{ id: string; runId: string }>();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: run, isLoading } = useQuery<ProcessingRun>({
    queryKey: ['project', id, 'runs', runId],
    queryFn: () => api.get(`/projects/${id}/runs/${runId}`),
    enabled: !!id && !!runId,
    refetchInterval: (query) => {
      const data = query.state.data as ProcessingRun | undefined;
      // Poll every 2 seconds while processing
      return data?.status === 'processing' || data?.status === 'pending' ? 2000 : false;
    },
  });

  const cancelMutation = useMutation({
    mutationFn: () => api.post(`/projects/${id}/runs/${runId}/cancel`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', id, 'runs', runId] });
      toast({
        title: 'Processing cancelled',
        description: 'The processing run has been cancelled.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to cancel processing.',
        variant: 'destructive',
      });
    },
  });

  const handleDownload = async (full: boolean) => {
    try {
      const endpoint = full
        ? `/projects/${id}/runs/${runId}/download`
        : `/projects/${id}/runs/${runId}/sample`;
      await api.downloadFile(endpoint, `processed-${runId}${full ? '' : '-sample'}.jsonl`);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to download file.',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <Skeleton className="mb-4 h-8 w-48" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (!run) {
    return (
      <div className="p-8">
        <Card className="flex flex-col items-center justify-center py-12">
          <CardTitle className="mb-2">Run not found</CardTitle>
          <CardDescription className="mb-4">
            The processing run you're looking for doesn't exist.
          </CardDescription>
          <Button asChild>
            <Link to={`/projects/${id}`}>Back to Project</Link>
          </Button>
        </Card>
      </div>
    );
  }

  const progress = run.totalRecords > 0
    ? (run.processedRecords / run.totalRecords) * 100
    : 0;

  const isActive = run.status === 'pending' || run.status === 'processing';
  const isCompleted = run.status === 'completed';
  const isFailed = run.status === 'failed';

  const duration = run.startedAt && run.completedAt
    ? Math.round((new Date(run.completedAt).getTime() - new Date(run.startedAt).getTime()) / 1000 / 60)
    : null;

  return (
    <div>
      <PageHeader
        title={`Processing Run #${run.id}`}
        description={`Status: ${run.status}`}
        actions={
          <div className="flex items-center gap-3">
            <Button variant="outline" asChild>
              <Link to={`/projects/${id}`}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Project
              </Link>
            </Button>
            {isActive && (
              <Button
                variant="destructive"
                onClick={() => cancelMutation.mutate()}
                disabled={cancelMutation.isPending}
              >
                <XCircle className="mr-2 h-4 w-4" />
                Cancel
              </Button>
            )}
          </div>
        }
      />

      <div className="p-8 space-y-6">
        {/* Status Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                {isCompleted && <CheckCircle className="h-5 w-5 text-green-600" />}
                {isFailed && <AlertCircle className="h-5 w-5 text-destructive" />}
                {isActive && <Clock className="h-5 w-5 text-blue-600 animate-pulse" />}
                Run Status
              </CardTitle>
              <StatusBadge status={run.status} />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {isActive && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progress</span>
                  <span>{run.processedRecords} of {run.totalRecords} records</span>
                </div>
                <Progress value={progress} />
                <p className="text-sm text-muted-foreground">
                  Processing... {Math.round(progress)}% complete
                </p>
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">Started</p>
                <p className="font-medium">
                  {run.startedAt ? formatDate(run.startedAt) : 'Not started'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="font-medium">
                  {run.completedAt ? formatDate(run.completedAt) : '-'}
                </p>
              </div>
              {duration && (
                <div>
                  <p className="text-sm text-muted-foreground">Duration</p>
                  <p className="font-medium">{duration} minutes</p>
                </div>
              )}
            </div>

            {isFailed && run.errorMessage && (
              <div className="rounded-md bg-destructive/10 p-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
                  <div>
                    <p className="font-medium text-destructive">Error</p>
                    <p className="text-sm text-destructive">{run.errorMessage}</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Statistics */}
        {isCompleted && (
          <>
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Processed
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{run.processedRecords.toLocaleString()}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    Filtered
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{run.filteredRecords.toLocaleString()}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    Errors
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{run.errorRecords.toLocaleString()}</p>
                </CardContent>
              </Card>
            </div>

            {/* Filter Breakdown */}
            {run.statistics?.filterBreakdown && (
              <Card>
                <CardHeader>
                  <CardTitle>Filter Breakdown</CardTitle>
                  <CardDescription>Records filtered by reason</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Too short</span>
                      <span className="font-medium">{run.statistics.filterBreakdown.minLength} records</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Unresolved status</span>
                      <span className="font-medium">{run.statistics.filterBreakdown.status} records</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Out of date range</span>
                      <span className="font-medium">{run.statistics.filterBreakdown.dateRange} records</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* PII Counts */}
            {run.statistics?.piiCounts && (
              <Card>
                <CardHeader>
                  <CardTitle>PII Anonymized</CardTitle>
                  <CardDescription>Count of PII items detected and replaced</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold">{run.statistics.piiCounts.names.toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground">Names</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold">{run.statistics.piiCounts.emails.toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground">Emails</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold">{run.statistics.piiCounts.phones.toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground">Phones</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold">{run.statistics.piiCounts.companies.toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground">Companies</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold">{run.statistics.piiCounts.addresses.toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground">Addresses</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Download Buttons */}
            <Card>
              <CardHeader>
                <CardTitle>Download Output</CardTitle>
                <CardDescription>Download the processed data in JSONL format</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-3">
                  <Button onClick={() => handleDownload(true)}>
                    <Download className="mr-2 h-4 w-4" />
                    Download Full Output
                  </Button>
                  <Button variant="outline" onClick={() => handleDownload(false)}>
                    <Download className="mr-2 h-4 w-4" />
                    Download Sample (100 records)
                  </Button>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
