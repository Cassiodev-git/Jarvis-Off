import { JarvisPlugin } from '../../core/plugins/JarvisPlugin.js';

export class AssistantPlugin implements JarvisPlugin {
    public readonly id = 'assistant';
    public readonly name = 'Assistente';
    public readonly version = '1.0.0';
}
