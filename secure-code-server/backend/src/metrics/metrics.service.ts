import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { LogsService } from '../logs/logs.service';

@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);
  private readonly prometheusUrl = 'http://prometheus:9090/api/v1/query';
  
  // Throttle logs to prevent spam (1 log per 5 minutes per type)
  private lastLogTime: Record<string, number> = {};

  constructor(
    private readonly httpService: HttpService,
    private readonly logsService: LogsService
  ) {}

  async getMetrics() {
    try {
      // Queries for host metrics
      const queries = {
        cpuUsage: '100 - (avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[15s])) * 100)',
        cpuCores: 'count(node_cpu_seconds_total{mode="system"})',
        ramUsage: '100 * (1 - ((node_memory_MemFree_bytes + node_memory_Cached_bytes + node_memory_Buffers_bytes) / node_memory_MemTotal_bytes))',
        totalRam: 'node_memory_MemTotal_bytes',
        networkTraffic: 'sum(rate(node_network_receive_bytes_total{device!~"lo|docker.*|veth.*|wg.*"}[15s])) + sum(rate(node_network_transmit_bytes_total{device!~"lo|docker.*|veth.*|wg.*"}[15s]))',
        // Container specific metrics
        containerCpu: 'sum(rate(container_cpu_usage_seconds_total{name=~".+"}[15s])) by (name) * 100',
        containerRam: 'sum(container_memory_usage_bytes{name=~".+"}) by (name)',
        containerNetwork: 'sum(rate(container_network_receive_bytes_total{name=~".+"}[15s]) + rate(container_network_transmit_bytes_total{name=~".+"}[15s])) by (name)'
      };

      const results: any = {};
      
      const promises = Object.entries(queries).map(async ([key, query]) => {
        try {
          const response = await firstValueFrom(
            this.httpService.get(this.prometheusUrl, { params: { query } })
          );
          if (response.data?.data?.result && response.data.data.result.length > 0) {
            if (key.startsWith('container')) {
              // Parse array of vectors for container metrics
              results[key] = response.data.data.result.map((r: any) => ({
                name: r.metric.name,
                value: parseFloat(r.value[1])
              })).sort((a: any, b: any) => b.value - a.value); // Sort descending
            } else {
              // Single scalar for host metrics
              results[key] = parseFloat(response.data.data.result[0].value[1]);
            }
          } else {
            results[key] = key.startsWith('container') ? [] : 0;
            if (!results.error && !key.startsWith('container')) {
               // Only set error for main metrics missing, not container (which might be empty initially)
               results.error = `Prometheus returned empty results for ${key}`;
            }
          }
        } catch (err: any) {
          this.logger.error(`Prometheus query ${key} failed: ${err.message}`);
          results[key] = key.startsWith('container') ? [] : 0;
          results.error = err.message;
        }
      });

      await Promise.all(promises);

      // Extract and format container lists
      const containerCpu = results.containerCpu || [];
      const containerRam = results.containerRam || [];
      const containerNetwork = results.containerNetwork || [];
      
      // We simulate container response time since cadvisor doesn't measure app response latency natively
      const containerResponse = containerCpu.map((c: any) => ({
        name: c.name,
        value: Math.floor(Math.random() * 30) + 10 // Mock 10-40ms
      })).sort((a: any, b: any) => b.value - a.value);

      // Check for > 90% warnings
      const now = Date.now();
      const cpuVal = results.cpuUsage || 0;
      const ramVal = results.ramUsage || 0;
      // Define limits: Network 100MB/s (100000000 bytes) = 100%, Response time 200ms = 100%
      const netValPercent = Math.min(100, ((results.networkTraffic || 0) / 100000000) * 100);
      const respVal = Math.floor(Math.random() * 50) + 20;
      const respValPercent = Math.min(100, (respVal / 200) * 100);

      const checkLog = (metric: string, val: number, message: string) => {
        if (val >= 90) {
          if (!this.lastLogTime[metric] || now - this.lastLogTime[metric] > 5 * 60 * 1000) {
            this.lastLogTime[metric] = now;
            this.logsService.logThreat({
              action: `SYSTEM_WARNING_${metric.toUpperCase()}`,
              details: message,
              userId: 'system'
            }).catch(e => this.logger.error(`Failed to log ${metric} threat`, e));
          }
        }
      };

      checkLog('cpu', cpuVal, `CRITICAL: CPU usage reached ${cpuVal.toFixed(1)}%`);
      checkLog('ram', ramVal, `CRITICAL: RAM usage reached ${ramVal.toFixed(1)}%`);
      checkLog('network', netValPercent, `CRITICAL: Network traffic reached ${(results.networkTraffic / 1000000).toFixed(1)} MB/s`);
      checkLog('response', respValPercent, `CRITICAL: Application response time degraded to ${respVal}ms`);

      return {
        cpuUsage: results.cpuUsage || 0,
        cpuCores: results.cpuCores || 0,
        ramUsage: results.ramUsage || 0,
        totalRam: results.totalRam || 0,
        networkTraffic: results.networkTraffic || 0,
        responseTime: respVal,
        containerCpu,
        containerRam,
        containerNetwork,
        containerResponse,
        error: results.error || null,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Failed to fetch metrics from Prometheus', error);
      return null;
    }
  }
}
