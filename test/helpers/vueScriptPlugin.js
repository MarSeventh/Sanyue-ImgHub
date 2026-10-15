import { compileScript, parse } from 'vue/compiler-sfc';

// Exercise real component options/methods without pretending to render templates.
// Vue CLI's production build still compiles the complete SFCs and their templates.
export function vueScriptPlugin() {
    return {
        name: 'test-vue-script',
        transform(source, id) {
            if (!id.endsWith('.vue')) return null;
            const { descriptor, errors } = parse(source, { filename: id });
            if (errors.length) throw errors[0];
            return { code: compileScript(descriptor, { id }).content, map: null };
        },
    };
}
