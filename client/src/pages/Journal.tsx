import { useCallback, useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { CalendarIcon, Edit, PenLine, Trash2, BookOpen, Calendar as CalendarIcon2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getQueryFn } from '@/lib/queryClient';
import { apiRequestAdapter } from '@/lib/apiAdapter';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Trade } from '@shared/schema';
import { DayProps } from 'react-day-picker';

interface JournalEntry {
  id: number;
  userId: number;
  date: string;
  content: string;
  mood: string;
  createdAt: string;
  updatedAt: string;
}

interface TradesForDate {
  date: string;
  trades: Trade[];
}

const JournalPage = () => {
  const [date, setDate] = useState<Date>(new Date());
  const [showNewEntryDialog, setShowNewEntryDialog] = useState(false);
  const [journalContent, setJournalContent] = useState('');
  const [mood, setMood] = useState('neutral');
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null);
  const [deleteEntryId, setDeleteEntryId] = useState<number | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Format date as yyyy-MM-dd
  const formattedDate = format(date, 'yyyy-MM-dd');

  // Query for journal entries on selected date
  const { data: journalEntries = [] } = useQuery({
    queryKey: ['/api/journal/date', formattedDate],
    queryFn: async () => {
      try {
        return await apiRequestAdapter<JournalEntry[]>(`/api/journal/date/${formattedDate}`);
      } catch (error) {
        console.error("Error fetching journal entries:", error);
        return [];
      }
    },
    enabled: !!formattedDate,
  });

  // Query for trades on selected date
  const { data: allTrades = [] } = useQuery({
    queryKey: ['/api/trades'],
    queryFn: getQueryFn<Trade[]>({ on401: 'returnNull' }),
  });

  // Filter trades for selected date
  const tradesForSelectedDate = allTrades.filter(trade => {
    const tradeDate = new Date(trade.date);
    return (
      tradeDate.getDate() === date.getDate() &&
      tradeDate.getMonth() === date.getMonth() &&
      tradeDate.getFullYear() === date.getFullYear()
    );
  });

  // Using the apiRequestAdapter from @/lib/apiAdapter

  // Create a new journal entry
  const createMutation = useMutation({
    mutationFn: async (data: { content: string; date: string; mood: string }) => {
      return apiRequestAdapter<JournalEntry>('/api/journal', {
        method: 'POST',
        body: JSON.stringify(data),
        headers: {
          'Content-Type': 'application/json',
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/journal/date', formattedDate] });
      setShowNewEntryDialog(false);
      setJournalContent('');
      setMood('neutral');
      toast({
        title: 'Success',
        description: 'Journal entry created successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create journal entry',
        variant: 'destructive',
      });
    },
  });

  // Update an existing journal entry
  const updateMutation = useMutation({
    mutationFn: async (data: { id: number; content: string; mood: string }) => {
      return apiRequestAdapter<JournalEntry>(`/api/journal/${data.id}`, {
        method: 'PUT',
        body: JSON.stringify({ content: data.content, mood: data.mood }),
        headers: {
          'Content-Type': 'application/json',
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/journal/date', formattedDate] });
      setEditingEntry(null);
      toast({
        title: 'Success',
        description: 'Journal entry updated successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update journal entry',
        variant: 'destructive',
      });
    },
  });

  // Delete a journal entry
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequestAdapter<void>(`/api/journal/${id}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/journal/date', formattedDate] });
      setDeleteEntryId(null);
      toast({
        title: 'Success',
        description: 'Journal entry deleted successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete journal entry',
        variant: 'destructive',
      });
    },
  });

  // Add trade indicators to the calendar (simplified approach)
  const getTradeDates = useMemo(() => {
    // Get all dates that have trades
    const tradeDates: Record<string, boolean> = {};
    
    allTrades.forEach(trade => {
      if (trade.date) {
        try {
          const tradeDate = new Date(trade.date);
          const formattedDate = format(tradeDate, 'yyyy-MM-dd');
          tradeDates[formattedDate] = true;
        } catch (e) {
          // Ignore invalid dates
        }
      }
    });
    
    return tradeDates;
  }, [allTrades]);
  
  // Add decorations to the calendar after it renders
  useEffect(() => {
    // Add indicators to calendar days that have trades
    const tradeDays = document.querySelectorAll('.rdp-day');
    
    tradeDays.forEach(dayElement => {
      const dateAttr = dayElement.getAttribute('aria-label');
      if (dateAttr) {
        try {
          // Try to parse the date from the aria-label
          const dayDate = new Date(dateAttr);
          const formattedDate = format(dayDate, 'yyyy-MM-dd');
          
          // If this day has trades, add an indicator
          if (getTradeDates[formattedDate]) {
            const indicator = document.createElement('div');
            indicator.className = 'absolute bottom-1 right-1 h-1 w-1 rounded-full bg-green-500';
            dayElement.appendChild(indicator);
          }
        } catch (e) {
          // Ignore parsing errors
        }
      }
    });
  }, [getTradeDates, date]);

  const handleCreateEntry = () => {
    // Use ISO string format to include time information
    createMutation.mutate({
      content: journalContent,
      date: date.toISOString(),
      mood,
    });
  };

  const handleUpdateEntry = () => {
    if (editingEntry) {
      updateMutation.mutate({
        id: editingEntry.id,
        content: journalContent,
        mood,
      });
    }
  };

  const openEditDialog = (entry: JournalEntry) => {
    setEditingEntry(entry);
    setJournalContent(entry.content);
    setMood(entry.mood);
  };

  const confirmDelete = (id: number) => {
    setDeleteEntryId(id);
  };

  const handleDeleteEntry = () => {
    if (deleteEntryId !== null) {
      deleteMutation.mutate(deleteEntryId);
    }
  };

  return (
    <div className="container py-6 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Trading Journal</h1>
        <Button onClick={() => setShowNewEntryDialog(true)}>
          <PenLine className="mr-2 h-4 w-4" />
          New Entry
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[350px_1fr] gap-6">
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center">
              <CalendarIcon className="mr-2 h-5 w-5" />
              Date Selection
            </CardTitle>
            <CardDescription>Select a date to view or add journal entries</CardDescription>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={date}
              onSelect={(newDate) => newDate && setDate(newDate)}
              className="border rounded-md relative"
            />
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>
                <div className="flex items-center">
                  <CalendarIcon2 className="mr-2 h-5 w-5" />
                  {format(date, 'MMMM d, yyyy')}
                </div>
              </CardTitle>
              <CardDescription>Journal entries and trades for the selected date</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="journal">
                <TabsList className="grid grid-cols-2 mb-4">
                  <TabsTrigger value="journal" className="flex items-center">
                    <BookOpen className="mr-2 h-4 w-4" />
                    Journal Entries
                  </TabsTrigger>
                  <TabsTrigger value="trades" className="flex items-center">
                    <PenLine className="mr-2 h-4 w-4" />
                    Trades
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="journal">
                  <div className="space-y-4">
                    {journalEntries.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <p>No journal entries for this date.</p>
                        <Button 
                          variant="outline" 
                          className="mt-2"
                          onClick={() => setShowNewEntryDialog(true)}
                        >
                          Create Entry
                        </Button>
                      </div>
                    ) : (
                      journalEntries.map((entry) => (
                        <Card key={entry.id} className="border-muted">
                          <CardHeader className="pb-2">
                            <div className="flex justify-between items-center">
                              <div className="flex items-center gap-2">
                                <CardTitle className="text-lg">
                                  {format(new Date(entry.date), 'h:mm a')}
                                </CardTitle>
                                <span className="bg-primary/10 text-primary text-xs px-2 py-1 rounded-full">
                                  {entry.mood.charAt(0).toUpperCase() + entry.mood.slice(1)}
                                </span>
                              </div>
                              <div className="flex gap-2">
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => openEditDialog(entry)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => confirmDelete(entry.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="whitespace-pre-wrap">{entry.content}</div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="trades">
                  <div className="space-y-4">
                    {tradesForSelectedDate.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <p>No trades for this date.</p>
                      </div>
                    ) : (
                      tradesForSelectedDate.map((trade) => (
                        <Card key={trade.id} className="border-muted">
                          <CardHeader className="pb-2">
                            <div className="flex justify-between items-start">
                              <div>
                                <CardTitle className="text-lg">{trade.symbol}</CardTitle>
                                <CardDescription>
                                  {format(new Date(trade.date), 'h:mm a')} · {trade.tradeType.toUpperCase()} · {trade.quantity} contract{trade.quantity !== 1 ? 's' : ''}
                                </CardDescription>
                              </div>
                              <div className={cn(
                                "text-xl font-bold",
                                trade.pnlDollars && parseFloat(trade.pnlDollars) >= 0 ? "text-green-500" : "text-red-500"
                              )}>
                                {trade.pnlDollars && parseFloat(trade.pnlDollars) >= 0 ? '+' : ''}${trade.pnlDollars ? parseFloat(trade.pnlDollars).toFixed(2) : '0.00'}
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-2 gap-2 text-sm mb-2">
                              <div>
                                <span className="text-muted-foreground">Entry:</span> {trade.entryPrice}
                              </div>
                              <div>
                                <span className="text-muted-foreground">Exit:</span> {trade.exitPrice}
                              </div>
                            </div>
                            {trade.notes && (
                              <>
                                <Separator className="my-2" />
                                <div className="text-sm mt-2">
                                  <span className="font-medium">Notes:</span>
                                  <p className="mt-1 whitespace-pre-wrap">{trade.notes}</p>
                                </div>
                              </>
                            )}
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* New Journal Entry Dialog */}
      <Dialog open={showNewEntryDialog} onOpenChange={setShowNewEntryDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>New Journal Entry</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="date" className="text-right">
                Date
              </Label>
              <div className="col-span-3">
                <div className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm">
                  {format(date, 'MMMM d, yyyy')}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="mood" className="text-right">
                Mood
              </Label>
              <Select value={mood} onValueChange={setMood}>
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
              <Label htmlFor="content" className="text-right pt-2">
                Content
              </Label>
              <Textarea
                id="content"
                value={journalContent}
                onChange={(e) => setJournalContent(e.target.value)}
                className="col-span-3"
                rows={8}
                placeholder="Write your journal entry here..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowNewEntryDialog(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              onClick={handleCreateEntry}
              disabled={!journalContent.trim() || createMutation.isPending}
            >
              {createMutation.isPending ? 'Saving...' : 'Save Entry'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Journal Entry Dialog */}
      <Dialog open={editingEntry !== null} onOpenChange={(open) => !open && setEditingEntry(null)}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Journal Entry</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="mood" className="text-right">
                Mood
              </Label>
              <Select value={mood} onValueChange={setMood}>
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
              <Label htmlFor="content" className="text-right pt-2">
                Content
              </Label>
              <Textarea
                id="content"
                value={journalContent}
                onChange={(e) => setJournalContent(e.target.value)}
                className="col-span-3"
                rows={8}
                placeholder="Write your journal entry here..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEditingEntry(null)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              onClick={handleUpdateEntry}
              disabled={!journalContent.trim() || updateMutation.isPending}
            >
              {updateMutation.isPending ? 'Saving...' : 'Update Entry'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteEntryId !== null} onOpenChange={(open) => !open && setDeleteEntryId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the journal entry.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteEntry}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default JournalPage;