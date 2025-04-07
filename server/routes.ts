import express, { type Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import path from "path";
import fs from "fs";
import { 
  insertTradeSchema, 
  insertInstrumentSchema, 
  insertSettingsSchema,
  insertJournalEntrySchema,
  insertSubscriberSchema
} from "@shared/schema";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";

// Create uploads directory if it doesn't exist
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for file uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
  }),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 2 // Maximum of 2 files
  },
  fileFilter: function (req, file, cb) {
    const filetypes = /jpeg|jpg|png|gif/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error("Only images are allowed"));
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Error handling middleware
  const handleError = (err: any, res: Response) => {
    if (err instanceof ZodError) {
      return res.status(400).json({ 
        message: "Validation error", 
        errors: fromZodError(err).message 
      });
    }
    
    console.error(err);
    res.status(500).json({ message: err.message || "Internal server error" });
  };

  // Instruments endpoints
  app.get("/api/instruments", async (req: Request, res: Response) => {
    try {
      const instruments = await storage.getInstruments();
      res.json(instruments);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.get("/api/instruments/:symbol", async (req: Request, res: Response) => {
    try {
      const instrument = await storage.getInstrumentBySymbol(req.params.symbol);
      if (!instrument) {
        return res.status(404).json({ message: "Instrument not found" });
      }
      res.json(instrument);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.post("/api/instruments", async (req: Request, res: Response) => {
    try {
      const parsedData = insertInstrumentSchema.parse(req.body);
      const instrument = await storage.createInstrument(parsedData);
      res.status(201).json(instrument);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.put("/api/instruments/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID format" });
      }
      
      const parsedData = insertInstrumentSchema.partial().parse(req.body);
      const instrument = await storage.updateInstrument(id, parsedData);
      
      if (!instrument) {
        return res.status(404).json({ message: "Instrument not found" });
      }
      
      res.json(instrument);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.delete("/api/instruments/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID format" });
      }
      
      const success = await storage.deleteInstrument(id);
      if (!success) {
        return res.status(404).json({ message: "Instrument not found" });
      }
      
      res.status(204).end();
    } catch (err) {
      handleError(err, res);
    }
  });

  // Trades endpoints
  app.get("/api/trades", async (req: Request, res: Response) => {
    try {
      // For demo purposes, default to user ID 1
      const userId = 1;
      const trades = await storage.getTrades(userId);
      res.json(trades);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.get("/api/trades/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID format" });
      }
      
      const trade = await storage.getTradeById(id);
      if (!trade) {
        return res.status(404).json({ message: "Trade not found" });
      }
      
      res.json(trade);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.post("/api/trades", upload.array("screenshots", 2), async (req: Request, res: Response) => {
    try {
      // Extract uploaded file paths
      const files = req.files as Express.Multer.File[];
      const screenshotPaths = files ? files.map(file => `/uploads/${file.filename}`) : [];
      
      // Add screenshots paths to the request body
      req.body.screenshots = screenshotPaths;
      
      // Parse date string to Date object
      if (req.body.date) {
        req.body.date = new Date(req.body.date);
      }
      
      // Ensure numeric fields are properly formatted
      if (req.body.entryPrice) {
        req.body.entryPrice = req.body.entryPrice.toString();
      }
      if (req.body.exitPrice) {
        req.body.exitPrice = req.body.exitPrice.toString();
      }
      if (req.body.quantity) {
        req.body.quantity = parseInt(req.body.quantity);
      }
      
      // For demo purposes, default to user ID 1
      req.body.userId = 1;
      
      const parsedData = insertTradeSchema.parse(req.body);
      const trade = await storage.createTrade(parsedData);
      
      res.status(201).json(trade);
    } catch (err) {
      // Clean up uploaded files if validation fails
      const files = req.files as Express.Multer.File[];
      if (files) {
        files.forEach(file => {
          fs.unlinkSync(file.path);
        });
      }
      handleError(err, res);
    }
  });

  app.put("/api/trades/:id", upload.array("screenshots", 2), async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID format" });
      }
      
      // Extract uploaded file paths
      const files = req.files as Express.Multer.File[];
      
      // Handle existing screenshots if provided
      let existingScreenshots: string[] = [];
      if (req.body.existingScreenshots) {
        try {
          existingScreenshots = JSON.parse(req.body.existingScreenshots);
          delete req.body.existingScreenshots; // Remove from body as it's not part of the schema
        } catch (e) {
          console.error("Error parsing existingScreenshots:", e);
        }
      }
      
      // Add new screenshots if uploaded
      if (files && files.length > 0) {
        const newScreenshots = files.map(file => `/uploads/${file.filename}`);
        
        // Combine with existing screenshots if any
        if (existingScreenshots.length > 0) {
          req.body.screenshots = [...existingScreenshots, ...newScreenshots];
        } else {
          req.body.screenshots = newScreenshots;
        }
      } else if (existingScreenshots.length > 0) {
        // If no new files but we have existing screenshots to keep
        req.body.screenshots = existingScreenshots;
      }
      
      // Parse date string to Date object if provided
      if (req.body.date) {
        req.body.date = new Date(req.body.date);
      }
      
      // Ensure numeric fields are properly formatted
      if (req.body.entryPrice) {
        req.body.entryPrice = req.body.entryPrice.toString();
      }
      if (req.body.exitPrice) {
        req.body.exitPrice = req.body.exitPrice.toString();
      }
      if (req.body.quantity) {
        req.body.quantity = parseInt(req.body.quantity);
      }
      
      const parsedData = insertTradeSchema.partial().parse(req.body);
      const trade = await storage.updateTrade(id, parsedData);
      
      if (!trade) {
        return res.status(404).json({ message: "Trade not found" });
      }
      
      res.json(trade);
    } catch (err) {
      // Clean up uploaded files if validation fails
      const files = req.files as Express.Multer.File[];
      if (files) {
        files.forEach(file => {
          fs.unlinkSync(file.path);
        });
      }
      handleError(err, res);
    }
  });

  app.delete("/api/trades/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID format" });
      }
      
      const trade = await storage.getTradeById(id);
      if (!trade) {
        return res.status(404).json({ message: "Trade not found" });
      }
      
      // Remove screenshot files if they exist
      if (trade.screenshots && Array.isArray(trade.screenshots)) {
        trade.screenshots.forEach(screenshot => {
          const filePath = path.join(process.cwd(), screenshot);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        });
      }
      
      const success = await storage.deleteTrade(id);
      res.status(204).end();
    } catch (err) {
      handleError(err, res);
    }
  });

  // Settings endpoints
  app.get("/api/settings", async (req: Request, res: Response) => {
    try {
      // For demo purposes, default to user ID 1
      const userId = 1;
      const userSettings = await storage.getSettings(userId);
      
      if (!userSettings) {
        // Return default settings if none exist
        return res.json({
          userId,
          defaultInstrument: "ES",
          theme: "light"
        });
      }
      
      res.json(userSettings);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.post("/api/settings", async (req: Request, res: Response) => {
    try {
      // For demo purposes, default to user ID 1
      req.body.userId = 1;
      
      const parsedData = insertSettingsSchema.parse(req.body);
      const settings = await storage.createOrUpdateSettings(parsedData);
      
      res.status(201).json(settings);
    } catch (err) {
      handleError(err, res);
    }
  });

  // Journal entry endpoints
  app.get("/api/journal", async (req: Request, res: Response) => {
    try {
      // For demo purposes, default to user ID 1
      const userId = 1;
      const entries = await storage.getJournalEntries(userId);
      res.json(entries);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.get("/api/journal/date/:date", async (req: Request, res: Response) => {
    try {
      // For demo purposes, default to user ID 1
      const userId = 1;
      const date = new Date(req.params.date);
      
      if (isNaN(date.getTime())) {
        return res.status(400).json({ message: "Invalid date format" });
      }
      
      const entries = await storage.getJournalEntriesByDate(userId, date);
      res.json(entries);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.get("/api/journal/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID format" });
      }
      
      const entry = await storage.getJournalEntryById(id);
      if (!entry) {
        return res.status(404).json({ message: "Journal entry not found" });
      }
      
      res.json(entry);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.post("/api/journal", async (req: Request, res: Response) => {
    try {
      // For demo purposes, default to user ID 1
      req.body.userId = 1;
      
      // Parse date string to Date object if provided
      if (req.body.date) {
        req.body.date = new Date(req.body.date);
      } else {
        req.body.date = new Date();
      }
      
      const parsedData = insertJournalEntrySchema.parse(req.body);
      const entry = await storage.createJournalEntry(parsedData);
      
      res.status(201).json(entry);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.put("/api/journal/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID format" });
      }
      
      // Parse date string to Date object if provided
      if (req.body.date) {
        req.body.date = new Date(req.body.date);
      }
      
      const parsedData = insertJournalEntrySchema.partial().parse(req.body);
      const entry = await storage.updateJournalEntry(id, parsedData);
      
      if (!entry) {
        return res.status(404).json({ message: "Journal entry not found" });
      }
      
      res.json(entry);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.delete("/api/journal/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID format" });
      }
      
      const entry = await storage.getJournalEntryById(id);
      if (!entry) {
        return res.status(404).json({ message: "Journal entry not found" });
      }
      
      const success = await storage.deleteJournalEntry(id);
      res.status(204).end();
    } catch (err) {
      handleError(err, res);
    }
  });

  // Subscriber endpoints
  app.get("/api/subscribers", async (req: Request, res: Response) => {
    try {
      const subscribers = await storage.getSubscribers();
      res.json(subscribers);
    } catch (err) {
      handleError(err, res);
    }
  });

  // Check if email is verified
  app.get("/api/verify-status", async (req: Request, res: Response) => {
    try {
      const { email } = req.query;
      
      if (!email || typeof email !== 'string') {
        return res.status(400).json({ 
          verified: false, 
          message: "Email parameter is required" 
        });
      }
      
      const subscriber = await storage.getSubscriberByEmail(email);
      
      if (!subscriber) {
        return res.status(200).json({ 
          verified: false, 
          message: "Email not registered" 
        });
      }
      
      return res.status(200).json({
        verified: subscriber.status === 'active',
        status: subscriber.status,
        message: subscriber.status === 'active' 
          ? "Email verified" 
          : "Email not verified"
      });
    } catch (err) {
      handleError(err, res);
    }
  });
  
  app.post("/api/subscribe", async (req: Request, res: Response) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }
      
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: "Invalid email format" });
      }
      
      // Check if email already exists and is verified
      const existingSubscriber = await storage.getSubscriberByEmail(email);
      if (existingSubscriber && existingSubscriber.status === "active") {
        return res.status(200).json({
          email: existingSubscriber.email,
          status: existingSubscriber.status,
          message: "Email already verified"
        });
      }
      
      // Import email utilities
      const { generateVerificationToken, calculateTokenExpiry, sendVerificationEmail } = await import('./utils/email');
      
      // Generate verification token and expiry
      const verificationToken = generateVerificationToken();
      const verificationExpires = calculateTokenExpiry(24); // 24 hours
      
      // Create or update subscriber with pending status
      let subscriber;
      if (existingSubscriber) {
        subscriber = await storage.updateSubscriber(existingSubscriber.id, {
          status: "pending",
          verificationToken,
          verificationExpires
        });
      } else {
        subscriber = await storage.createSubscriber({
          email,
          status: "pending",
        });
        
        // Update with verification token if subscriber was created successfully
        if (subscriber) {
          subscriber = await storage.updateSubscriber(subscriber.id, {
            verificationToken,
            verificationExpires
          });
        }
      }
      
      // Safety check - ensure subscriber exists before proceeding
      if (!subscriber) {
        return res.status(500).json({ error: "Failed to create or update subscriber" });
      }
      
      // Send verification email
      const emailSent = await sendVerificationEmail(email, verificationToken);
      
      if (!emailSent) {
        return res.status(500).json({ error: "Failed to send verification email" });
      }
      
      return res.status(201).json({
        email: subscriber.email,
        status: subscriber.status,
        message: "Verification email sent. Please check your inbox."
      });
    } catch (err) {
      return handleError(err, res);
    }
  });
  
  // Email verification endpoint
  app.get("/verify/:token", async (req: Request, res: Response) => {
    try {
      const { token } = req.params;
      
      if (!token) {
        return res.status(400).send(`
          <html>
            <head>
              <title>Verification Failed</title>
              <style>
                body { font-family: Arial, sans-serif; text-align: center; margin-top: 50px; }
                .error { color: #d32f2f; }
              </style>
            </head>
            <body>
              <h1 class="error">Verification Failed</h1>
              <p>Invalid verification link. Please try again.</p>
              <a href="/landing">Return to homepage</a>
            </body>
          </html>
        `);
      }
      
      const subscriber = await storage.verifySubscriber(token);
      
      if (!subscriber) {
        return res.status(400).send(`
          <html>
            <head>
              <title>Verification Failed</title>
              <style>
                body { font-family: Arial, sans-serif; text-align: center; margin-top: 50px; }
                .error { color: #d32f2f; }
              </style>
            </head>
            <body>
              <h1 class="error">Verification Failed</h1>
              <p>The verification link is invalid or has expired.</p>
              <a href="/landing">Return to homepage</a>
            </body>
          </html>
        `);
      }
      
      return res.status(200).send(`
        <html>
          <head>
            <title>Email Verified</title>
            <style>
              body { font-family: Arial, sans-serif; text-align: center; margin-top: 50px; }
              .success { color: #388e3c; }
              .btn { 
                background-color: #0066cc; 
                color: white; 
                padding: 10px 20px; 
                text-decoration: none; 
                border-radius: 4px; 
                display: inline-block;
                margin-top: 20px;
              }
              .loader {
                border: 5px solid #f3f3f3;
                border-top: 5px solid #0066cc;
                border-radius: 50%;
                width: 40px;
                height: 40px;
                animation: spin 1s linear infinite;
                margin: 20px auto;
              }
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            </style>
            <script>
              // Store the verified email in localStorage
              localStorage.setItem('userEmail', '${subscriber.email}');
              
              // Redirect to app after a short delay
              setTimeout(function() {
                window.location.href = '/';
              }, 2000);
            </script>
          </head>
          <body>
            <h1 class="success">Email Verified Successfully!</h1>
            <p>Thank you for verifying your email address.</p>
            <p>You can now access TradeSnap with all features.</p>
            <div class="loader"></div>
            <p>Redirecting to application...</p>
          </body>
        </html>
      `);
    } catch (err) {
      console.error('Verification error:', err);
      return res.status(500).send(`
        <html>
          <head>
            <title>Verification Error</title>
            <style>
              body { font-family: Arial, sans-serif; text-align: center; margin-top: 50px; }
              .error { color: #d32f2f; }
            </style>
          </head>
          <body>
            <h1 class="error">Verification Failed</h1>
            <p>An error occurred during verification. Please try again.</p>
            <a href="/landing">Return to homepage</a>
          </body>
        </html>
      `);
    }
  });
  
  // Serve uploaded files
  app.use("/uploads", express.static(uploadDir));

  const httpServer = createServer(app);
  return httpServer;
}
