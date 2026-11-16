import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { createApiApp } from './server/createApp.js';
import { runAutomatedPipelineTick } from './server/dailyEngine.js';

const app = createApiApp();

// Background Automated Pipeline Ticker for long-running Node server (checks every 15s + on boot)
runAutomatedPipelineTick(false, true).catch((err) => console.error('[DailyEngine Boot Tick Error]:', err));
setInterval(() => {
  runAutomatedPipelineTick(false, true).catch((err) => console.error('[DailyEngine Interval Tick Error]:', err));
}, 15000);

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  app.use('/assets', express.static(path.resolve('public/assets')));
  app.use(express.static(path.resolve('public')));

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);

    app.use('*', async (req, res, next) => {
      const url = req.originalUrl;
      try {
        let template = fs.readFileSync(path.resolve('index.html'), 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        next(e);
      }
    });
  } else {
    const distPath = path.resolve('dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  const portToListen = isProd && process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  app.listen(portToListen, '0.0.0.0', () => {
    console.log(`ScorePulse xG server listening on port ${portToListen} (${isProd ? 'production' : 'development'})`);
  });
}

startServer();
