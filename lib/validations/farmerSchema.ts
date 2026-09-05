import { z } from "zod";

export const PROGRAMMES = [
  "Maize Seed & Fertilizer",
  "Rice Value Chain",
  "Poultry & Livestock",
  "Agroforestry & Tree Planting",
  "Soil Health & Composting",
] as const;

// Nigerian phone numbers: 070, 080, 081, 090, 091, 071, or +234 followed by 10 digits
const nigerianPhoneRegex = /^(?:(?:\+?234)|0)[789][01]\d{8}$/;

export const farmerFormSchema = z.object({
  fullName: z
    .string()
    .min(3, "Full name must be at least 3 characters")
    .max(100, "Full name cannot exceed 100 characters")
    .regex(/^[a-zA-Z\s.'-]+$/, "Full name contains invalid characters"),
  phoneNumber: z
    .string()
    .min(10, "Phone number is too short")
    .max(15, "Phone number is too long")
    .regex(
      nigerianPhoneRegex,
      "Please enter a valid Nigerian phone number (e.g., 08012345678 or +2348012345678)"
    ),
  stateCode: z.string().min(1, "Please select a state"),
  stateName: z.string().min(1, "State name is required"),
  lgaId: z.string().optional(),
  lgaName: z.string().min(1, "Please select or specify an LGA"),
  village: z
    .string()
    .min(2, "Village / Polling unit name must be at least 2 characters")
    .max(120, "Village name cannot exceed 120 characters"),
  pollingUnitCode: z.string().optional(),
  programme: z.enum(PROGRAMMES, {
    errorMap: () => ({ message: "Please select an agricultural programme" }),
  }),
});

export type FarmerFormData = z.infer<typeof farmerFormSchema>;
