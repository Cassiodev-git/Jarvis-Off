import { LoggerProvider } from '../infrastructure/logger/LoggerProvider.js';
import { PluginRegistry } from '../core/plugins/PluginRegistry.js';
import { AssistantPlugin } from './assistant/AssistantPlugin.js';
import { AutomationPlugin } from './automation/AutomationPlugin.js';
import { DevelopmentPlugin } from './development/DevelopmentPlugin.js';
import { HardwarePlugin } from './hardware/HardwarePlugin.js';
import { ProjectsPlugin } from './projects/ProjectsPlugin.js';
import { StudyPlugin } from './study/StudyPlugin.js';

export async function registerCorePlugins(
    registry: PluginRegistry,
    logger: LoggerProvider,
): Promise<void> {
    for (const plugin of [
        new AssistantPlugin(),
        new AutomationPlugin(),
        new DevelopmentPlugin(logger),
        new HardwarePlugin(),
        new ProjectsPlugin(),
        new StudyPlugin(),
    ]) {
        await registry.register(plugin, { logger });
    }
}

export * from './assistant/AssistantPlugin.js';
export * from './automation/AutomationPlugin.js';
export * from './development/DevelopmentPlugin.js';
export * from './hardware/HardwarePlugin.js';
export * from './projects/ProjectsPlugin.js';
export * from './study/StudyPlugin.js';
