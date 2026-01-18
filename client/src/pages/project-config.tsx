import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
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
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Save } from 'lucide-react';

interface ProcessingConfig {
  id: number;
  projectId: number;
  deIdentificationEnabled: boolean;
  detectNames: boolean;
  detectEmails: boolean;
  detectPhones: boolean;
  detectCompanies: boolean;
  detectAddresses: boolean;
  minMessageLength: number | null;
  minCharacterCount: number | null;
  resolvedStatusField: string | null;
  resolvedStatusValue: string | null;
  roleIdentifierField: string | null;
  agentRoleValue: string | null;
  customerRoleValue: string | null;
}

interface ConfigFormData {
  deIdentificationEnabled: boolean;
  detectNames: boolean;
  detectEmails: boolean;
  detectPhones: boolean;
  detectCompanies: boolean;
  detectAddresses: boolean;
  minMessageLength: string;
  minCharacterCount: string;
  resolvedStatusField: string;
  resolvedStatusValue: string;
  roleIdentifierField: string;
  agentRoleValue: string;
  customerRoleValue: string;
}

export function ProjectConfigPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: config, isLoading } = useQuery<ProcessingConfig>({
    queryKey: ['project', projectId, 'config'],
    queryFn: () => api.get(`/projects/${projectId}/config`),
  });

  const { register, handleSubmit, watch, setValue } = useForm<ConfigFormData>({
    values: config ? {
      deIdentificationEnabled: config.deIdentificationEnabled,
      detectNames: config.detectNames,
      detectEmails: config.detectEmails,
      detectPhones: config.detectPhones,
      detectCompanies: config.detectCompanies,
      detectAddresses: config.detectAddresses,
      minMessageLength: config.minMessageLength?.toString() || '',
      minCharacterCount: config.minCharacterCount?.toString() || '',
      resolvedStatusField: config.resolvedStatusField || '',
      resolvedStatusValue: config.resolvedStatusValue || '',
      roleIdentifierField: config.roleIdentifierField || '',
      agentRoleValue: config.agentRoleValue || '',
      customerRoleValue: config.customerRoleValue || '',
    } : undefined,
  });

  const updateMutation = useMutation({
    mutationFn: async (data: ConfigFormData) => {
      return api.patch(`/projects/${projectId}/config`, {
        deIdentificationEnabled: data.deIdentificationEnabled,
        detectNames: data.detectNames,
        detectEmails: data.detectEmails,
        detectPhones: data.detectPhones,
        detectCompanies: data.detectCompanies,
        detectAddresses: data.detectAddresses,
        minMessageLength: data.minMessageLength ? parseInt(data.minMessageLength, 10) : null,
        minCharacterCount: data.minCharacterCount ? parseInt(data.minCharacterCount, 10) : null,
        resolvedStatusField: data.resolvedStatusField || null,
        resolvedStatusValue: data.resolvedStatusValue || null,
        roleIdentifierField: data.roleIdentifierField || null,
        agentRoleValue: data.agentRoleValue || null,
        customerRoleValue: data.customerRoleValue || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId, 'config'] });
      toast({
        title: 'Configuration saved',
        description: 'Processing settings have been updated.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save configuration.',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: ConfigFormData) => {
    updateMutation.mutate(data);
  };

  const deIdentificationEnabled = watch('deIdentificationEnabled');

  if (isLoading) {
    return (
      <div className="p-8">
        <Skeleton className="mb-4 h-8 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Processing Configuration"
        description="Configure how your data will be processed"
        actions={
          <Button variant="outline" asChild>
            <Link to={`/projects/${projectId}`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Project
            </Link>
          </Button>
        }
      />

      <form onSubmit={handleSubmit(onSubmit)} className="p-8 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>De-identification Settings</CardTitle>
            <CardDescription>
              Configure PII detection and replacement options.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable De-identification</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically detect and replace PII in your data
                </p>
              </div>
              <Switch
                checked={deIdentificationEnabled}
                onCheckedChange={(checked) => setValue('deIdentificationEnabled', checked)}
              />
            </div>

            {deIdentificationEnabled && (
              <>
                <Separator />
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="detectNames"
                      {...register('detectNames')}
                      checked={watch('detectNames')}
                      onCheckedChange={(checked) => setValue('detectNames', checked)}
                    />
                    <Label htmlFor="detectNames">Detect Names</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="detectEmails"
                      {...register('detectEmails')}
                      checked={watch('detectEmails')}
                      onCheckedChange={(checked) => setValue('detectEmails', checked)}
                    />
                    <Label htmlFor="detectEmails">Detect Emails</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="detectPhones"
                      {...register('detectPhones')}
                      checked={watch('detectPhones')}
                      onCheckedChange={(checked) => setValue('detectPhones', checked)}
                    />
                    <Label htmlFor="detectPhones">Detect Phone Numbers</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="detectCompanies"
                      {...register('detectCompanies')}
                      checked={watch('detectCompanies')}
                      onCheckedChange={(checked) => setValue('detectCompanies', checked)}
                    />
                    <Label htmlFor="detectCompanies">Detect Company Names</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="detectAddresses"
                      {...register('detectAddresses')}
                      checked={watch('detectAddresses')}
                      onCheckedChange={(checked) => setValue('detectAddresses', checked)}
                    />
                    <Label htmlFor="detectAddresses">Detect Addresses</Label>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Filtering Options</CardTitle>
            <CardDescription>
              Set minimum requirements for records to be included.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="minMessageLength">Minimum Message Count</Label>
                <Input
                  id="minMessageLength"
                  type="number"
                  min="0"
                  placeholder="e.g., 3"
                  {...register('minMessageLength')}
                />
                <p className="text-sm text-muted-foreground">
                  Minimum number of messages per conversation
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="minCharacterCount">Minimum Character Count</Label>
                <Input
                  id="minCharacterCount"
                  type="number"
                  min="0"
                  placeholder="e.g., 100"
                  {...register('minCharacterCount')}
                />
                <p className="text-sm text-muted-foreground">
                  Minimum total characters in conversation
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Status Filtering</CardTitle>
            <CardDescription>
              Only include records with a specific status.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="resolvedStatusField">Status Field Name</Label>
                <Input
                  id="resolvedStatusField"
                  placeholder="e.g., status"
                  {...register('resolvedStatusField')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="resolvedStatusValue">Required Status Value</Label>
                <Input
                  id="resolvedStatusValue"
                  placeholder="e.g., closed"
                  {...register('resolvedStatusValue')}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Role Identification</CardTitle>
            <CardDescription>
              Configure how to identify agent vs customer messages.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="roleIdentifierField">Role Identifier Field</Label>
              <Input
                id="roleIdentifierField"
                placeholder="e.g., sender_type"
                {...register('roleIdentifierField')}
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="agentRoleValue">Agent Role Value</Label>
                <Input
                  id="agentRoleValue"
                  placeholder="e.g., agent"
                  {...register('agentRoleValue')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customerRoleValue">Customer Role Value</Label>
                <Input
                  id="customerRoleValue"
                  placeholder="e.g., customer"
                  {...register('customerRoleValue')}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={updateMutation.isPending}>
            <Save className="mr-2 h-4 w-4" />
            {updateMutation.isPending ? 'Saving...' : 'Save Configuration'}
          </Button>
        </div>
      </form>
    </div>
  );
}
