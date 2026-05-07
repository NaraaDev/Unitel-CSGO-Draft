import { z } from "zod";

const phoneRegex = /^[0-9]{8}$/;

export const RegisterSchema = z.object({
  lastName: z.string().trim().min(1, "Овог хоосон байна").max(60),
  firstName: z.string().trim().min(1, "Нэр хоосон байна").max(60),
  phone: z.string().regex(phoneRegex, "Утас 8 оронтой тоо байх ёстой"),
  password: z.string().min(6, "Нууц үг 6+ тэмдэгт").max(128),
});
export type RegisterInput = z.infer<typeof RegisterSchema>;

export const LoginSchema = z.object({
  phone: z.string().regex(phoneRegex, "Утас 8 оронтой тоо байх ёстой"),
  password: z.string().min(1, "Нууц үг шаардлагатай"),
});
export type LoginInput = z.infer<typeof LoginSchema>;

const objectIdHex = z.string().regex(/^[0-9a-fA-F]{24}$/, "Алдаатай ID");

export const ConfigureDraftSchema = z.object({
  startAt: z.string().datetime(),
  pickWindowSeconds: z.number().int().min(5).max(300).default(60),
  totalCapMinutes: z.number().int().min(1).max(180).default(60),
  teamSize: z.number().int().min(2).max(10).default(5),
  captainOrder: z.array(objectIdHex).min(2).max(8),
});
export type ConfigureDraftInput = z.infer<typeof ConfigureDraftSchema>;

export const PickSchema = z.object({
  playerId: objectIdHex,
});
export type PickInput = z.infer<typeof PickSchema>;
