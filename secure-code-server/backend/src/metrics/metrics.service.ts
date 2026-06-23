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
        // CPU usage percentage: 100 - (idle_time_percentage)
        cpuUsage: '100 - (avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[2s])) * 100)',
        // Total CPU cores
        cpuCores: 'count(count(node_cpu_seconds_total) by (cpu))',
        // RAM usage percentage
        ramUsage: '100 * (1 - ((node_memory_MemFree_bytes + node_memory_Cached_bytes + node_memory_Buffers_bytes) / node_memory_MemTotal_bytes))',
        // Total RAM in bytes
        totalRam: 'node_memory_MemTotal_bytes',
        // Network traffic in bytes/s (receive + transmit on eth0 or en* interfaces)
        networkTraffic: 'sum(rate(node_network_receive_bytes_total{device!~"lo|docker.*|veth.*|wg.*"}[2s])) + sum(rate(node_network_transmit_bytes_total{device!~"lo|docker.*|veth.*|wg.*"}[2s]))'
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
            results[key] = 0;
          }
        } catch (err) {
          // Fallback if Prometheus query fails
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
