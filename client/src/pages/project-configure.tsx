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
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
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
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Save, Eye } from 'lucide-react';

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
  dateRangeStart: string | null;
  dateRangeEnd: string | null;
  roleIdentifierField: string | null;
  agentRoleValue: string | null;
  customerRoleValue: string | null;
}

interface Source {
  id: number;
  name: string;
}

interface FieldMapping {
  id: number;
  sourceId: number;
  sourceColumn: string;
  targetField: string;
  confidence: number;
  sampleValues: string[];
}

const targetFields = [
  { value: 'message_content', label: 'Message Content' },
  { value: 'sender_name', label: 'Sender Name' },
  { value: 'sender_role', label: 'Sender Role' },
  { value: 'timestamp', label: 'Timestamp' },
  { value: 'ticket_id', label: 'Ticket ID' },
  { value: 'subject', label: 'Subject' },
  { value: 'do_not_import', label: 'Do Not Import' },
];

export function ProjectConfigurePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [config, setConfig] = useState<Partial<ProcessingConfig>>({});
  const [mappings, setMappings] = useState<FieldMapping[]>([]);

  const { data: configData, isLoading: configLoading } = useQuery<ProcessingConfig>({
    queryKey: ['project', id, 'config'],
    queryFn: () => api.get(`/projects/${id}/config`),
    enabled: !!id,
  });

  const { data: sources } = useQuery<Source[]>({
    queryKey: ['project', id, 'sources'],
    queryFn: () => api.get(`/projects/${id}/sources`),
    enabled: !!id,
  });

  const { data: sourceMappings, isLoading: mappingsLoading } = useQuery<FieldMapping[]>({
    queryKey: ['project', id, 'mappings'],
    queryFn: async () => {
      if (!sources || sources.length === 0) return [];
      const sourceId = sources[0].id;
      return api.get(`/projects/${id}/sources/${sourceId}/mappings`);
    },
    enabled: !!sources && sources.length > 0,
  });

  // Initialize local state when data loads
  useState(() => {
    if (configData) setConfig(configData);
    if (sourceMappings) setMappings(sourceMappings);
  });

  const configMutation = useMutation({
    mutationFn: (data: Partial<ProcessingConfig>) =>
      api.patch(`/projects/${id}/config`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', id, 'config'] });
      toast({
        title: 'Configuration saved',
        description: 'Processing configuration has been updated.',
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

  const mappingMutation = useMutation({
    mutationFn: async (data: { mappings: Partial<FieldMapping>[] }) => {
      if (!sources || sources.length === 0) return;
      const sourceId = sources[0].id;
      return api.patch(`/projects/${id}/sources/${sourceId}/mappings`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', id, 'mappings'] });
      toast({
        title: 'Mappings saved',
        description: 'Field mappings have been updated.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save mappings.',
        variant: 'destructive',
      });
    },
  });

  const handleConfigChange = <K extends keyof ProcessingConfig>(
    key: K,
    value: ProcessingConfig[K]
  ) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  const handleMappingChange = (mappingId: number, targetField: string) => {
    setMappings((prev) =>
      prev.map((m) =>
        m.id === mappingId ? { ...m, targetField } : m
      )
    );
  };

  const saveConfig = () => {
    configMutation.mutate(config);
  };

  const saveMappings = () => {
    mappingMutation.mutate({
      mappings: mappings.map((m) => ({
        id: m.id,
        targetField: m.targetField,
      })),
    });
  };

  if (configLoading) {
    return (
      <div className="p-8">
        <Skeleton className="mb-4 h-8 w-48" />
        <Skeleton className="h-[600px] w-full" />
      </div>
    );
  }

  const currentConfig = { ...configData, ...config };

  return (
    <div>
      <PageHeader
        title="Configure Processing"
        description="Set up field mappings and processing options"
        actions={
          <div className="flex items-center gap-3">
            <Button variant="outline" asChild>
              <Link to={`/projects/${id}`}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Project
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to={`/projects/${id}/preview`}>
                <Eye className="mr-2 h-4 w-4" />
                Preview
              </Link>
            </Button>
          </div>
        }
      />

      <div className="p-8">
        <Tabs defaultValue="mappings">
          <TabsList>
            <TabsTrigger value="mappings">Field Mappings</TabsTrigger>
            <TabsTrigger value="deidentification">De-identification</TabsTrigger>
            <TabsTrigger value="filters">Filters</TabsTrigger>
          </TabsList>

          <TabsContent value="mappings" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Field Mappings</CardTitle>
                <CardDescription>
                  Map source columns to target fields for processing.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {mappingsLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3, 4].map((i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : !sourceMappings?.length ? (
                  <p className="text-sm text-muted-foreground">
                    No sources found. Upload a data source first.
                  </p>
                ) : (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Source Column</TableHead>
                          <TableHead>Maps To</TableHead>
                          <TableHead>Confidence</TableHead>
                          <TableHead>Sample Values</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(mappings.length ? mappings : sourceMappings).map((mapping) => (
                          <TableRow key={mapping.id}>
                            <TableCell className="font-medium">
                              {mapping.sourceColumn}
                            </TableCell>
                            <TableCell>
                              <Select
                                value={mapping.targetField}
                                onValueChange={(value) =>
                                  handleMappingChange(mapping.id, value)
                                }
                              >
                                <SelectTrigger className="w-48">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {targetFields.map((field) => (
                                    <SelectItem key={field.value} value={field.value}>
                                      {field.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              {Math.round(mapping.confidence * 100)}%
                            </TableCell>
                            <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                              {mapping.sampleValues?.slice(0, 2).join(', ')}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <div className="mt-4 flex justify-end">
                      <Button onClick={saveMappings} disabled={mappingMutation.isPending}>
                        <Save className="mr-2 h-4 w-4" />
                        {mappingMutation.isPending ? 'Saving...' : 'Save Mappings'}
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="deidentification" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>De-identification Settings</CardTitle>
                <CardDescription>
                  Configure which types of PII to detect and replace.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Enable De-identification</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically detect and replace PII in messages
                    </p>
                  </div>
                  <Switch
                    checked={currentConfig.deIdentificationEnabled ?? true}
                    onCheckedChange={(checked) =>
                      handleConfigChange('deIdentificationEnabled', checked)
                    }
                  />
                </div>

                <div className="border-t pt-6">
                  <p className="mb-4 text-sm font-medium">PII Types to Detect:</p>
                  <div className="space-y-4">
                    {[
                      { key: 'detectNames', label: 'Names', desc: 'Replaced with [PERSON_1], [AGENT_1]' },
                      { key: 'detectEmails', label: 'Email Addresses', desc: 'Replaced with [EMAIL]' },
                      { key: 'detectPhones', label: 'Phone Numbers', desc: 'Replaced with [PHONE]' },
                      { key: 'detectCompanies', label: 'Company Names', desc: 'Replaced with [COMPANY_1]' },
                      { key: 'detectAddresses', label: 'Addresses', desc: 'Replaced with [ADDRESS]' },
                    ].map((item) => (
                      <div key={item.key} className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>{item.label}</Label>
                          <p className="text-sm text-muted-foreground">{item.desc}</p>
                        </div>
                        <Switch
                          checked={currentConfig[item.key as keyof ProcessingConfig] as boolean ?? true}
                          onCheckedChange={(checked) =>
                            handleConfigChange(item.key as keyof ProcessingConfig, checked)
                          }
                          disabled={!currentConfig.deIdentificationEnabled}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <Button onClick={saveConfig} disabled={configMutation.isPending}>
                    <Save className="mr-2 h-4 w-4" />
                    {configMutation.isPending ? 'Saving...' : 'Save Settings'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="filters" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Quality Filters</CardTitle>
                <CardDescription>
                  Filter out records that don't meet quality criteria.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="minMessageLength">Minimum Message Length</Label>
                    <Input
                      id="minMessageLength"
                      type="number"
                      min="0"
                      value={currentConfig.minMessageLength ?? ''}
                      onChange={(e) =>
                        handleConfigChange(
                          'minMessageLength',
                          e.target.value ? parseInt(e.target.value) : null
                        )
                      }
                      placeholder="No minimum"
                    />
                    <p className="text-sm text-muted-foreground">
                      Messages shorter than this will be filtered out
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="minCharacterCount">Minimum Character Count</Label>
                    <Input
                      id="minCharacterCount"
                      type="number"
                      min="0"
                      value={currentConfig.minCharacterCount ?? ''}
                      onChange={(e) =>
                        handleConfigChange(
                          'minCharacterCount',
                          e.target.value ? parseInt(e.target.value) : null
                        )
                      }
                      placeholder="No minimum"
                    />
                    <p className="text-sm text-muted-foreground">
                      Messages with fewer characters will be filtered out
                    </p>
                  </div>
                </div>

                <div className="border-t pt-6">
                  <p className="mb-4 text-sm font-medium">Resolution Filter</p>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="resolvedStatusField">Status Field</Label>
                      <Input
                        id="resolvedStatusField"
                        value={currentConfig.resolvedStatusField ?? ''}
                        onChange={(e) =>
                          handleConfigChange('resolvedStatusField', e.target.value || null)
                        }
                        placeholder="e.g., status"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="resolvedStatusValue">Resolved Value</Label>
                      <Input
                        id="resolvedStatusValue"
                        value={currentConfig.resolvedStatusValue ?? ''}
                        onChange={(e) =>
                          handleConfigChange('resolvedStatusValue', e.target.value || null)
                        }
                        placeholder="e.g., closed"
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t pt-6">
                  <p className="mb-4 text-sm font-medium">Role Identification</p>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="roleIdentifierField">Role Field</Label>
                      <Input
                        id="roleIdentifierField"
                        value={currentConfig.roleIdentifierField ?? ''}
                        onChange={(e) =>
                          handleConfigChange('roleIdentifierField', e.target.value || null)
                        }
                        placeholder="e.g., sender_type"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="agentRoleValue">Agent Value</Label>
                      <Input
                        id="agentRoleValue"
                        value={currentConfig.agentRoleValue ?? ''}
                        onChange={(e) =>
                          handleConfigChange('agentRoleValue', e.target.value || null)
                        }
                        placeholder="e.g., agent"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="customerRoleValue">Customer Value</Label>
                      <Input
                        id="customerRoleValue"
                        value={currentConfig.customerRoleValue ?? ''}
                        onChange={(e) =>
                          handleConfigChange('customerRoleValue', e.target.value || null)
                        }
                        placeholder="e.g., customer"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <Button onClick={saveConfig} disabled={configMutation.isPending}>
                    <Save className="mr-2 h-4 w-4" />
                    {configMutation.isPending ? 'Saving...' : 'Save Filters'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
