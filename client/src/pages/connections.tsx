import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Link2, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface Connection {
  id: number;
  name: string;
  type: string;
  status: string;
  createdAt: string;
}

const connectionSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.enum(['teamwork_desk']),
  credentials: z.object({
    subdomain: z.string().min(1, 'Subdomain is required'),
    apiKey: z.string().min(1, 'API key is required'),
  }),
});

type ConnectionFormValues = z.infer<typeof connectionSchema>;

export function ConnectionsPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [testingId, setTestingId] = useState<number | null>(null);

  const form = useForm<ConnectionFormValues>({
    resolver: zodResolver(connectionSchema),
    defaultValues: {
      name: '',
      type: 'teamwork_desk',
      credentials: {
        subdomain: '',
        apiKey: '',
      },
    },
  });

  const { data: connections, isLoading } = useQuery<Connection[]>({
    queryKey: ['connections'],
    queryFn: () => api.get('/connections'),
  });

  const createMutation = useMutation({
    mutationFn: (data: ConnectionFormValues) => api.post('/connections', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connections'] });
      toast({
        title: 'Connection created',
        description: 'Your connection has been created successfully.',
      });
      setCreateDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create connection.',
        variant: 'destructive',
      });
    },
  });

  const testMutation = useMutation({
    mutationFn: (id: number) => api.post(`/connections/${id}/test`),
    onMutate: (id) => setTestingId(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connections'] });
      toast({
        title: 'Connection successful',
        description: 'The connection was tested successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Connection failed',
        description: error.message || 'Failed to connect.',
        variant: 'destructive',
      });
    },
    onSettled: () => setTestingId(null),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/connections/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connections'] });
      toast({
        title: 'Connection deleted',
        description: 'The connection has been deleted.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete connection.',
        variant: 'destructive',
      });
    },
  });

  function getStatusBadge(status: string) {
    switch (status) {
      case 'active':
        return (
          <Badge variant="success" className="flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            Active
          </Badge>
        );
      case 'error':
        return (
          <Badge variant="destructive" className="flex items-center gap-1">
            <XCircle className="h-3 w-3" />
            Error
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  }

  return (
    <div>
      <PageHeader
        title="Connections"
        description="Manage your API connections to external services."
        actions={
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Connection
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Connection</DialogTitle>
                <DialogDescription>
                  Connect to an external API service.
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit((values) =>
                    createMutation.mutate(values)
                  )}
                  className="space-y-4"
                >
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Connection Name</FormLabel>
                        <FormControl>
                          <Input placeholder="My Connection" {...field} />
                        </FormControl>
                        <FormDescription>
                          A friendly name to identify this connection.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Service Type</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a service" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="teamwork_desk">
                              Teamwork Desk
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="credentials.subdomain"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Subdomain</FormLabel>
                        <FormControl>
                          <Input placeholder="yourcompany" {...field} />
                        </FormControl>
                        <FormDescription>
                          Your Teamwork Desk subdomain (e.g., yourcompany.teamwork.com)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="credentials.apiKey"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>API Key</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="Enter your API key"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Your API key for authentication.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setCreateDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createMutation.isPending}>
                      {createMutation.isPending ? 'Creating...' : 'Create'}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="p-8">
        <Card>
          <CardHeader>
            <CardTitle>API Connections</CardTitle>
            <CardDescription>
              Your configured API connections for importing data.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : connections?.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Link2 className="mb-4 h-12 w-12 text-muted-foreground" />
                <p className="mb-2 font-medium">No connections yet</p>
                <p className="mb-4 text-sm text-muted-foreground">
                  Add a connection to import data from external APIs.
                </p>
                <Button onClick={() => setCreateDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Connection
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {connections?.map((connection) => (
                    <TableRow key={connection.id}>
                      <TableCell className="font-medium">
                        {connection.name}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {connection.type.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(connection.status)}</TableCell>
                      <TableCell>{formatDate(connection.createdAt)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => testMutation.mutate(connection.id)}
                            disabled={testingId === connection.id}
                          >
                            {testingId === connection.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              'Test'
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteMutation.mutate(connection.id)}
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
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
