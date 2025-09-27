import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import "./alert-generator"; // Initialize alert generation system

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// Environment variable validation for production deployment
function validateEnvironment() {
  const requiredEnvVars = ['DATABASE_URL'];
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error('Missing required environment variables:', missingVars.join(', '));
    console.error('Please ensure all required environment variables are set before starting the server.');
    process.exit(1);
  }
  
  // Production-specific validation
  if (process.env.NODE_ENV === 'production' || process.env.REPLIT_DEPLOYMENT === '1') {
    console.log('Production environment detected, validating configuration...');
    
    // Ensure PORT is properly set for autoscale deployment
    const port = process.env.PORT;
    if (!port || isNaN(parseInt(port))) {
      console.error('PORT environment variable must be set to a valid number in production');
      process.exit(1);
    }
    
    console.log('Environment validation passed');
  }
}

// Graceful startup with proper error handling
(async () => {
  try {
    // Validate environment before starting
    validateEnvironment();
    
    console.log('Starting server initialization...');
    
    // Register routes and setup server
    const server = await registerRoutes(app);
    console.log('Routes registered successfully');

    // Global error handler for express
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      
      console.error('Express error:', err);
      res.status(status).json({ message });
    });

    // Setup development or production environment
    if (app.get("env") === "development" && process.env.REPLIT_DEPLOYMENT !== '1') {
      console.log('Setting up development environment with Vite...');
      await setupVite(app, server);
    } else {
      console.log('Setting up production environment...');
      serveStatic(app);
    }

    // Configure server for production deployment
    const port = parseInt(process.env.PORT || '5000', 10);
    
    // Production-ready server configuration
    server.listen({
      port,
      host: "0.0.0.0", // Required for autoscale deployment accessibility
      reusePort: true,
    }, () => {
      console.log(`✅ Server successfully started on port ${port}`);
      console.log(`🌐 Server is accessible at http://0.0.0.0:${port}`);
      
      if (process.env.REPLIT_DEPLOYMENT === '1') {
        console.log('🚀 Production deployment detected - server ready for autoscaling');
      }
    });

    // Graceful shutdown handling
    process.on('SIGTERM', () => {
      console.log('SIGTERM received, shutting down gracefully...');
      server.close(() => {
        console.log('Server closed');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      console.log('SIGINT received, shutting down gracefully...');
      server.close(() => {
        console.log('Server closed');
        process.exit(0);
      });
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    console.error('Server initialization failed. Check the error above and ensure all dependencies are available.');
    process.exit(1);
  }
})();
