import { JarvisPlugin } from '../../core/plugins/JarvisPlugin.js';

export class AutomationPlugin implements JarvisPlugin {
    public readonly id = 'automation';
    public readonly name = 'Automação';
    public readonly version = '1.0.0';
}
