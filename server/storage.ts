import { 
  users, type User, type InsertUser,
  instruments, type Instrument, type InsertInstrument,
  trades, type Trade, type InsertTrade,
  settings, type Settings, type InsertSettings,
  journalEntries, type JournalEntry, type InsertJournalEntry,
  subscribers, type Subscriber, type InsertSubscriber
} from "@shared/schema";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Instrument operations
  getInstruments(): Promise<Instrument[]>;
  getInstrumentBySymbol(symbol: string): Promise<Instrument | undefined>;
  createInstrument(instrument: InsertInstrument): Promise<Instrument>;
  updateInstrument(id: number, instrument: Partial<InsertInstrument>): Promise<Instrument | undefined>;
  deleteInstrument(id: number): Promise<boolean>;

  // Trade operations
  getTrades(userId: number): Promise<Trade[]>;
  getTradeById(id: number): Promise<Trade | undefined>;
  createTrade(trade: InsertTrade): Promise<Trade>;
  updateTrade(id: number, trade: Partial<InsertTrade>): Promise<Trade | undefined>;
  deleteTrade(id: number): Promise<boolean>;

  // Settings operations
  getSettings(userId: number): Promise<Settings | undefined>;
  createOrUpdateSettings(settings: InsertSettings): Promise<Settings>;
  
  // Journal operations
  getJournalEntries(userId: number): Promise<JournalEntry[]>;
  getJournalEntriesByDate(userId: number, date: Date): Promise<JournalEntry[]>;
  getJournalEntryById(id: number): Promise<JournalEntry | undefined>;
  createJournalEntry(entry: InsertJournalEntry): Promise<JournalEntry>;
  updateJournalEntry(id: number, entry: Partial<InsertJournalEntry>): Promise<JournalEntry | undefined>;
  deleteJournalEntry(id: number): Promise<boolean>;

  // Subscriber operations
  getSubscribers(): Promise<Subscriber[]>;
  getSubscriberByEmail(email: string): Promise<Subscriber | undefined>;
  getSubscriberByToken(token: string): Promise<Subscriber | undefined>;
  createSubscriber(subscriber: InsertSubscriber): Promise<Subscriber>;
  updateSubscriber(id: number, subscriber: Partial<InsertSubscriber>): Promise<Subscriber | undefined>;
  verifySubscriber(token: string): Promise<Subscriber | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private instruments: Map<number, Instrument>;
  private trades: Map<number, Trade>;
  private settings: Map<number, Settings>;
  private journalEntries: Map<number, JournalEntry>;
  private subscribers: Map<number, Subscriber>;
  private userId: number;
  private instrumentId: number;
  private tradeId: number;
  private settingId: number;
  private journalEntryId: number;
  private subscriberId: number;

  constructor() {
    this.users = new Map();
    this.instruments = new Map();
    this.trades = new Map();
    this.settings = new Map();
    this.journalEntries = new Map();
    this.subscribers = new Map();
    this.userId = 1;
    this.instrumentId = 1;
    this.tradeId = 1;
    this.settingId = 1;
    this.journalEntryId = 1;
    this.subscriberId = 1;

    // Initialize with default instruments
    this.initializeInstruments();
  }

  // Initialize with common futures instruments
  private initializeInstruments() {
    const defaultInstruments: InsertInstrument[] = [
      {
        symbol: "ES",
        description: "E-mini S&P 500",
        tickSize: "0.25",
        tickValue: "12.50",
        pointValue: "50.00",
      },
      {
        symbol: "NQ",
        description: "E-mini NASDAQ-100",
        tickSize: "0.25",
        tickValue: "5.00",
        pointValue: "20.00",
      },
      {
        symbol: "CL",
        description: "Crude Oil",
        tickSize: "0.01",
        tickValue: "10.00",
        pointValue: "1000.00",
      },
      {
        symbol: "GC",
        description: "Gold",
        tickSize: "0.10",
        tickValue: "10.00",
        pointValue: "100.00",
      },
      {
        symbol: "YM",
        description: "E-mini Dow Jones",
        tickSize: "1.00",
        tickValue: "5.00",
        pointValue: "5.00",
      },
      // Micro instruments
      {
        symbol: "MES",
        description: "Micro E-mini S&P 500",
        tickSize: "0.25",
        tickValue: "1.25",
        pointValue: "5.00",
      },
      {
        symbol: "MNQ",
        description: "Micro E-mini NASDAQ-100",
        tickSize: "0.25",
        tickValue: "0.50",
        pointValue: "2.00",
      },
      {
        symbol: "MCL",
        description: "Micro WTI Crude Oil",
        tickSize: "0.01",
        tickValue: "0.10",
        pointValue: "10.00",
      },
      {
        symbol: "MGC",
        description: "Micro Gold",
        tickSize: "0.10",
        tickValue: "1.00", 
        pointValue: "10.00",
      },
      {
        symbol: "MYM",
        description: "Micro E-mini Dow Jones",
        tickSize: "1.00",
        tickValue: "0.50",
        pointValue: "0.50",
      },
    ];

    defaultInstruments.forEach(instrument => {
      this.createInstrument(instrument);
    });
  }

  // Calculate P&L for a trade
  private calculatePnL(trade: InsertTrade, instrument?: Instrument): { pnlPoints: string, pnlDollars: string } {
    // Default values if instrument not found
    const pointValue = instrument ? Number(instrument.pointValue) : 1;
    
    const entryPrice = Number(trade.entryPrice);
    const exitPrice = Number(trade.exitPrice);
    const quantity = Number(trade.quantity);
    let pnlPoints = 0;
    
    if (trade.tradeType === "long") {
      pnlPoints = exitPrice - entryPrice;
    } else {
      // For short trades, the P&L is reversed
      pnlPoints = entryPrice - exitPrice;
    }
    
    const pnlDollars = pnlPoints * pointValue * quantity;
    
    return {
      pnlPoints: pnlPoints.toFixed(2),
      pnlDollars: pnlDollars.toFixed(2),
    };
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Instrument operations
  async getInstruments(): Promise<Instrument[]> {
    return Array.from(this.instruments.values());
  }

  async getInstrumentBySymbol(symbol: string): Promise<Instrument | undefined> {
    return Array.from(this.instruments.values()).find(
      (instrument) => instrument.symbol === symbol,
    );
  }

  async createInstrument(insertInstrument: InsertInstrument): Promise<Instrument> {
    const id = this.instrumentId++;
    const instrument: Instrument = { ...insertInstrument, id };
    this.instruments.set(id, instrument);
    return instrument;
  }

  async updateInstrument(id: number, updateData: Partial<InsertInstrument>): Promise<Instrument | undefined> {
    const instrument = this.instruments.get(id);
    if (!instrument) return undefined;

    const updatedInstrument = { ...instrument, ...updateData };
    this.instruments.set(id, updatedInstrument);
    return updatedInstrument;
  }

  async deleteInstrument(id: number): Promise<boolean> {
    return this.instruments.delete(id);
  }

  // Trade operations
  async getTrades(userId: number): Promise<Trade[]> {
    return Array.from(this.trades.values())
      .filter(trade => trade.userId === userId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  async getTradeById(id: number): Promise<Trade | undefined> {
    return this.trades.get(id);
  }

  async createTrade(insertTrade: InsertTrade): Promise<Trade> {
    const id = this.tradeId++;
    
    // Get the instrument to calculate P&L
    const instrument = await this.getInstrumentBySymbol(insertTrade.symbol);
    const { pnlPoints, pnlDollars } = this.calculatePnL(insertTrade, instrument);
    
    const trade: Trade = { 
      ...insertTrade, 
      id, 
      pnlPoints, 
      pnlDollars,
      createdAt: new Date()
    };
    
    this.trades.set(id, trade);
    return trade;
  }

  async updateTrade(id: number, updateData: Partial<InsertTrade>): Promise<Trade | undefined> {
    const trade = this.trades.get(id);
    if (!trade) return undefined;

    // Create a merged trade object
    const mergedTrade: InsertTrade = {
      ...trade,
      ...updateData,
      // Ensure these required fields are present
      userId: updateData.userId || trade.userId,
      symbol: updateData.symbol || trade.symbol,
      tradeType: updateData.tradeType || trade.tradeType,
      quantity: updateData.quantity || trade.quantity,
      entryPrice: updateData.entryPrice || trade.entryPrice,
      exitPrice: updateData.exitPrice || trade.exitPrice,
      date: updateData.date || trade.date,
    };

    // Recalculate P&L if price data changed
    const instrument = await this.getInstrumentBySymbol(mergedTrade.symbol);
    const { pnlPoints, pnlDollars } = this.calculatePnL(mergedTrade, instrument);

    const updatedTrade: Trade = {
      ...trade,
      ...updateData,
      pnlPoints,
      pnlDollars,
    };

    this.trades.set(id, updatedTrade);
    return updatedTrade;
  }

  async deleteTrade(id: number): Promise<boolean> {
    return this.trades.delete(id);
  }

  // Settings operations
  async getSettings(userId: number): Promise<Settings | undefined> {
    return Array.from(this.settings.values()).find(
      (setting) => setting.userId === userId
    );
  }

  async createOrUpdateSettings(insertSettings: InsertSettings): Promise<Settings> {
    // Check if settings already exist for this user
    const existingSettings = await this.getSettings(insertSettings.userId);
    
    if (existingSettings) {
      // Update existing settings
      const updatedSettings: Settings = { ...existingSettings, ...insertSettings };
      this.settings.set(existingSettings.id, updatedSettings);
      return updatedSettings;
    } else {
      // Create new settings
      const id = this.settingId++;
      const settings: Settings = { ...insertSettings, id };
      this.settings.set(id, settings);
      return settings;
    }
  }

  // Journal entry operations
  async getJournalEntries(userId: number): Promise<JournalEntry[]> {
    return Array.from(this.journalEntries.values())
      .filter(entry => entry.userId === userId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  async getJournalEntriesByDate(userId: number, date: Date): Promise<JournalEntry[]> {
    // Format the date to YYYY-MM-DD to compare just the day, month, and year
    const targetDate = new Date(date);
    const targetDateString = targetDate.toISOString().split('T')[0];
    
    return Array.from(this.journalEntries.values())
      .filter(entry => {
        const entryDate = new Date(entry.date);
        const entryDateString = entryDate.toISOString().split('T')[0];
        return entry.userId === userId && entryDateString === targetDateString;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  async getJournalEntryById(id: number): Promise<JournalEntry | undefined> {
    return this.journalEntries.get(id);
  }

  async createJournalEntry(insertEntry: InsertJournalEntry): Promise<JournalEntry> {
    const id = this.journalEntryId++;
    const entry: JournalEntry = { 
      ...insertEntry, 
      id,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    this.journalEntries.set(id, entry);
    return entry;
  }

  async updateJournalEntry(id: number, updateData: Partial<InsertJournalEntry>): Promise<JournalEntry | undefined> {
    const entry = this.journalEntries.get(id);
    if (!entry) return undefined;

    const updatedEntry: JournalEntry = {
      ...entry,
      ...updateData,
      updatedAt: new Date()
    };

    this.journalEntries.set(id, updatedEntry);
    return updatedEntry;
  }

  async deleteJournalEntry(id: number): Promise<boolean> {
    return this.journalEntries.delete(id);
  }

  // Subscriber operations
  async getSubscribers(): Promise<Subscriber[]> {
    return Array.from(this.subscribers.values())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getSubscriberByEmail(email: string): Promise<Subscriber | undefined> {
    return Array.from(this.subscribers.values()).find(
      (subscriber) => subscriber.email === email
    );
  }
  
  async getSubscriberByToken(token: string): Promise<Subscriber | undefined> {
    return Array.from(this.subscribers.values()).find(
      (subscriber) => subscriber.verificationToken === token
    );
  }

  async createSubscriber(insertSubscriber: InsertSubscriber): Promise<Subscriber> {
    // Check if email already exists
    const existingSubscriber = await this.getSubscriberByEmail(insertSubscriber.email);
    if (existingSubscriber) {
      // Return existing subscriber if email already registered
      return existingSubscriber;
    }

    const id = this.subscriberId++;
    const subscriber: Subscriber = { 
      ...insertSubscriber, 
      id,
      status: insertSubscriber.status || 'pending', 
      createdAt: new Date(),
      verificationToken: null,
      verificationExpires: null,
      verifiedAt: null
    };
    
    this.subscribers.set(id, subscriber);
    return subscriber;
  }

  async updateSubscriber(id: number, updateData: Partial<InsertSubscriber> & {
    verificationToken?: string | null,
    verificationExpires?: Date | null,
    verifiedAt?: Date | null
  }): Promise<Subscriber | undefined> {
    const subscriber = this.subscribers.get(id);
    if (!subscriber) return undefined;

    const updatedSubscriber: Subscriber = {
      ...subscriber,
      ...updateData,
    };

    this.subscribers.set(id, updatedSubscriber);
    return updatedSubscriber;
  }
  
  async verifySubscriber(token: string): Promise<Subscriber | undefined> {
    const subscriber = await this.getSubscriberByToken(token);
    if (!subscriber) {
      return undefined;
    }
    
    // Check if token is expired
    if (subscriber.verificationExpires && new Date() > subscriber.verificationExpires) {
      return undefined;
    }
    
    const updatedSubscriber = await this.updateSubscriber(subscriber.id, {
      status: "active",
      verifiedAt: new Date(),
      verificationToken: null,
      verificationExpires: null
    });
    
    return updatedSubscriber;
  }
}

export const storage = new MemStorage();
