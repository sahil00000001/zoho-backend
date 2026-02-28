/**
 * Vercel serverless entry point.
 * Vercel discovers this file via vercel.json and wraps it as a serverless function.
 */
import 'dotenv/config';
import app from '../src/app';

export default app;
