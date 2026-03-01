import type { AircraftSnapshot, AppSettings, ConnectionState } from '../../../shared/types';

export interface SceneController {
  ingest(snapshot: AircraftSnapshot[]): void;
  tick(nowMs: number): void;
  draw(ctx: CanvasRenderingContext2D, nowMs: number): void;
  setViewport(width: number, height: number): void;
  setSettings(settings: AppSettings): void;
  setConnectionState(state: ConnectionState): void;
}
