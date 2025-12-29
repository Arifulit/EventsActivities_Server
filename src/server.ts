import app from './app';
import { config } from './config/env';
import { connectDB } from './db';

const startServer = async () => {
  try {
    await connectDB();
    
    app.listen(config.port, () => {
      console.log(`
╔════════════════════════════════════════════╗
║  🚀 Server is running                      ║
║  📍 Port: ${config.port}                           ║
║  🌍 Environment: ${config.nodeEnv}          ║
║  📡 API: http://localhost:${config.port}/api      ║
╚════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

process.on('unhandledRejection', (err: Error) => {
  console.error('Unhandled Rejection:', err);
  process.exit(1);
});

process.on('uncaughtException', (err: Error) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});