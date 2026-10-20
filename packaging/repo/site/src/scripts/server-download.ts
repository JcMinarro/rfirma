interface Feed {
  platforms?: Record<string, { url?: string }>;
}

const DOWNLOADS = {
  windows: { platform: "windows-x86_64", file: (update: string) => update },
  // `just bundle` da a la actualización el nombre del .dmg.
  macos: {
    platform: "darwin-aarch64",
    file: (update: string) => update.replace(/\.app\.tar\.gz$/, ".dmg"),
  },
} as const;

export type DownloadSystem = keyof typeof DOWNLOADS;

/** El paquete que el servidor anuncia en su feed; `undefined` si no está en el propio servidor. */
export function packageUrl(feed: Feed, system: DownloadSystem, origin: string): string | undefined {
  const { platform, file } = DOWNLOADS[system];
  const update = feed.platforms?.[platform]?.url;
  if (!update?.startsWith(`${origin}/${system}/`)) {
    return undefined;
  }
  return file(update);
}

/** Apunta el enlace al paquete que anuncia el servidor; si no lo consigue, se queda en la Release. */
export async function mountServerDownload(
  link: HTMLAnchorElement,
  system: DownloadSystem,
): Promise<void> {
  try {
    const response = await fetch(`/${system}/latest.json`);
    if (!response.ok) {
      return;
    }
    const url = packageUrl((await response.json()) as Feed, system, location.origin);
    if (url) {
      link.href = url;
    }
  } catch {
    // Sin el feed el enlace conserva su destino: la última Release.
  }
}
