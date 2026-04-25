import { prisma } from "./db";

/**
 * Typed wrapper over the generic key-value Setting table.
 * Adding a new setting: extend the Defaults object below and it becomes
 * readable/writable immediately.
 */

const Defaults = {
  autoDial: "false" as "true" | "false",
} as const;

export type SettingKey = keyof typeof Defaults;

export async function getSetting<K extends SettingKey>(
  key: K,
): Promise<(typeof Defaults)[K]> {
  const row = await prisma.setting.findUnique({ where: { key } });
  return (row?.value as (typeof Defaults)[K]) ?? Defaults[key];
}

export async function setSetting(key: SettingKey, value: string) {
  await prisma.setting.upsert({
    where: { key },
    create: { key, value },
    update: { value },
  });
}

export async function getAllSettings() {
  const rows = await prisma.setting.findMany();
  const byKey: Record<string, string> = {};
  for (const r of rows) byKey[r.key] = r.value;
  return {
    autoDial: (byKey.autoDial as "true" | "false") ?? Defaults.autoDial,
  };
}

export async function isAutoDialOn() {
  return (await getSetting("autoDial")) === "true";
}
