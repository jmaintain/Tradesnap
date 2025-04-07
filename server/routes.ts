import express, { type Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import path from "path";
import fs from "fs";
import { 
  insertTradeSchema, 
  insertInstrumentSchema, 
  insertSettingsSchema
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

  // Serve uploaded files
  app.use("/uploads", express.static(uploadDir));

  const httpServer = createServer(app);
  return httpServer;
}
