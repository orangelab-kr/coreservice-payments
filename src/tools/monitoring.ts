import axios from 'axios';
import { logger } from './logger';

export async function reportMonitoringMetrics(
  monitorId: string,
  metricsData: any
): Promise<void> {
  try {
    await axios({
      method: 'POST',
      baseURL: String(process.env.HIKICK_CORESERVICE_MONITORING_URL),
      url: `/monitors/${monitorId}/metrics`,
      data: metricsData,
      headers: {
        Authorization: `Bearer ${process.env.HIKICK_CORESERVICE_MONITORING_KEY}`,
      },
    });
  } catch (err: any) {
    const metricsJson = JSON.stringify(metricsData);
    logger.error(
      `Monitoring / Cannot sent monitoring metrics data. (${monitorId}, ${metricsJson})`
    );
  }
}
