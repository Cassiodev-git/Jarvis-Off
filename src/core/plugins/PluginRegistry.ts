import { JarvisPlugin, JarvisPluginContext } from './JarvisPlugin.js';

export class PluginRegistry {
    private readonly plugins = new Map<string, JarvisPlugin>();

    public async register(plugin: JarvisPlugin, context: JarvisPluginContext = {}): Promise<void> {
        if (this.plugins.has(plugin.id)) {
            throw new Error(`Plugin já registrado: ${plugin.id}`);
        }

        await plugin.initialize?.(context);
        this.plugins.set(plugin.id, plugin);
    }

    public get(id: string): JarvisPlugin | undefined {
        return this.plugins.get(id);
    }

    public list(): readonly JarvisPlugin[] {
        return [...this.plugins.values()];
    }

    public async shutdown(): Promise<void> {
        for (const plugin of [...this.plugins.values()].reverse()) {
            await plugin.shutdown?.();
        }
    }
}
