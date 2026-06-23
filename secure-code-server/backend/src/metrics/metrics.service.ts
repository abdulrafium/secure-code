import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);
  private readonly prometheusUrl = 'http://prometheus:9090/api/v1/query';

  constructor(private readonly httpService: HttpService) {}

  async getMetrics() {
    try {
      // Queries for host metrics
      const queries = {
        cpuUsage: '100 - (avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[15s])) * 100)',
        cpuCores: 'count(node_cpu_seconds_total{mode="system"})',
        ramUsage: '100 * (1 - ((node_memory_MemFree_bytes + node_memory_Cached_bytes + node_memory_Buffers_bytes) / node_memory_MemTotal_bytes))',
        totalRam: 'node_memory_MemTotal_bytes',
        networkTraffic: 'sum(rate(node_network_receive_bytes_total{device!~"lo|docker.*|veth.*|wg.*"}[15s])) + sum(rate(node_network_transmit_bytes_total{device!~"lo|docker.*|veth.*|wg.*"}[15s]))'
      };

      const results: any = {};

      for (const [key, query] of Object.entries(queries)) {
        try {
          const response = await firstValueFrom(
            this.httpService.get(this.prometheusUrl, { params: { query } })
          );
          
          if (response.data?.data?.result && response.data.data.result.length > 0) {
            results[key] = parseFloat(response.data.data.result[0].value[1]);
          } else {
            this.logger.warn(`Prometheus query ${key} returned empty results!`);
            results[key] = 0;
          }
        } catch (err: any) {
          this.logger.error(`Prometheus query ${key} failed: ${err.message}`);
          results[key] = 0;
        }
      }

      return {
        cpuUsage: results.cpuUsage || 0,
        cpuCores: results.cpuCores || 0,
        ramUsage: results.ramUsage || 0,
        totalRam: results.totalRam || 0,
        networkTraffic: results.networkTraffic || 0,
        responseTime: Math.floor(Math.random() * 50) + 20, // Simulated backend response time for demo purposes since Prometheus doesn't inherently measure application response time without custom metrics
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Failed to fetch metrics from Prometheus', error);
      return null;
    }
  }
}
