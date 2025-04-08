import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { insertTradeSchema, insertJournalEntrySchema } from '@shared/schema';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { processImageFile } from '@/lib/imageCompression';
import { apiRequestAdapter } from '@/lib/apiAdapter';
import { useStorage } from '@/lib/indexedDB/StorageContext';

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { UploadCloud, BookOpen } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

// Function to handle date conversion to avoid timezone issues
// Function to handle date conversion for trade date
const normalizeDate = (dateString: string | Date): Date => {
  // Extract date components from the input
  let date: Date;
  
  if (typeof dateString === 'string' && dateString.includes('-')) {
    // If it's a date string in YYYY-MM-DD format from date input field
    const [year, month, day] = dateString.split('-').map(Number);
    // Create date at noon UTC on the specified day to avoid timezone issues
    date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  } else {
    // For other date inputs, initialize the Date object
    date = new Date(dateString);
    
    // Extract year, month and day
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();
    
    // Create a new Date at noon UTC to avoid timezone boundary issues
    date = new Date(Date.UTC(year, month, day, 12, 0, 0));
  }
  
  console.log('Original input date:', dateString);
  console.log('Normalized date (UTC noon):', date.toISOString());
  
  return date;
};

// Process the date from the trade before passing it to the form
/**
 * Process a date value from various possible formats into a consistent Date object
 * - Handles ISO strings from the server (2025-04-04T00:00:00.000Z)
 * - Handles regular Date objects
 * - Handles string date values
 */
const processTradeDate = (dateValue: Date | string | null | undefined): Date => {
  console.log('Processing date value:', dateValue, 'Type:', typeof dateValue);
  
  if (!dateValue) {
    console.log('No date value provided, using current date');
    return normalizeDate(new Date());
  }
  
  // If it's a string that looks like an ISO date, handle it specially
  if (typeof dateValue === 'string') {
    if (dateValue.includes('T')) {
      // Extract the date part (YYYY-MM-DD) from ISO string
      const datePart = dateValue.split('T')[0];
      console.log('Extracted date part from ISO string:', datePart);
      const [year, month, day] = datePart.split('-').map(Number);
      
      // Create a date at UTC noon to avoid timezone issues
      const result = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
      console.log('Created UTC date from parts:', result.toISOString());
      return result;
    } else {
      // Plain date string like "2025-04-08"
      console.log('Processing plain date string:', dateValue);
      return normalizeDate(dateValue);
    }
  }
  
  // If it's already a Date object, just normalize it
  console.log('Processing Date object:', dateValue);
  return normalizeDate(dateValue);
};

// Extend the trade schema for the form with required fields validation
const tradeFormSchema = insertTradeSchema.extend({
  symbol: z.string().min(1, { message: "Symbol is required" }),
  tradeType: z.string().min(1, { message: "Trade type is required" }),
  quantity: z.number().min(1, { message: "Quantity must be at least 1" }),
  entryPrice: z.string().min(1, { message: "Entry price is required" }),
  exitPrice: z.string().min(1, { message: "Exit price is required" }),
  date: z.any().transform(val => {
    // Use processTradeDate to handle date properly
    return processTradeDate(val);
  }),
  screenshots: z.any().optional(),
  // Ensuring default userId for demo purposes
  userId: z.number().default(1),
}).omit({ userId: true });

type TradeFormValues = z.infer<typeof tradeFormSchema>;

interface TradeFormProps {
  onSubmitSuccess?: () => void;
  onCancel?: () => void;
}

const TradeForm: React.FC<TradeFormProps> = ({ onSubmitSuccess, onCancel }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { refreshStorageInfo } = useStorage();
  const [files, setFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [journalContent, setJournalContent] = useState<string>('');
  const [journalMood, setJournalMood] = useState<string>('neutral');
  const [includeJournal, setIncludeJournal] = useState<boolean>(false);

  // Fetch instruments for the dropdown
  const { data: instruments = [] } = useQuery({
    queryKey: ['/api/instruments'],
  });

  // Fetch user settings for default instrument
  const { data: settings } = useQuery<{
    defaultInstrument?: string;
    theme?: string;
    userId?: number;
  }>({
    queryKey: ['/api/settings']
  });

  // Use the settings to initialize the form with the default instrument
  const form = useForm<TradeFormValues>({
    resolver: zodResolver(tradeFormSchema),
    defaultValues: {
      symbol: '',
      tradeType: 'long',
      quantity: 1,
      entryPrice: '',
      exitPrice: '',
      date: normalizeDate(new Date()),
      notes: '',
    }
  });

  // Update the symbol field with the default instrument when settings are loaded
  useEffect(() => {
    if (settings?.defaultInstrument) {
      form.setValue('symbol', settings.defaultInstrument);
    }
  }, [settings, form]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      if (selectedFiles.length > 2) {
        toast({
          variant: "destructive",
          title: "Too many files",
          description: "Maximum of 2 screenshots allowed"
        });
        return;
      }
      setFiles(selectedFiles);
    }
  };

  const onSubmit = async (data: TradeFormValues) => {
    // Use try-catch to handle any form validation errors that might occur
    try {
      setIsSubmitting(true);
      
      // Create FormData for file upload
      const formData = new FormData();
      
      // Add all form fields to FormData
      Object.entries(data).forEach(([key, value]) => {
        if (key === 'date') {
          // Make sure we're using the normalized date without timezone issues
          // This ensures the exact date selected by the user is used
          const selectedDate = value as Date;
          // Apply normalization to ensure consistency with date handling across the app
          const normalizedDate = normalizeDate(selectedDate);
          console.log('Submitting date:', normalizedDate);
          formData.append(key, format(normalizedDate, 'yyyy-MM-dd'));
        } else if (value !== undefined && value !== null) {
          formData.append(key, value.toString());
        }
      });
      
      // Process and compress images before adding them to FormData
      if (files.length > 0) {
        // Show a toast message to indicate compression is happening
        toast({
          title: "Processing images",
          description: "Compressing screenshots to optimize storage...",
        });
        
        // Process each file individually
        for (const file of files) {
          try {
            // If it's an image file, compress it to approximately 100KB
            if (file.type.startsWith('image/')) {
              const compressedImageDataUrl = await processImageFile(file, 100);
              
              // Convert the data URL back to a Blob/File for upload
              const base64Response = await fetch(compressedImageDataUrl);
              const compressedBlob = await base64Response.blob();
              
              // Create a new File from the compressed Blob
              const compressedFile = new File(
                [compressedBlob], 
                file.name, 
                { type: 'image/jpeg', lastModified: Date.now() }
              );
              
              // Add the compressed file to FormData
              formData.append('screenshots', compressedFile);
              console.log(`Compressed image from ${Math.round(file.size / 1024)}KB to ${Math.round(compressedBlob.size / 1024)}KB`);
            } else {
              // If it's not an image, add the original file
              formData.append('screenshots', file);
            }
          } catch (error) {
            console.error("Error compressing image:", error);
            // If compression fails, use the original file
            formData.append('screenshots', file);
          }
        }
      }
      
      // Custom fetch with FormData
      const response = await fetch('/api/trades', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save trade');
      }
      
      // Create journal entry if include journal is checked
      if (includeJournal && journalContent.trim()) {
        try {
          // Use the same date format as the trade
          const selectedDate = data.date as Date;
          // Ensure the date is normalized to avoid timezone issues
          const normalizedDate = normalizeDate(selectedDate);
          await apiRequestAdapter('/api/journal', {
            method: 'POST',
            body: JSON.stringify({
              content: journalContent,
              date: format(normalizedDate, 'yyyy-MM-dd'),
              mood: journalMood
            }),
            headers: {
              'Content-Type': 'application/json',
            },
          });
          
          // Invalidate journal queries
          queryClient.invalidateQueries({ queryKey: ['/api/journal'] });
          
          // Format date for the journal date query cache invalidation
          // Use normalized date to ensure consistency
          const dateForQuery = format(normalizedDate, 'yyyy-MM-dd');
          queryClient.invalidateQueries({ queryKey: ['/api/journal/date', dateForQuery] });
          
          toast({
            title: "Trade and Journal Created",
            description: "Your trade and journal entry have been successfully recorded.",
          });
        } catch (error) {
          console.error('Error creating journal entry:', error);
          toast({
            variant: "destructive",
            title: "Trade Created, Journal Failed",
            description: "Your trade was saved but the journal entry could not be created.",
          });
        }
      } else {
        toast({
          title: "Trade saved",
          description: "Your trade has been successfully recorded",
        });
      }
      
      // Invalidate trades query to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/trades'] });
      
      // Refresh storage info to update usage indicators
      console.log("Refreshing storage info after trade creation");
      await refreshStorageInfo();
      console.log("Storage info refresh completed");
      
      if (onSubmitSuccess) {
        onSubmitSuccess();
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save trade",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Add form error check handler
  const handleFormSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    // Use validate to check for errors
    const validationResult = await form.trigger();
    
    // If there are validation errors, show them in toast
    if (!validationResult) {
      // Get the errors from form state
      const errors = form.formState.errors;
      
      // Build error message
      const errorFields: string[] = Object.keys(errors).map(fieldName => {
        const error = errors[fieldName as keyof typeof errors];
        return (error?.message as string) || `${fieldName} is required`;
      });
      
      // Show toast with validation errors
      toast({
        variant: "destructive",
        title: "Missing Required Fields",
        description: (
          <ul className="list-disc pl-5">
            {errorFields.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        ),
      });
      
      return;
    }
    
    // If no validation errors, proceed with form submission
    form.handleSubmit(onSubmit)(event);
  };

  return (
    <Form {...form}>
      <form onSubmit={handleFormSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="symbol"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="after:content-['*'] after:ml-0.5 after:text-red-500">Symbol</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Array.isArray(instruments) && instruments.map((instrument: {symbol: string, description: string}) => (
                      <SelectItem key={instrument.symbol} value={instrument.symbol}>
                        {instrument.symbol} - {instrument.description}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="tradeType"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="after:content-['*'] after:ml-0.5 after:text-red-500">Type</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="long">Long</SelectItem>
                    <SelectItem value="short">Short</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="quantity"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="after:content-['*'] after:ml-0.5 after:text-red-500">Quantity</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    min="1" 
                    {...field} 
                    onChange={(e) => field.onChange(parseInt(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="after:content-['*'] after:ml-0.5 after:text-red-500">Date</FormLabel>
                <FormControl>
                  <Input 
                    type="date" 
                    {...field} 
                    value={field.value instanceof Date ? format(field.value, 'yyyy-MM-dd') : ''}
                    onChange={(e) => {
                      const normalizedDate = normalizeDate(e.target.value);
                      console.log('Date selected:', e.target.value);
                      console.log('Normalized date:', normalizedDate);
                      field.onChange(normalizedDate);
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="entryPrice"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="after:content-['*'] after:ml-0.5 after:text-red-500">Entry Price</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="exitPrice"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="after:content-['*'] after:ml-0.5 after:text-red-500">Exit Price</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Add notes about your trade here..." 
                  className="resize-none"
                  value={field.value || ''}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  name={field.name}
                  ref={field.ref}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div>
          <FormLabel className="block mb-2">Screenshots (Optional)</FormLabel>
          <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
            <div className="space-y-1 text-center">
              <UploadCloud className="mx-auto h-12 w-12 text-gray-400" />
              <div className="flex text-sm text-gray-600">
                <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                  <span>Upload files</span>
                  <input
                    id="file-upload"
                    name="file-upload"
                    type="file"
                    className="sr-only"
                    multiple
                    accept="image/*"
                    onChange={handleFileChange}
                  />
                </label>
                <p className="pl-1">or drag and drop</p>
              </div>
              <p className="text-xs text-gray-500">
                PNG, JPG, GIF up to 10MB (max 2 files, compressed to ~100KB each)
              </p>
              {files.length > 0 && (
                <div className="mt-2">
                  <p className="text-sm text-gray-500">Selected files:</p>
                  <ul className="list-disc pl-5 text-xs text-gray-500">
                    {files.map((file, index) => (
                      <li key={index}>{file.name}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>

        <Accordion type="single" collapsible className="mt-4">
          <AccordionItem value="journal">
            <AccordionTrigger>
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                <span>Add Journal Entry</span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4 pt-2">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="include-journal" 
                    checked={includeJournal}
                    onCheckedChange={() => setIncludeJournal(!includeJournal)}
                  />
                  <label
                    htmlFor="include-journal"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Include journal entry with this trade
                  </label>
                </div>
                
                {includeJournal && (
                  <>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="mood" className="text-right">
                        Mood
                      </Label>
                      <Select value={journalMood} onValueChange={setJournalMood}>
                        <SelectTrigger className="col-span-3">
                          <SelectValue placeholder="Select your mood" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="great">Great</SelectItem>
                          <SelectItem value="good">Good</SelectItem>
                          <SelectItem value="neutral">Neutral</SelectItem>
                          <SelectItem value="bad">Bad</SelectItem>
                          <SelectItem value="terrible">Terrible</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-4 items-start gap-4">
                      <Label htmlFor="journal-content" className="text-right pt-2">
                        Journal
                      </Label>
                      <Textarea
                        id="journal-content"
                        value={journalContent}
                        onChange={(e) => setJournalContent(e.target.value)}
                        className="col-span-3"
                        rows={6}
                        placeholder="Write your journal entry here..."
                      />
                    </div>
                  </>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
        
        <div className="pt-3 border-t border-gray-200 mt-4">
          <div className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="ml-3"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : 'Save Trade'}
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
};

export default TradeForm;
