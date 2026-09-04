import { z } from "zod";

import { ERROR_CODES } from "@/lib/errors/error-codes";

export const apiErrorBodySchema = z.object({
  error: z.object({
    code: z.enum(ERROR_CODES),
    message: z.string().min(1),
  }),
});

export type ApiErrorBody = z.infer<typeof apiErrorBodySchema>;
