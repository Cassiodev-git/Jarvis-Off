import { JarvisPlugin } from '../../core/plugins/JarvisPlugin.js';

export class HardwarePlugin implements JarvisPlugin {
    public readonly id = 'hardware';
    public readonly name = 'Hardware';
    public readonly version = '1.0.0';
}
