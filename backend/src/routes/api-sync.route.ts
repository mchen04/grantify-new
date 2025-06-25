import express, { Request, Response } from 'express';
import { authMiddleware, requireAdmin } from '../middleware/auth.middleware';
import { ApiScheduler } from '../services/api-integrations/ApiScheduler';
import supabaseClient from '../db/supabaseClient';
import logger from '../utils/logger';

const router = express.Router();
const supabase = supabaseClient;

// Create a singleton instance to share with index.ts
export const apiScheduler = new ApiScheduler();

// Get all data sources
router.get('/data-sources', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('data_sources')
      .select('*')
      .order('display_name');

    if (error) throw error;

    res.json({
      success: true,
      data: data
    });
  } catch (error: any) {
    logger.error('Failed to fetch data sources', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get sync schedules
router.get('/schedules', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('api_sync_schedules')
      .select(`
        *,
        data_sources (
          name,
          display_name
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      data: data
    });
  } catch (error: any) {
    logger.error('Failed to fetch sync schedules', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get sync logs
router.get('/logs', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { limit = 50, offset = 0, data_source_id } = req.query;

    let query = supabase
      .from('api_sync_logs')
      .select(`
        *,
        data_sources (
          name,
          display_name
        )
      `)
      .order('started_at', { ascending: false })
      .limit(Number(limit))
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (data_source_id) {
      query = query.eq('data_source_id', data_source_id);
    }

    const { data, error } = await query;

    if (error) throw error;

    res.json({
      success: true,
      data: data
    });
  } catch (error: any) {
    logger.error('Failed to fetch sync logs', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get sync status
router.get('/status', authMiddleware, async (req: Request, res: Response) => {
  try {
    const schedulerStatus = apiScheduler.getStatus();
    
    // Get recent sync activity
    const { data: recentSyncs } = await supabase
      .from('api_sync_logs')
      .select('data_source_id, status, started_at')
      .order('started_at', { ascending: false })
      .limit(10);

    // Get data sources with last sync info
    const { data: dataSources } = await supabase
      .from('data_sources')
      .select('id, name, display_name, last_successful_sync, is_active');

    res.json({
      success: true,
      data: {
        scheduler: schedulerStatus,
        recentSyncs,
        dataSources
      }
    });
  } catch (error: any) {
    logger.error('Failed to fetch sync status', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Trigger manual sync (Admin only)
router.post('/trigger/:dataSourceName', authMiddleware, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { dataSourceName } = req.params;
    const { fullSync = false, filters = {} } = req.body;

    logger.info(`Admin triggered manual sync for ${dataSourceName}`, {
      userId: req.user.id,
      fullSync,
      filters
    });

    // Start sync asynchronously
    apiScheduler.manualSync(dataSourceName, {
      fullSync,
      filters
    }).then(result => {
      logger.info(`Manual sync completed for ${dataSourceName}`, result);
    }).catch(error => {
      logger.error(`Manual sync failed for ${dataSourceName}`, error);
    });

    res.json({
      success: true,
      message: `Sync started for ${dataSourceName}. Check logs for progress.`
    });
  } catch (error: any) {
    logger.error('Failed to trigger manual sync', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Update sync schedule (Admin only)
router.put('/schedules/:scheduleId', authMiddleware, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { scheduleId } = req.params;
    const updates = req.body;

    logger.info(`Admin updating sync schedule ${scheduleId}`, {
      userId: req.user.id,
      updates
    });

    const { data, error } = await supabase
      .from('api_sync_schedules')
      .update(updates)
      .eq('id', scheduleId)
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      data: data
    });
  } catch (error: any) {
    logger.error('Failed to update sync schedule', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Enable/disable data source (Admin only)
router.patch('/data-sources/:dataSourceId/toggle', authMiddleware, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { dataSourceId } = req.params;
    const { is_active } = req.body;

    logger.info(`Admin toggling data source ${dataSourceId}`, {
      userId: req.user.id,
      is_active
    });

    const { data, error } = await supabase
      .from('data_sources')
      .update({ is_active })
      .eq('id', dataSourceId)
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      data: data
    });
  } catch (error: any) {
    logger.error('Failed to toggle data source', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;