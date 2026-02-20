import { Request, Response } from 'express';
import mongoose from 'mongoose';
import User from '../models/User';
import HabitEntry from '../models/HabitEntry';
import HabitCategory from '../models/HabitCategory';
import SyncData from '../models/SyncData';

// ─── Types ───────────────────────────────────────────────────────

type CheckStatus = 'ok' | 'error';

interface CheckResult {
  status: CheckStatus;
  responseTimeMs?: number;
  message?: string;
}

interface HealthResponse {
  status: CheckStatus;
  timestamp: string;
  uptime: number;
  environment: string;
  version: string;
  checks: Record<string, CheckResult>;
  memory: {
    heapUsedMB: number;
    heapTotalMB: number;
    rssMB: number;
  };
}

// ─── Helpers ─────────────────────────────────────────────────────

const READY_STATE_MAP: Record<number, string> = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting',
};

/** Run a single async check and capture timing + errors. */
const runCheck = async (fn: () => Promise<void>): Promise<CheckResult> => {
  const start = Date.now();
  try {
    await fn();
    return { status: 'ok', responseTimeMs: Date.now() - start };
  } catch (error: any) {
    return {
      status: 'error',
      responseTimeMs: Date.now() - start,
      message: error.message ?? 'Unknown error',
    };
  }
};

// ─── Controller ──────────────────────────────────────────────────

// @desc    Comprehensive health check
// @route   GET /api/health
// @access  Public
export const getHealth = async (_req: Request, res: Response): Promise<void> => {
  const checks: Record<string, CheckResult> = {};

  // 1️⃣  MongoDB connection state
  const readyState = mongoose.connection.readyState;
  checks['mongo:connection'] = {
    status: readyState === 1 ? 'ok' : 'error',
    message: READY_STATE_MAP[readyState] ?? `unknown (${readyState})`,
  };

  // 2️⃣  MongoDB ping (round-trip)
  checks['mongo:ping'] = await runCheck(async () => {
    const admin = mongoose.connection.db!.admin();
    await admin.ping();
  });

  // 3️⃣  Collection-level read probes (countDocuments is lightweight)
  checks['collection:users'] = await runCheck(async () => {
    await User.countDocuments();
  });

  checks['collection:habitEntries'] = await runCheck(async () => {
    await HabitEntry.countDocuments();
  });

  checks['collection:habitCategories'] = await runCheck(async () => {
    await HabitCategory.countDocuments();
  });

  checks['collection:syncData'] = await runCheck(async () => {
    await SyncData.countDocuments();
  });

  // ─── Aggregate status ─────────────────────────────────────────
  const overallStatus: CheckStatus = Object.values(checks).every(
    (c) => c.status === 'ok'
  )
    ? 'ok'
    : 'error';

  // ─── Memory snapshot ──────────────────────────────────────────
  const mem = process.memoryUsage();
  const toMB = (bytes: number) => Math.round((bytes / 1024 / 1024) * 100) / 100;

  const body: HealthResponse = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptime: Math.round(process.uptime()),
    environment: process.env.NODE_ENV ?? 'development',
    version: process.env.npm_package_version ?? '1.0.0',
    checks,
    memory: {
      heapUsedMB: toMB(mem.heapUsed),
      heapTotalMB: toMB(mem.heapTotal),
      rssMB: toMB(mem.rss),
    },
  };

  const httpStatus = overallStatus === 'ok' ? 200 : 503;
  res.status(httpStatus).json(body);
};
