import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { insertSettingsSchema } from '@shared/schema';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Save } from 'lucide-react';
import { StorageManagement } from '@/components/ui/storage-management';
import { StorageDebug } from '@/components/StorageDebug';

// Extend the settings schema for the form
const settingsFormSchema = insertSettingsSchema.omit({ userId: true }).extend({
  defaultInstrument: z.string().optional(),
});

type SettingsFormValues = z.infer<typeof settingsFormSchema>;

const Settings: React.FC = () => {
  const { toast } = useToast();
  const [userEmail, setUserEmail] = useState<string>('');
  
  // Get user email from localStorage
  useEffect(() => {
    const email = localStorage.getItem('userEmail');
    if (email) {
      setUserEmail(email);
    }
  }, []);
  
  // Fetch instruments for the dropdown
  const { data: instruments = [] } = useQuery<any[]>({
    queryKey: ['/api/instruments'],
  });
  
  // Fetch user settings
  const { data: settings, isLoading } = useQuery<{
    defaultInstrument?: string;
    theme?: string;
    userId?: number;
  }>({
    queryKey: ['/api/settings']
  });
  
  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues: {
      defaultInstrument: settings?.defaultInstrument || '',
    },
    values: {
      defaultInstrument: settings?.defaultInstrument || '',
    }
  });
  
  // Update settings mutation
  const mutation = useMutation({
    mutationFn: async (data: SettingsFormValues) => {
      // Add userId for the backend
      const settingsData = { ...data, userId: 1 };
      const res = await apiRequest('POST', '/api/settings', settingsData);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Settings saved",
        description: "Your preferences have been updated"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error saving settings",
        description: error instanceof Error ? error.message : "An error occurred"
      });
    }
  });
  
  const onSubmit = (data: SettingsFormValues) => {
    mutation.mutate(data);
  };
  
  if (isLoading) {
    return (
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="py-6">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 md:px-8">
        <h1 className="text-2xl font-semibold text-gray-900 mb-6">Settings</h1>
        
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Preferences</CardTitle>
            <CardDescription>
              Configure application settings and defaults
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="defaultInstrument"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Default Instrument</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select default instrument" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {instruments.map((instrument: any) => (
                            <SelectItem key={instrument.symbol} value={instrument.symbol}>
                              {instrument.symbol} - {instrument.description}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        This will be pre-selected when adding new trades
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Separator />
                
                <div className="flex justify-end">
                  <Button 
                    type="submit" 
                    disabled={mutation.isPending || !form.formState.isDirty}
                  >
                    {mutation.isPending ? (
                      <div className="mr-2 animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    Save Settings
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
        
        <StorageManagement monthsToRetain={1} />
        
        {/* Storage Debug Panel */}
        <Card className="mt-8 mb-8">
          <CardHeader>
            <CardTitle>Storage Debug Information</CardTitle>
            <CardDescription>
              Technical details about IndexedDB storage (for developers)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <StorageDebug />
          </CardContent>
        </Card>
        
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
            <CardDescription>
              Your account details and preferences
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-gray-500">Account Type</h4>
                <p className="mt-1 flex items-center">
                  <span className="mr-2">Free Account</span>
                </p>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-500">Email</h4>
                <p className="mt-1">{userEmail || 'No email found'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Settings;
