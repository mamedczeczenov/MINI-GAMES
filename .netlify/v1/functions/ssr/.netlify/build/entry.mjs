import { renderers } from './renderers.mjs';
import { s as serverEntrypointModule } from './chunks/_@astrojs-ssr-adapter_CvSoi7hX.mjs';
import { manifest } from './manifest_BcCde4ak.mjs';
import { createExports } from '@astrojs/netlify/ssr-function.js';

const serverIslandMap = new Map();;

const _page0 = () => import('./pages/_image.astro.mjs');
const _page1 = () => import('./pages/api/ai/chat.astro.mjs');
const _page2 = () => import('./pages/api/ai/debug.astro.mjs');
const _page3 = () => import('./pages/api/ai/quiz.astro.mjs');
const _page4 = () => import('./pages/api/auth/forgot-password.astro.mjs');
const _page5 = () => import('./pages/api/auth/login.astro.mjs');
const _page6 = () => import('./pages/api/auth/logout.astro.mjs');
const _page7 = () => import('./pages/api/auth/register.astro.mjs');
const _page8 = () => import('./pages/api/auth/reset-password.astro.mjs');
const _page9 = () => import('./pages/api/games/_code_/leaderboard.astro.mjs');
const _page10 = () => import('./pages/api/games/_code_/score.astro.mjs');
const _page11 = () => import('./pages/api/games.astro.mjs');
const _page12 = () => import('./pages/api/profile/me.astro.mjs');
const _page13 = () => import('./pages/auth/reset-password.astro.mjs');
const _page14 = () => import('./pages/g/ai_quiz.astro.mjs');
const _page15 = () => import('./pages/g/aim_trainer.astro.mjs');
const _page16 = () => import('./pages/g/reaction_test.astro.mjs');
const _page17 = () => import('./pages/g/tic_tac_toe.astro.mjs');
const _page18 = () => import('./pages/index.astro.mjs');
const pageMap = new Map([
    ["node_modules/astro/dist/assets/endpoint/generic.js", _page0],
    ["src/pages/api/ai/chat.ts", _page1],
    ["src/pages/api/ai/debug.ts", _page2],
    ["src/pages/api/ai/quiz.ts", _page3],
    ["src/pages/api/auth/forgot-password.ts", _page4],
    ["src/pages/api/auth/login.ts", _page5],
    ["src/pages/api/auth/logout.ts", _page6],
    ["src/pages/api/auth/register.ts", _page7],
    ["src/pages/api/auth/reset-password.ts", _page8],
    ["src/pages/api/games/[code]/leaderboard.ts", _page9],
    ["src/pages/api/games/[code]/score.ts", _page10],
    ["src/pages/api/games/index.ts", _page11],
    ["src/pages/api/profile/me.ts", _page12],
    ["src/pages/auth/reset-password.astro", _page13],
    ["src/pages/g/ai_quiz.astro", _page14],
    ["src/pages/g/aim_trainer.astro", _page15],
    ["src/pages/g/reaction_test.astro", _page16],
    ["src/pages/g/tic_tac_toe.astro", _page17],
    ["src/pages/index.astro", _page18]
]);

const _manifest = Object.assign(manifest, {
    pageMap,
    serverIslandMap,
    renderers,
    actions: () => import('./noop-entrypoint.mjs'),
    middleware: () => import('./_astro-internal_middleware.mjs')
});
const _args = {
    "middlewareSecret": "be9dc81a-eb99-48e6-9b17-87d9e3fc9f9d"
};
const _exports = createExports(_manifest, _args);
const __astrojsSsrVirtualEntry = _exports.default;
const _start = 'start';
if (Object.prototype.hasOwnProperty.call(serverEntrypointModule, _start)) {
	serverEntrypointModule[_start](_manifest, _args);
}

export { __astrojsSsrVirtualEntry as default, pageMap };
