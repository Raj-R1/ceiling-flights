import type { FlightProvider } from '../../../shared/provider';
import type { AircraftSnapshot, GeoPoint } from '../../../shared/types';

type PollCallbacks = {
  onData: (snapshot: AircraftSnapshot[]) => void;
  onError: (error: Error) => void;
  onSuccess: () => void;
};

export class FlightPoller {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private running = false;

  constructor(
    private readonly provider: FlightProvider,
    private readonly callbacks: PollCallbacks
  ) {}

  start(center: GeoPoint, radiusKm: number, pollMs: number): void {
    this.stop();
    this.running = true;

    // setTimeout chaining avoids overlap when provider response is slower than poll interval.
    const tick = async () => {
      if (!this.running) return;
      try {
        const snapshot = await this.provider.fetchSnapshot(center, radiusKm);
        this.callbacks.onData(snapshot);
        this.callbacks.onSuccess();
      } catch (error) {
        this.callbacks.onError(error instanceof Error ? error : new Error('Unknown provider error'));
      } finally {
        if (this.running) {
          this.timer = setTimeout(tick, pollMs);
        }
      }
    };

    void tick();
  }

  stop(): void {
    this.running = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}
