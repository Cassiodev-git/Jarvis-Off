import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

export interface DesktopApplication {
    readonly executable: string;
    readonly baseArgs: readonly string[];
}

export class DesktopApplicationResolver {
    public async resolve(appName: string): Promise<DesktopApplication | undefined> {
        const requested = this.normalize(appName);
        if (!requested) return undefined;

        for (const directory of this.applicationDirectories()) {
            let entries: string[];
            try {
                entries = await fs.readdir(directory);
            } catch {
                continue;
            }

            for (const entry of entries) {
                if (!entry.endsWith('.desktop')) continue;

                const desktopPath = path.join(directory, entry);
                const desktopFile = await this.readDesktopFile(desktopPath);
                if (!desktopFile || desktopFile.hidden || desktopFile.noDisplay) continue;

                const desktopId = entry.slice(0, -'.desktop'.length);
                const candidates = [desktopId, desktopFile.name, desktopFile.genericName]
                    .filter((value): value is string => Boolean(value))
                    .map((value) => this.normalize(value));

                if (candidates.some((candidate) => candidate === requested)) {
                    return { executable: 'gtk-launch', baseArgs: [desktopId] };
                }
            }
        }

        return undefined;
    }

    private applicationDirectories(): string[] {
        const dataHome = process.env.XDG_DATA_HOME || path.join(os.homedir(), '.local', 'share');
        return [
            path.join(dataHome, 'applications'),
            '/usr/local/share/applications',
            '/usr/share/applications',
            '/var/lib/flatpak/exports/share/applications',
        ];
    }

    private async readDesktopFile(filePath: string): Promise<{
        name?: string;
        genericName?: string;
        hidden: boolean;
        noDisplay: boolean;
    } | undefined> {
        try {
            const content = await fs.readFile(filePath, 'utf8');
            if (!/^\[Desktop Entry\]/mi.test(content)) return undefined;
            const value = (key: string): string | undefined => {
                const match = content.match(new RegExp(`^${key}(?:\[[^\]]+\])?=(.*)$`, 'mi'));
                return match?.[1]?.trim();
            };

            return {
                name: value('Name'),
                genericName: value('GenericName'),
                hidden: value('Hidden')?.toLowerCase() === 'true',
                noDisplay: value('NoDisplay')?.toLowerCase() === 'true',
            };
        } catch {
            return undefined;
        }
    }

    private normalize(value: string): string {
        return value
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/\.desktop$/, '')
            .replace(/[^a-z0-9]+/g, ' ')
            .trim();
    }
}
