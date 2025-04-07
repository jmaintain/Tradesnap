import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { insertTradeSchema, Trade } from '@shared/schema';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { processImageFile } from '@/lib/imageCompression';
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
import { UploadCloud, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';

// Extend the trade schema for the form with required fields validation
const tradeFormSchema = insertTradeSchema.extend({
  symbol: z.string().min(1, { message: "Symbol is required" }),
  tradeType: z.string().min(1, { message: "Trade type is required" }),
  quantity: z.number().min(1, { message: "Quantity must be at least 1" }),
  entryPrice: z.string().min(1, { message: "Entry price is required" }),
  exitPrice: z.string().min(1, { message: "Exit price is required" }),
  date: z.any().transform(val => val ? new Date(val) : new Date()),
  screenshots: z.any().optional(),
  // Ensuring default userId for demo purposes
  userId: z.number().default(1),
}).omit({ userId: true });

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

  // Fetch instruments for the dropdown
  const { data: instruments = [] } = useQuery({
    queryKey: ['/api/instruments'],
  });

  // Initialize the form with existing trade data
  const form = useForm<TradeFormValues>({
    resolver: zodResolver(tradeFormSchema),
    defaultValues: {
      symbol: trade.symbol || '',
      tradeType: trade.tradeType || 'long',
      quantity: trade.quantity || 1,
      entryPrice: trade.entryPrice || '',
      exitPrice: trade.exitPrice || '',
      date: trade.date ? new Date(trade.date) : new Date(),
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
      
      setFiles(selectedFiles);
    }
  };

  const handleRemoveExistingScreenshot = (index: number) => {
    setExistingScreenshots(prev => prev.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: TradeFormValues) => {
    try {
      setIsSubmitting(true);
      
      // Create FormData for file upload
      const formData = new FormData();
      
      // Add all form fields to FormData
      Object.entries(data).forEach(([key, value]) => {
        if (key === 'date') {
          formData.append(key, format(value, 'yyyy-MM-dd'));
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
      
      toast({
        title: "Trade updated",
        description: "Your trade has been successfully updated",
      });
      
      // Invalidate trades query to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/trades'] });
      
      // Refresh storage info to update usage indicators
      await refreshStorageInfo();
      
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
                  defaultValue={field.value}
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
                  defaultValue={field.value}
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
                    onChange={(e) => field.onChange(new Date(e.target.value))}
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
            <div className="mt-3 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
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
                  PNG, JPG, GIF up to 10MB ({2 - existingScreenshots.length} slots available, compressed to ~100KB each)
                </p>
                {files.length > 0 && (
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">Selected files to add:</p>
                    <ul className="list-disc pl-5 text-xs text-gray-500">
                      {files.map((file, index) => (
                        <li key={index}>{file.name}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        
        <div className="pt-3 border-t border-gray-200">
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
              {isSubmitting ? 'Saving...' : 'Update Trade'}
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
};

export default EditTradeForm;