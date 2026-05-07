import { z } from "zod";

const phoneRegex = /^[0-9]{8}$/;

export const AVATAR_COUNT = 8;

export const RegisterSchema = z.object({
  lastName: z.string().trim().min(1, "Овог хоосон байна").max(60),
  firstName: z.string().trim().min(1, "Нэр хоосон байна").max(60),
  phone: z.string().regex(phoneRegex, "Утас 8 оронтой тоо байх ёстой"),
  password: z.string().min(6, "Нууц үг 6+ тэмдэгт").max(128),
  avatarId: z.number().int().min(0).max(AVATAR_COUNT - 1),
});
export type RegisterInput = z.infer<typeof RegisterSchema>;

export const LoginSchema = z.object({
  phone: z.string().regex(phoneRegex, "Утас 8 оронтой тоо байх ёстой"),
  password: z.string().min(1, "Нууц үг шаардлагатай"),
});
export type LoginInput = z.infer<typeof LoginSchema>;

const objectIdHex = z.string().regex(/^[0-9a-fA-F]{24}$/, "Алдаатай ID");

export const BEST_OF_VALUES = [1, 3, 5, 7] as const;
export const BestOfSchema = z.union([
  z.literal(1),
  z.literal(3),
  z.literal(5),
  z.literal(7),
]);

export const DRAFT_TYPES = ["snake", "linear", "random"] as const;
export const DraftTypeSchema = z.enum(DRAFT_TYPES);

export const ConfigureDraftSchema = z.object({
  startAt: z.string().datetime(),
  pickWindowSeconds: z.number().int().min(5).max(300).default(60),
  totalCapMinutes: z.number().int().min(1).max(180).default(60),
  teamSize: z.number().int().min(2).max(10).default(5),
  bestOf: BestOfSchema.default(1),
  draftType: DraftTypeSchema.default("snake"),
  captainOrder: z.array(objectIdHex).min(2).max(8),
  teamNames: z.record(objectIdHex, z.string().trim().max(40)).optional(),
});
export type ConfigureDraftInput = z.infer<typeof ConfigureDraftSchema>;

export const PickSchema = z.object({
  playerId: objectIdHex,
});
export type PickInput = z.infer<typeof PickSchema>;

export const FinalizeMatchSchema = z.object({
  ranks: z.record(
    objectIdHex,
    z.number().int().min(1).max(8),
  ),
});
export type FinalizeMatchInput = z.infer<typeof FinalizeMatchSchema>;
