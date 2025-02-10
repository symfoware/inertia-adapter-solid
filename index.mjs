import { router, setupProgress,  } from '@inertiajs/core';
import { createContext }  from 'solid-js';
import { isServer, createComponent, Dynamic, mergeProps, renderToString, getAssets, generateHydrationScript } from 'solid-js/web';
import { createStore, createMutable, reconcile } from 'solid-js/store';
import { MetaProvider } from '@solidjs/meta';

const PageContext = createContext();

function extractLayouts(component) {
    if (!component) return [];
    const layout = component.layout;
    if (!layout) return [];
    if(typeof layout === 'function') return [layout];
    if(Array.isArray(layout)) return [layout];
    return [];
}


function App(props) {
    const currentProps = createMutable(props.initialPage.props);
    const [current, setCurrent] = createStore({
        component: props.initialComponent || null,
        layouts: extractLayouts(props.initialComponent || null),
        page: {
            ...props.initialPage,
            props: currentProps
        },
        key: null
    });


    if (!isServer) {
        router.init({
            initialPage: props.initialPage,
            resolveComponent: props.resolveComponent,
            async swapComponent({
                    component,
                    page,
                    preserveState
                }) {
                setCurrent(reconcile({
                    component,
                    layouts: extractLayouts(component),
                    page,
                    key: preserveState ? current.key : Date.now()
                }));
            }
        });
    }

    const children = (i = 0) => {
        const Layout = current.layouts[i];
        if (!Layout) {
            return createComponent(Dynamic, mergeProps({
                get component() {
                    return current.component;
                },
                get key() {
                    return current.key;
                }
            }, () => current.page.props));
        }
        
        return createComponent(Layout, mergeProps(() => current.page, {
            get children() {
                return children(i + 1);
            }
        }));
    };

    return createComponent(MetaProvider, {
        get children() {
            return createComponent(PageContext.Provider, {
                get value() {
                    return current.page;
                },
                get children() {
                    return children();
                }
            });
        }
    });
    
}


export async function createInertiaApp({
    id = 'app',
    resolve,
    setup,
    progress = {},
    page,
}) {

    const el = isServer ? null : document.getElementById(id);
    const initialPage = page || JSON.parse(el?.dataset.page || '{}');

    const resolveComponent = (name) => Promise.resolve(resolve(name).then((m) => m.default));
    const [initialComponent] = await Promise.all([
        resolveComponent(initialPage.component),
        router.decryptHistory().catch(() => { }),
    ]);

    const props = { initialPage, initialComponent, resolveComponent }
    setup({el, App: App, props});
    
    if (isServer) {
        const body = `<div id="${id}" data-page='${JSON.stringify(initialPage).replaceAll("'", "&#39;")}'>${renderToString(() => createComponent(App, props))}</div>`;
        const head = [getAssets(), generateHydrationScript()];
        
        return {
            body: body,
            head: head,
        };
    }
    if (progress) {
        setupProgress(progress);
    }

};