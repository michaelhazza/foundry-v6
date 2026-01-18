import { useParams, Link, useNavigate } from 'react-router-dom';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Play, RefreshCw, User, Mail, Phone, Building, MapPin } from 'lucide-react';

interface PreviewResult {
  original: string;
  processed: string;
  piiFound: Record<string, string>;
}

export function ProjectPreviewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: previews, isLoading, refetch, isFetching } = useQuery<PreviewResult[]>({
    queryKey: ['project', id, 'preview'],
    queryFn: () => api.post(`/projects/${id}/preview`),
    enabled: !!id,
    staleTime: 0,
  });

  const processMutation = useMutation({
    mutationFn: () => api.post<{ id: number }>(`/projects/${id}/runs`),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['project', id, 'runs'] });
      toast({
        title: 'Processing started',
        description: 'Your data is being processed.',
      });
      navigate(`/projects/${id}/runs/${data.id}`);
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to start processing.',
        variant: 'destructive',
      });
    },
  });

  // Count PII types across all previews
  const piiCounts = previews?.reduce(
    (acc, preview) => {
      Object.keys(preview.piiFound).forEach((key) => {
        if (key.startsWith('PERSON') || key.startsWith('AGENT')) acc.names++;
        else if (key.startsWith('EMAIL')) acc.emails++;
        else if (key.startsWith('PHONE')) acc.phones++;
        else if (key.startsWith('COMPANY')) acc.companies++;
        else if (key.startsWith('ADDRESS')) acc.addresses++;
      });
      return acc;
    },
    { names: 0, emails: 0, phones: 0, companies: 0, addresses: 0 }
  ) || { names: 0, emails: 0, phones: 0, companies: 0, addresses: 0 };

  if (isLoading) {
    return (
      <div className="p-8">
        <Skeleton className="mb-4 h-8 w-48" />
        <Skeleton className="h-[600px] w-full" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="De-identification Preview"
        description="Review how your data will be processed"
        actions={
          <div className="flex items-center gap-3">
            <Button variant="outline" asChild>
              <Link to={`/projects/${id}`}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Project
              </Link>
            </Button>
            <Button
              variant="outline"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              onClick={() => processMutation.mutate()}
              disabled={processMutation.isPending}
            >
              <Play className="mr-2 h-4 w-4" />
              {processMutation.isPending ? 'Starting...' : 'Process Full Dataset'}
            </Button>
          </div>
        }
      />

      <div className="p-8 space-y-6">
        {/* PII Summary */}
        <Card>
          <CardHeader>
            <CardTitle>PII Detected in Sample</CardTitle>
            <CardDescription>
              Summary of personally identifiable information found in the preview sample
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Badge variant="secondary" className="flex items-center gap-1 px-3 py-1">
                <User className="h-3 w-3" />
                {piiCounts.names} Names
              </Badge>
              <Badge variant="secondary" className="flex items-center gap-1 px-3 py-1">
                <Mail className="h-3 w-3" />
                {piiCounts.emails} Emails
              </Badge>
              <Badge variant="secondary" className="flex items-center gap-1 px-3 py-1">
                <Phone className="h-3 w-3" />
                {piiCounts.phones} Phones
              </Badge>
              <Badge variant="secondary" className="flex items-center gap-1 px-3 py-1">
                <Building className="h-3 w-3" />
                {piiCounts.companies} Companies
              </Badge>
              <Badge variant="secondary" className="flex items-center gap-1 px-3 py-1">
                <MapPin className="h-3 w-3" />
                {piiCounts.addresses} Addresses
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Preview Comparison */}
        <Card>
          <CardHeader>
            <CardTitle>Side-by-Side Comparison</CardTitle>
            <CardDescription>
              Compare original content with de-identified output
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!previews?.length ? (
              <div className="py-8 text-center text-muted-foreground">
                No preview data available. Make sure you have data sources and mappings configured.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-1/2">Original</TableHead>
                    <TableHead className="w-1/2">De-identified</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previews.map((preview, index) => (
                    <TableRow key={index}>
                      <TableCell className="align-top">
                        <div className="max-h-48 overflow-y-auto whitespace-pre-wrap text-sm">
                          {preview.original}
                        </div>
                      </TableCell>
                      <TableCell className="align-top">
                        <div className="max-h-48 overflow-y-auto whitespace-pre-wrap text-sm">
                          {highlightPII(preview.processed)}
                        </div>
                        {Object.keys(preview.piiFound).length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {Object.entries(preview.piiFound).map(([key, value]) => (
                              <Badge key={key} variant="outline" className="text-xs">
                                {key}: {value}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-between items-center">
          <p className="text-sm text-muted-foreground">
            Showing {previews?.length || 0} sample records
          </p>
          <div className="flex gap-3">
            <Button variant="outline" asChild>
              <Link to={`/projects/${id}/configure`}>
                Adjust Configuration
              </Link>
            </Button>
            <Button
              onClick={() => processMutation.mutate()}
              disabled={processMutation.isPending}
            >
              <Play className="mr-2 h-4 w-4" />
              Process Full Dataset
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper function to highlight PII placeholders
function highlightPII(text: string): React.ReactNode {
  const parts = text.split(/(\[[A-Z_]+(?:_\d+)?\])/g);
  return parts.map((part, index) => {
    if (part.match(/^\[[A-Z_]+(?:_\d+)?\]$/)) {
      return (
        <span
          key={index}
          className="bg-yellow-100 dark:bg-yellow-900 px-1 rounded text-yellow-800 dark:text-yellow-200"
        >
          {part}
        </span>
      );
    }
    return part;
  });
}
