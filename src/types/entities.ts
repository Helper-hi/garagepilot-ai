import { z } from 'zod';

// Business entities
export const CustomerSchema = z.object({
  id: z.string().min(1),
  tenantId: z.string().min(1),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
  preferences: z.record(z.unknown()).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const VehicleSchema = z.object({
  id: z.string().min(1),
  tenantId: z.string().min(1),
  customerId: z.string().min(1),
  make: z.string().min(1),
  model: z.string().min(1),
  year: z.number().min(1900),
  licensePlate: z.string().optional(),
  vin: z.string().optional(),
  mileage: z.number().optional(),
  notes: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const AppointmentStatusSchema = z.enum([
  'SCHEDULED',
  'CONFIRMED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
  'NO_SHOW'
]);

export const AppointmentSchema = z.object({
  id: z.string().min(1),
  tenantId: z.string().min(1),
  customerId: z.string().min(1),
  vehicleId: z.string().min(1),
  scheduledAt: z.date(),
  duration: z.number().min(15), // minutes
  serviceType: z.string().min(1),
  description: z.string().optional(),
  status: AppointmentStatusSchema,
  assignedTo: z.string().optional(), // userId
  estimatedCost: z.number().optional(),
  actualCost: z.number().optional(),
  notes: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const ServiceSchema = z.object({
  id: z.string().min(1),
  tenantId: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  estimatedDuration: z.number().min(15), // minutes
  basePrice: z.number().min(0),
  category: z.string().min(1),
  isActive: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const WorkingHoursSchema = z.object({
  id: z.string().min(1),
  tenantId: z.string().min(1),
  dayOfWeek: z.number().min(0).max(6), // 0 = Sunday
  openTime: z.string().regex(/^\d{2}:\d{2}$/), // HH:MM
  closeTime: z.string().regex(/^\d{2}:\d{2}$/), // HH:MM
  isOpen: z.boolean(),
});

export type Customer = z.infer<typeof CustomerSchema>;
export type Vehicle = z.infer<typeof VehicleSchema>;
export type AppointmentStatus = z.infer<typeof AppointmentStatusSchema>;
export type Appointment = z.infer<typeof AppointmentSchema>;
export type Service = z.infer<typeof ServiceSchema>;
export type WorkingHours = z.infer<typeof WorkingHoursSchema>;
