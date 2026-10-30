import * as Vue from 'vue';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { compileTemplate, parse } from 'vue/compiler-sfc';

// Render a component's real template with its real options (compiled by
// vueScriptPlugin) so tests can assert what users actually see. Element Plus
// and child components are replaced by stubs that render every slot inline,
// pass attributes through and expose their props as data-* attributes.
export function compileRender(path) {
    const source = readFileSync(resolve(process.cwd(), path), 'utf8');
    const { descriptor } = parse(source, { filename: path });
    const { code, errors } = compileTemplate({
        source: descriptor.template.content,
        filename: path,
        id: path,
        compilerOptions: { mode: 'function' },
    });
    if (errors.length) throw errors[0];
    return { render: new Function('Vue', code)(Vue), code };
}

function stub(name) {
    return Vue.defineComponent({
        name: `Stub-${name}`,
        inheritAttrs: false,
        setup(_, { attrs, slots }) {
            return () => Vue.h('div', { ...attrs, 'data-stub': name }, Object.entries(slots).map(([slot, render]) =>
                Vue.h('div', { 'data-slot': slot }, render?.())));
        },
    });
}

/**
 * @param {Object} component - component options from the SFC script
 * @param {string} path - SFC path relative to the repository root
 * @param {Object} options
 * @param {Object} [options.props] - initial props; change them later through the returned `props`
 * @param {Object} [options.globals] - extra globalProperties such as $store or $message
 * @param {Function} [options.t] - translation function
 */
export function mountTemplate(component, path, { props = {}, globals = {}, t = key => key } = {}) {
    const { render, code } = compileRender(path);
    const inner = { ...component, components: {}, render };
    const state = Vue.reactive({ ...props });
    const child = Vue.ref(null);
    const app = Vue.createApp({ render: () => Vue.h(inner, { ...state, ref: child }) });
    for (const [, name] of code.matchAll(/_resolveComponent\("([^"]+)"/g)) {
        app.component(name, stub(name));
    }
    for (const [, name] of code.matchAll(/_resolveDirective\("([^"]+)"/g)) {
        app.directive(name, {});
    }
    app.config.warnHandler = () => {};
    Object.assign(app.config.globalProperties, { $t: t, $i18n: { locale: 'en' }, ...globals });
    const el = document.createElement('div');
    document.body.appendChild(el);
    app.mount(el);
    return {
        get vm() { return child.value; },
        props: state,
        el,
        text: () => el.textContent,
        find: selector => el.querySelector(selector),
        findAll: selector => [...el.querySelectorAll(selector)],
        unmount() {
            app.unmount();
            el.remove();
        },
    };
}
