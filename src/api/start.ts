#!/usr/bin/env bun
/**
 * Standalone entry point for the Dexter API server.
 * Usage: bun run src/api/start.ts [--port 3000]
 */

import 'dotenv/config';
import { startServer } from './server.js';

const port = parseInt(process.argv.find((_, i, arr) => arr[i - 1] === '--port') ?? '3000', 10);

startServer(port);
