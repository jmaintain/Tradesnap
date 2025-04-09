import React, { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { insertTradeSchema, Trade, JournalEntry } from '@shared/schema';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { processImageFile } from '@/lib/imageCompression';
import { useStorage } from '@/lib/indexedDB/StorageContext';
import { apiRequestAdapter } from '@/lib/apiAdapter';

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
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { BookOpen, UploadCloud, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';

// We need to define the date handling functions first, before using them in the schema

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
// Create a native zod schema for the form validation
const tradeFormSchema = z.object({
  symbol: z.string().min(1, { message: "Symbol is required" }),
  tradeType: z.string().min(1, { message: "Trade type is required" }),
  quantity: z.number().min(1, { message: "Quantity must be at least 1" }),
  entryPrice: z.string().min(1, { message: "Entry price is required" }),
  exitPrice: z.string().optional(), // Made optional to support ongoing trades
  isOngoing: z.boolean().optional().default(false),
  entryTime: z.string().optional(), // Optional entry time
  date: z.any().transform((val: unknown) => {
    // Use processTradeDate to handle date properly
    return processTradeDate(val as Date | string);
  }),
  screenshots: z.any().optional(),
  notes: z.string().optional(),
  // Use the user's actual ID from localStorage
  userId: z.number().default(
    () => {
      const storedUserId = localStorage.getItem('userId');
      // Parse the userId, or use a unique value based on timestamp as fallback
      return storedUserId ? parseInt(storedUserId) : Math.floor(Date.now() / 1000);
    }
  ),
}).refine((data: any) => {
  // If it's an ongoing trade, exit price is not required
  // If it's not ongoing, exit price is required
  return data.isOngoing === true || (data.exitPrice !== undefined && data.exitPrice !== '' && data.exitPrice !== null);
}, {
  message: "Exit price is required for completed trades",
  path: ["exitPrice"]
});

type TradeFormValues = z.infer<typeof tradeFormSchema>;

interface EditTradeFormProps {
  trade: Trade;
  onSubmitSuccess?: () => void;
  onCancel?: () => void;
}

const EditTradeForm: React.FC<EditTradeFormProps> = ({ 
  trade, 
  onSubmitSuccess, 
  onCancel 
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { refreshStorageInfo } = useStorage();
  const [files, setFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingScreenshots, setExistingScreenshots] = useState<string[]>(
    trade.screenshots ? 
      (Array.isArray(trade.screenshots) ? trade.screenshots : [trade.screenshots]).filter(Boolean) : 
      []
  );
  
  // Handle ongoing trade status
  const [isOngoing, setIsOngoing] = useState<boolean>(trade.isOngoing || false);
  
  // Journal entry states
  const [includeJournal, setIncludeJournal] = useState(false);
  const [journalContent, setJournalContent] = useState("");
  const [journalMood, setJournalMood] = useState("neutral");
  const [existingJournalEntry, setExistingJournalEntry] = useState<JournalEntry | null>(null);

  // Fetch instruments for the dropdown
  const { data: instruments = [] } = useQuery({
    queryKey: ['/api/instruments'],
  });
  
  // Function to fetch journal entries for a specific date
  const fetchJournalEntriesForDate = async (date: Date) => {
    try {
      // Normalize the date to avoid timezone issues
      const normalizedDate = normalizeDate(date);
      const dateStr = format(normalizedDate, 'yyyy-MM-dd');
      const journalEntries = await apiRequestAdapter<JournalEntry[]>(`/api/journal/date/${dateStr}`);
      return journalEntries;
    } catch (error) {
      console.error('Error fetching journal entries:', error);
      return [];
    }
  };

  // We now use the functions defined at the top of the file

  // Log the date we're initializing with for debugging
  console.log('Trade date from server:', trade.date);
  const initialDate = processTradeDate(trade.date);
  console.log('Initial date for form:', initialDate);

  // Initialize the form with existing trade data
  const form = useForm<TradeFormValues>({
    resolver: zodResolver(tradeFormSchema),
    defaultValues: {
      symbol: trade.symbol || '',
      tradeType: trade.tradeType || 'long',
      quantity: trade.quantity || 1,
      entryPrice: trade.entryPrice || '',
      exitPrice: trade.exitPrice || '',
      isOngoing: trade.isOngoing || false,
      entryTime: trade.entryTime || '',
      date: initialDate,
      notes: trade.notes || '',
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      // Calculate how many more files can be added
      const maxNewFiles = 2 - existingScreenshots.length;
      
      if (maxNewFiles <= 0) {
        toast({
          variant: "destructive",
          title: "Maximum screenshots reached",
          description: "Please remove an existing screenshot first before adding a new one"
        });
        return;
      }
      
      const selectedFiles = Array.from(e.target.files);
      if (selectedFiles.length > maxNewFiles) {
        toast({
          variant: "destructive",
          title: "Too many files",
          description: `You can only add ${maxNewFiles} more screenshot${maxNewFiles === 1 ? '' : 's'}`
        });
        return;
      }
      
      setFiles(prevFiles => [...prevFiles, ...selectedFiles]);
    }
  };
  
  // Handler for pasting images from clipboard
  const handlePaste = useCallback(async (e: ClipboardEvent) => {
    if (e.clipboardData && e.clipboardData.items) {
      const items = e.clipboardData.items;
      
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          e.preventDefault();
          
          // Calculate how many more files can be added
          const maxNewFiles = 2 - existingScreenshots.length - files.length;
          
          if (maxNewFiles <= 0) {
            toast({
              variant: "destructive",
              title: "Maximum screenshots reached",
              description: "Please remove an existing screenshot first before adding a new one"
            });
            return;
          }
          
          const file = items[i].getAsFile();
          if (file) {
            // Create a new file with a proper name
            const timestamp = new Date().getTime();
            const newFile = new File([file], `pasted-image-${timestamp}.png`, { type: file.type });
            
            // Add the new file to the existing files
            setFiles(prevFiles => [...prevFiles, newFile]);
            
            toast({
              title: "Image pasted",
              description: "Screenshot added from clipboard",
            });
          }
          break;
        }
      }
    }
  }, [files, existingScreenshots, toast]);
  
  // Add and remove paste event listener
  useEffect(() => {
    document.addEventListener('paste', handlePaste);
    return () => {
      document.removeEventListener('paste', handlePaste);
    };
  }, [handlePaste]);

  const handleRemoveExistingScreenshot = (index: number) => {
    setExistingScreenshots(prev => prev.filter((_, i) => i !== index));
  };
  
  // Effect to load journal entries when the date changes
  useEffect(() => {
    if (trade.date) {
      const loadJournalEntries = async () => {
        try {
          // Use the same processTradeDate to handle the date properly
          const date = processTradeDate(trade.date);
          console.log('Loading journal entries for date:', date);
          const entries = await fetchJournalEntriesForDate(date);
          
          if (entries.length > 0) {
            // Set the first entry as the existing journal entry
            setExistingJournalEntry(entries[0]);
            setJournalContent(entries[0].content || "");
            setJournalMood(entries[0].mood || "neutral");
          } else {
            setExistingJournalEntry(null);
            setJournalContent("");
            setJournalMood("neutral");
          }
        } catch (error) {
          console.error("Error loading journal entries:", error);
          toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to load journal entries",
          });
        }
      };
      
      loadJournalEntries();
    }
  }, [trade.date, toast]);

  const onSubmit = async (data: TradeFormValues) => {
    try {
      setIsSubmitting(true);
      
      // Create FormData for file upload
      const formData = new FormData();
      
      // Add all form fields to FormData
      Object.entries(data).forEach(([key, value]) => {
        if (key === 'date') {
          // Ensure we use a normalized date to avoid timezone issues
          const normalizedDate = normalizeDate(value as Date);
          formData.append(key, format(normalizedDate, 'yyyy-MM-dd'));
        } else if (value !== undefined && value !== null) {
          formData.append(key, value.toString());
        }
      });
      
      // Add existing screenshots that were not removed
      if (existingScreenshots.length > 0) {
        formData.append('existingScreenshots', JSON.stringify(existingScreenshots));
      }
      
      // Process and compress new images before adding them to FormData
      if (files.length > 0) {
        // Show a toast message to indicate compression is happening
        toast({
          title: "Processing images",
          description: "Compressing screenshots to optimize storage...",
        });
        
        // Process each file individually
        for (const file of files) {
          try {
            // If it's an image file, compress it
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
      
      // Custom fetch with FormData to update the trade
      const response = await fetch(`/api/trades/${trade.id}`, {
        method: 'PUT',
        body: formData,
        credentials: 'include',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update trade');
      }
      
      // Process journal entry if included
      if (includeJournal && data.date) {
        try {
          // Use normalized date for journal entry
          const normalizedDate = normalizeDate(data.date as Date);
          const dateStr = format(normalizedDate, 'yyyy-MM-dd');
          
          if (existingJournalEntry) {
            // Update existing journal entry
            await apiRequestAdapter(`/api/journal/${existingJournalEntry.id}`, {
              method: 'PUT',
              body: JSON.stringify({
                content: journalContent,
                mood: journalMood,
                date: dateStr,
                userId: parseInt(localStorage.getItem("userId") || "0")
              }),
              headers: {
                'Content-Type': 'application/json'
              }
            });
          } else {
            // Create new journal entry
            await apiRequestAdapter(`/api/journal`, {
              method: 'POST',
              body: JSON.stringify({
                content: journalContent,
                mood: journalMood,
                date: dateStr,
                userId: parseInt(localStorage.getItem("userId") || "0")
              }),
              headers: {
                'Content-Type': 'application/json'
              }
            });
          }
          
          // Invalidate journal queries
          queryClient.invalidateQueries({ queryKey: ['/api/journal'] });
        } catch (error) {
          console.error('Error saving journal entry:', error);
          toast({
            variant: "destructive",
            title: "Warning",
            description: "Trade was updated but there was an error saving the journal entry",
          });
        }
      }
      
      toast({
        title: "Trade updated",
        description: includeJournal 
          ? "Your trade and journal entry have been successfully updated" 
          : "Your trade has been successfully updated",
      });
      
      // Invalidate trades query to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/trades'] });
      
      // Refresh storage info to update usage indicators
      console.log("Refreshing storage info after trade update");
      await refreshStorageInfo();
      console.log("Storage info refresh completed after update");
      
      if (onSubmitSuccess) {
        onSubmitSuccess();
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update trade",
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
            name="entryTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Entry Time (Optional)</FormLabel>
                <FormControl>
                  <Input type="time" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="exitPrice"
            render={({ field }) => (
              <FormItem>
                <FormLabel className={isOngoing ? "" : "after:content-['*'] after:ml-0.5 after:text-red-500"}>
                  Exit Price {isOngoing && "(Optional for ongoing trades)"}
                </FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    step="0.01" 
                    {...field} 
                    disabled={isOngoing}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="isOngoing"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center space-x-3 space-y-0 pt-6">
                <FormControl>
                  <Checkbox 
                    checked={field.value}
                    onCheckedChange={(checked) => {
                      // Update the form field
                      field.onChange(checked);
                      // Also update our state for UI changes
                      setIsOngoing(!!checked);
                      
                      // If checked, clear exit price, if unchecked, reset it
                      if (checked) {
                        form.setValue('exitPrice', '');
                      }
                    }}
                  />
                </FormControl>
                <FormLabel className="text-sm font-medium leading-none cursor-pointer">
                  This is an ongoing/active trade (no exit price yet)
                </FormLabel>
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
          <FormLabel className="block mb-2">Screenshots (Max 2)</FormLabel>
          
          {/* Existing Screenshots */}
          {existingScreenshots.length > 0 && (
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">Existing Screenshots:</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {existingScreenshots.map((screenshot, index) => {
                  const imageSrc = screenshot.startsWith('data:') 
                    ? screenshot 
                    : screenshot.startsWith('/uploads/') 
                      ? screenshot.substring(1) // Remove leading slash
                      : `/uploads/${screenshot}`;
                  
                  return (
                    <div key={index} className="relative border rounded-lg overflow-hidden group">
                      <img 
                        src={imageSrc} 
                        alt={`Existing screenshot ${index + 1}`} 
                        className="w-full h-auto object-contain"
                      />
                      <Button 
                        type="button"
                        size="sm" 
                        variant="destructive" 
                        className="absolute top-2 right-2 opacity-70 hover:opacity-100"
                        onClick={() => handleRemoveExistingScreenshot(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          
          {/* New Screenshots Upload */}
          {existingScreenshots.length < 2 && (
            <div className="mt-3 flex justify-center px-4 sm:px-6 pt-4 pb-4 sm:pt-5 sm:pb-6 border-2 border-gray-300 border-dashed rounded-md">
              <div className="space-y-1 text-center">
                <UploadCloud className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-gray-400" />
                <div className="flex flex-col text-sm text-gray-600">
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
                  <p className="pl-1 text-xs sm:text-sm">or drag and drop</p>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  PNG, JPG, GIF up to 10MB ({2 - existingScreenshots.length} slots available)
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  <span className="font-semibold">Pro Tip:</span> You can paste screenshots directly (Ctrl+V / ⌘+V)
                </p>
                {files.length > 0 && (
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">Selected files to add:</p>
                    <ul className="pl-5 text-xs text-gray-500">
                      {files.map((file, index) => (
                        <li key={index} className="flex items-center justify-between mb-1">
                          <span className="truncate">{file.name}</span>
                          <button 
                            type="button"
                            onClick={() => {
                              setFiles(files.filter((_, i) => i !== index));
                            }}
                            className="ml-2 text-red-500 hover:text-red-700 text-xs"
                          >
                            ✕
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
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
                        rows={4}
                        placeholder="Write your journal entry here..."
                      />
                    </div>
                  </>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <div className="sticky bottom-0 pt-3 mt-4 border-t border-gray-200 bg-white">
          <div className="flex justify-end gap-3 p-2 sm:p-0 sm:py-2">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
              className="text-xs sm:text-sm px-3 sm:px-4 h-9"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="text-xs sm:text-sm px-3 sm:px-4 h-9"
            >
              {isSubmitting ? 'Saving...' : 'Update Trade'}
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
};

export default EditTradeForm;