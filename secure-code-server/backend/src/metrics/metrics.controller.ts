import { Controller, Get, Sse, MessageEvent } from '@nestjs/common';
import { Observable, interval } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { MetricsService } from './metrics.service';

@Controller('system/metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Sse('stream')
  streamMetrics(): Observable<MessageEvent> {
    // Emit new metrics every 1000ms (1 second)
    return interval(1000).pipe(
      switchMap(async () => {
        const data = await this.metricsService.getMetrics();
        return {
          data: data || {},
        } as MessageEvent;
      }),
    );
  }
}
