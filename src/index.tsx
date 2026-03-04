#!/usr/bin/env bun
import { config } from 'dotenv';

// Load environment variables
config({ quiet: true });

// Check for --serve or --api flag to start the API server
const isServe = process.argv.includes('--serve') || process.argv.includes('--api');

if (isServe) {
  const { startServer } = await import('./api/server.js');
  const port = Number(process.env.PORT) || 3000;
  startServer(port);
} else {
  const React = (await import('react')).default;
  const { render } = await import('ink');
  const { CLI } = await import('./cli.js');

  // Render the CLI app and wait for it to exit
  const { waitUntilExit } = render(<CLI />);
  await waitUntilExit();
}
