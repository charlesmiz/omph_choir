import express from 'express';
import { createServer as createViteServer } from 'vite';
import fs from 'fs';
import path from 'path';

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '10mb' }));

  const DATA_FILE = path.resolve(process.cwd(), 'church_storage.json');

  const readData = () => {
    try {
      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (e) {
      console.error('Failed to read church_storage.json:', e);
    }
    return null;
  };

  const writeData = (data: any) => {
    try {
      if (!data || typeof data !== 'object' || !data.settings) {
        console.warn('Rejected empty or invalid church-data payload');
        return false;
      }
      // Keep safety backup of previous valid state
      if (fs.existsSync(DATA_FILE)) {
        try {
          fs.copyFileSync(DATA_FILE, path.resolve(process.cwd(), 'church_storage.bak.json'));
        } catch {}
      }
      fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
      return true;
    } catch (e) {
      console.error('Failed to write church_storage.json:', e);
      return false;
    }
  };

  // API endpoints for multi-browser / multi-device synchronization
  app.get('/api/church-data', (req, res) => {
    const data = readData();
    res.json({ success: true, data });
  });

  app.post('/api/church-data', (req, res) => {
    const success = writeData(req.body);
    res.json({ success, savedAt: new Date().toISOString() });
  });

  // Development: Vite middleware; Production: static dist
  const isProduction = process.env.NODE_ENV === 'production';
  const distExists = fs.existsSync(path.resolve(process.cwd(), 'dist/index.html'));

  if (isProduction && distExists) {
    app.use(express.static(path.resolve(process.cwd(), 'dist')));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) return next();
      res.sendFile(path.resolve(process.cwd(), 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
