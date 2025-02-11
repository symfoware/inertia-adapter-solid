import { router, setupProgress,  } from '@inertiajs/core';
import { isServer, createComponent, renderToString, getAssets, generateHydrationScript } from 'solid-js/web';

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
    const [App] = await Promise.all([
        resolveComponent(initialPage.component),
        router.decryptHistory().catch(() => { }),
    ]);

    const props = initialPage.props;
    setup({el, App: App, props: props});
    
    if (isServer) {
        // サーバーサイドレンダリングは未検証
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
