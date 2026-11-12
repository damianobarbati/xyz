import { z } from 'zod';

export const HealthRequestSchema = z.object({});

export type HealthRequest = z.infer<typeof HealthRequestSchema>;

export const HealthResponseSchema = z.boolean();

export type HealthResponse = z.infer<typeof HealthResponseSchema>;
