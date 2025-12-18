import 'piccolore';
import { n as NOOP_MIDDLEWARE_HEADER, p as decodeKey } from './chunks/astro/server_BTtRWRX2.mjs';
import 'clsx';
import './chunks/shared_B6bdXPNh.mjs';
import 'es-module-lexer';
import 'html-escaper';

const NOOP_MIDDLEWARE_FN = async (_ctx, next) => {
  const response = await next();
  response.headers.set(NOOP_MIDDLEWARE_HEADER, "true");
  return response;
};

function sanitizeParams(params) {
  return Object.fromEntries(
    Object.entries(params).map(([key, value]) => {
      if (typeof value === "string") {
        return [key, value.normalize().replace(/#/g, "%23").replace(/\?/g, "%3F")];
      }
      return [key, value];
    })
  );
}
function getParameter(part, params) {
  if (part.spread) {
    return params[part.content.slice(3)] || "";
  }
  if (part.dynamic) {
    if (!params[part.content]) {
      throw new TypeError(`Missing parameter: ${part.content}`);
    }
    return params[part.content];
  }
  return part.content.normalize().replace(/\?/g, "%3F").replace(/#/g, "%23").replace(/%5B/g, "[").replace(/%5D/g, "]");
}
function getSegment(segment, params) {
  const segmentPath = segment.map((part) => getParameter(part, params)).join("");
  return segmentPath ? "/" + segmentPath : "";
}
function getRouteGenerator(segments, addTrailingSlash) {
  return (params) => {
    const sanitizedParams = sanitizeParams(params);
    let trailing = "";
    if (addTrailingSlash === "always" && segments.length) {
      trailing = "/";
    }
    const path = segments.map((segment) => getSegment(segment, sanitizedParams)).join("") + trailing;
    return path || "/";
  };
}

function deserializeRouteData(rawRouteData) {
  return {
    route: rawRouteData.route,
    type: rawRouteData.type,
    pattern: new RegExp(rawRouteData.pattern),
    params: rawRouteData.params,
    component: rawRouteData.component,
    generate: getRouteGenerator(rawRouteData.segments, rawRouteData._meta.trailingSlash),
    pathname: rawRouteData.pathname || void 0,
    segments: rawRouteData.segments,
    prerender: rawRouteData.prerender,
    redirect: rawRouteData.redirect,
    redirectRoute: rawRouteData.redirectRoute ? deserializeRouteData(rawRouteData.redirectRoute) : void 0,
    fallbackRoutes: rawRouteData.fallbackRoutes.map((fallback) => {
      return deserializeRouteData(fallback);
    }),
    isIndex: rawRouteData.isIndex,
    origin: rawRouteData.origin
  };
}

function deserializeManifest(serializedManifest) {
  const routes = [];
  for (const serializedRoute of serializedManifest.routes) {
    routes.push({
      ...serializedRoute,
      routeData: deserializeRouteData(serializedRoute.routeData)
    });
    const route = serializedRoute;
    route.routeData = deserializeRouteData(serializedRoute.routeData);
  }
  const assets = new Set(serializedManifest.assets);
  const componentMetadata = new Map(serializedManifest.componentMetadata);
  const inlinedScripts = new Map(serializedManifest.inlinedScripts);
  const clientDirectives = new Map(serializedManifest.clientDirectives);
  const serverIslandNameMap = new Map(serializedManifest.serverIslandNameMap);
  const key = decodeKey(serializedManifest.key);
  return {
    // in case user middleware exists, this no-op middleware will be reassigned (see plugin-ssr.ts)
    middleware() {
      return { onRequest: NOOP_MIDDLEWARE_FN };
    },
    ...serializedManifest,
    assets,
    componentMetadata,
    inlinedScripts,
    clientDirectives,
    routes,
    serverIslandNameMap,
    key
  };
}

const manifest = deserializeManifest({"hrefRoot":"file:///Users/macbook/Desktop/folder/dreary-disk/","cacheDir":"file:///Users/macbook/Desktop/folder/dreary-disk/node_modules/.astro/","outDir":"file:///Users/macbook/Desktop/folder/dreary-disk/dist/","srcDir":"file:///Users/macbook/Desktop/folder/dreary-disk/src/","publicDir":"file:///Users/macbook/Desktop/folder/dreary-disk/public/","buildClientDir":"file:///Users/macbook/Desktop/folder/dreary-disk/dist/","buildServerDir":"file:///Users/macbook/Desktop/folder/dreary-disk/.netlify/build/","adapterName":"@astrojs/netlify","routes":[{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"type":"page","component":"_server-islands.astro","params":["name"],"segments":[[{"content":"_server-islands","dynamic":false,"spread":false}],[{"content":"name","dynamic":true,"spread":false}]],"pattern":"^\\/_server-islands\\/([^/]+?)\\/?$","prerender":false,"isIndex":false,"fallbackRoutes":[],"route":"/_server-islands/[name]","origin":"internal","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"type":"endpoint","isIndex":false,"route":"/_image","pattern":"^\\/_image\\/?$","segments":[[{"content":"_image","dynamic":false,"spread":false}]],"params":[],"component":"node_modules/astro/dist/assets/endpoint/generic.js","pathname":"/_image","prerender":false,"fallbackRoutes":[],"origin":"internal","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"route":"/api/ai/chat","isIndex":false,"type":"endpoint","pattern":"^\\/api\\/ai\\/chat\\/?$","segments":[[{"content":"api","dynamic":false,"spread":false}],[{"content":"ai","dynamic":false,"spread":false}],[{"content":"chat","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/api/ai/chat.ts","pathname":"/api/ai/chat","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"route":"/api/ai/debug","isIndex":false,"type":"endpoint","pattern":"^\\/api\\/ai\\/debug\\/?$","segments":[[{"content":"api","dynamic":false,"spread":false}],[{"content":"ai","dynamic":false,"spread":false}],[{"content":"debug","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/api/ai/debug.ts","pathname":"/api/ai/debug","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"route":"/api/ai/quiz","isIndex":false,"type":"endpoint","pattern":"^\\/api\\/ai\\/quiz\\/?$","segments":[[{"content":"api","dynamic":false,"spread":false}],[{"content":"ai","dynamic":false,"spread":false}],[{"content":"quiz","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/api/ai/quiz.ts","pathname":"/api/ai/quiz","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"route":"/api/auth/forgot-password","isIndex":false,"type":"endpoint","pattern":"^\\/api\\/auth\\/forgot-password\\/?$","segments":[[{"content":"api","dynamic":false,"spread":false}],[{"content":"auth","dynamic":false,"spread":false}],[{"content":"forgot-password","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/api/auth/forgot-password.ts","pathname":"/api/auth/forgot-password","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"route":"/api/auth/login","isIndex":false,"type":"endpoint","pattern":"^\\/api\\/auth\\/login\\/?$","segments":[[{"content":"api","dynamic":false,"spread":false}],[{"content":"auth","dynamic":false,"spread":false}],[{"content":"login","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/api/auth/login.ts","pathname":"/api/auth/login","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"route":"/api/auth/logout","isIndex":false,"type":"endpoint","pattern":"^\\/api\\/auth\\/logout\\/?$","segments":[[{"content":"api","dynamic":false,"spread":false}],[{"content":"auth","dynamic":false,"spread":false}],[{"content":"logout","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/api/auth/logout.ts","pathname":"/api/auth/logout","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"route":"/api/auth/register","isIndex":false,"type":"endpoint","pattern":"^\\/api\\/auth\\/register\\/?$","segments":[[{"content":"api","dynamic":false,"spread":false}],[{"content":"auth","dynamic":false,"spread":false}],[{"content":"register","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/api/auth/register.ts","pathname":"/api/auth/register","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"route":"/api/auth/reset-password","isIndex":false,"type":"endpoint","pattern":"^\\/api\\/auth\\/reset-password\\/?$","segments":[[{"content":"api","dynamic":false,"spread":false}],[{"content":"auth","dynamic":false,"spread":false}],[{"content":"reset-password","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/api/auth/reset-password.ts","pathname":"/api/auth/reset-password","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"route":"/api/games/[code]/leaderboard","isIndex":false,"type":"endpoint","pattern":"^\\/api\\/games\\/([^/]+?)\\/leaderboard\\/?$","segments":[[{"content":"api","dynamic":false,"spread":false}],[{"content":"games","dynamic":false,"spread":false}],[{"content":"code","dynamic":true,"spread":false}],[{"content":"leaderboard","dynamic":false,"spread":false}]],"params":["code"],"component":"src/pages/api/games/[code]/leaderboard.ts","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"route":"/api/games/[code]/score","isIndex":false,"type":"endpoint","pattern":"^\\/api\\/games\\/([^/]+?)\\/score\\/?$","segments":[[{"content":"api","dynamic":false,"spread":false}],[{"content":"games","dynamic":false,"spread":false}],[{"content":"code","dynamic":true,"spread":false}],[{"content":"score","dynamic":false,"spread":false}]],"params":["code"],"component":"src/pages/api/games/[code]/score.ts","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"route":"/api/games","isIndex":true,"type":"endpoint","pattern":"^\\/api\\/games\\/?$","segments":[[{"content":"api","dynamic":false,"spread":false}],[{"content":"games","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/api/games/index.ts","pathname":"/api/games","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"route":"/api/profile/me","isIndex":false,"type":"endpoint","pattern":"^\\/api\\/profile\\/me\\/?$","segments":[[{"content":"api","dynamic":false,"spread":false}],[{"content":"profile","dynamic":false,"spread":false}],[{"content":"me","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/api/profile/me.ts","pathname":"/api/profile/me","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"external","src":"/_astro/reset-password.fKlrJ3lM.css"}],"routeData":{"route":"/auth/reset-password","isIndex":false,"type":"page","pattern":"^\\/auth\\/reset-password\\/?$","segments":[[{"content":"auth","dynamic":false,"spread":false}],[{"content":"reset-password","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/auth/reset-password.astro","pathname":"/auth/reset-password","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"external","src":"/_astro/reset-password.fKlrJ3lM.css"}],"routeData":{"route":"/g/ai_quiz","isIndex":false,"type":"page","pattern":"^\\/g\\/ai_quiz\\/?$","segments":[[{"content":"g","dynamic":false,"spread":false}],[{"content":"ai_quiz","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/g/ai_quiz.astro","pathname":"/g/ai_quiz","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"external","src":"/_astro/reset-password.fKlrJ3lM.css"}],"routeData":{"route":"/g/aim_trainer","isIndex":false,"type":"page","pattern":"^\\/g\\/aim_trainer\\/?$","segments":[[{"content":"g","dynamic":false,"spread":false}],[{"content":"aim_trainer","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/g/aim_trainer.astro","pathname":"/g/aim_trainer","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"external","src":"/_astro/reset-password.fKlrJ3lM.css"}],"routeData":{"route":"/g/reaction_test","isIndex":false,"type":"page","pattern":"^\\/g\\/reaction_test\\/?$","segments":[[{"content":"g","dynamic":false,"spread":false}],[{"content":"reaction_test","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/g/reaction_test.astro","pathname":"/g/reaction_test","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"external","src":"/_astro/reset-password.fKlrJ3lM.css"}],"routeData":{"route":"/g/tic_tac_toe","isIndex":false,"type":"page","pattern":"^\\/g\\/tic_tac_toe\\/?$","segments":[[{"content":"g","dynamic":false,"spread":false}],[{"content":"tic_tac_toe","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/g/tic_tac_toe.astro","pathname":"/g/tic_tac_toe","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"external","src":"/_astro/reset-password.fKlrJ3lM.css"}],"routeData":{"route":"/","isIndex":true,"type":"page","pattern":"^\\/$","segments":[],"params":[],"component":"src/pages/index.astro","pathname":"/","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}}],"base":"/","trailingSlash":"ignore","compressHTML":true,"componentMetadata":[["/Users/macbook/Desktop/folder/dreary-disk/src/pages/auth/reset-password.astro",{"propagation":"none","containsHead":true}],["/Users/macbook/Desktop/folder/dreary-disk/src/pages/g/ai_quiz.astro",{"propagation":"none","containsHead":true}],["/Users/macbook/Desktop/folder/dreary-disk/src/pages/g/aim_trainer.astro",{"propagation":"none","containsHead":true}],["/Users/macbook/Desktop/folder/dreary-disk/src/pages/g/reaction_test.astro",{"propagation":"none","containsHead":true}],["/Users/macbook/Desktop/folder/dreary-disk/src/pages/g/tic_tac_toe.astro",{"propagation":"none","containsHead":true}],["/Users/macbook/Desktop/folder/dreary-disk/src/pages/index.astro",{"propagation":"none","containsHead":true}]],"renderers":[],"clientDirectives":[["idle","(()=>{var l=(n,t)=>{let i=async()=>{await(await n())()},e=typeof t.value==\"object\"?t.value:void 0,s={timeout:e==null?void 0:e.timeout};\"requestIdleCallback\"in window?window.requestIdleCallback(i,s):setTimeout(i,s.timeout||200)};(self.Astro||(self.Astro={})).idle=l;window.dispatchEvent(new Event(\"astro:idle\"));})();"],["load","(()=>{var e=async t=>{await(await t())()};(self.Astro||(self.Astro={})).load=e;window.dispatchEvent(new Event(\"astro:load\"));})();"],["media","(()=>{var n=(a,t)=>{let i=async()=>{await(await a())()};if(t.value){let e=matchMedia(t.value);e.matches?i():e.addEventListener(\"change\",i,{once:!0})}};(self.Astro||(self.Astro={})).media=n;window.dispatchEvent(new Event(\"astro:media\"));})();"],["only","(()=>{var e=async t=>{await(await t())()};(self.Astro||(self.Astro={})).only=e;window.dispatchEvent(new Event(\"astro:only\"));})();"],["visible","(()=>{var a=(s,i,o)=>{let r=async()=>{await(await s())()},t=typeof i.value==\"object\"?i.value:void 0,c={rootMargin:t==null?void 0:t.rootMargin},n=new IntersectionObserver(e=>{for(let l of e)if(l.isIntersecting){n.disconnect(),r();break}},c);for(let e of o.children)n.observe(e)};(self.Astro||(self.Astro={})).visible=a;window.dispatchEvent(new Event(\"astro:visible\"));})();"]],"entryModules":{"\u0000astro-internal:middleware":"_astro-internal_middleware.mjs","\u0000virtual:astro:actions/noop-entrypoint":"noop-entrypoint.mjs","\u0000@astro-page:node_modules/astro/dist/assets/endpoint/generic@_@js":"pages/_image.astro.mjs","\u0000@astro-page:src/pages/api/ai/chat@_@ts":"pages/api/ai/chat.astro.mjs","\u0000@astro-page:src/pages/api/ai/debug@_@ts":"pages/api/ai/debug.astro.mjs","\u0000@astro-page:src/pages/api/ai/quiz@_@ts":"pages/api/ai/quiz.astro.mjs","\u0000@astro-page:src/pages/api/auth/forgot-password@_@ts":"pages/api/auth/forgot-password.astro.mjs","\u0000@astro-page:src/pages/api/auth/login@_@ts":"pages/api/auth/login.astro.mjs","\u0000@astro-page:src/pages/api/auth/logout@_@ts":"pages/api/auth/logout.astro.mjs","\u0000@astro-page:src/pages/api/auth/register@_@ts":"pages/api/auth/register.astro.mjs","\u0000@astro-page:src/pages/api/auth/reset-password@_@ts":"pages/api/auth/reset-password.astro.mjs","\u0000@astro-page:src/pages/api/games/[code]/leaderboard@_@ts":"pages/api/games/_code_/leaderboard.astro.mjs","\u0000@astro-page:src/pages/api/games/[code]/score@_@ts":"pages/api/games/_code_/score.astro.mjs","\u0000@astro-page:src/pages/api/games/index@_@ts":"pages/api/games.astro.mjs","\u0000@astro-page:src/pages/api/profile/me@_@ts":"pages/api/profile/me.astro.mjs","\u0000@astro-page:src/pages/auth/reset-password@_@astro":"pages/auth/reset-password.astro.mjs","\u0000@astro-page:src/pages/g/ai_quiz@_@astro":"pages/g/ai_quiz.astro.mjs","\u0000@astro-page:src/pages/g/aim_trainer@_@astro":"pages/g/aim_trainer.astro.mjs","\u0000@astro-page:src/pages/g/reaction_test@_@astro":"pages/g/reaction_test.astro.mjs","\u0000@astro-page:src/pages/g/tic_tac_toe@_@astro":"pages/g/tic_tac_toe.astro.mjs","\u0000@astro-page:src/pages/index@_@astro":"pages/index.astro.mjs","\u0000@astrojs-ssr-virtual-entry":"entry.mjs","\u0000@astro-renderers":"renderers.mjs","\u0000@astrojs-ssr-adapter":"_@astrojs-ssr-adapter.mjs","\u0000@astrojs-manifest":"manifest_BcCde4ak.mjs","/Users/macbook/Desktop/folder/dreary-disk/node_modules/unstorage/drivers/netlify-blobs.mjs":"chunks/netlify-blobs_DM36vZAS.mjs","/Users/macbook/Desktop/folder/dreary-disk/src/components/games/AiQuiz.tsx":"_astro/AiQuiz.DHAFTZls.js","/Users/macbook/Desktop/folder/dreary-disk/src/components/games/QuizLeaderboard.tsx":"_astro/QuizLeaderboard.BRaPH_gY.js","/Users/macbook/Desktop/folder/dreary-disk/src/components/auth/ResetPasswordForm.tsx":"_astro/ResetPasswordForm.CGLZhy_q.js","/Users/macbook/Desktop/folder/dreary-disk/src/components/games/AimTrainer.tsx":"_astro/AimTrainer.BHHwepaa.js","/Users/macbook/Desktop/folder/dreary-disk/src/components/games/AimTrainerLeaderboard.tsx":"_astro/AimTrainerLeaderboard.C1X-SLuR.js","/Users/macbook/Desktop/folder/dreary-disk/src/components/games/ReactionTimeTest.tsx":"_astro/ReactionTimeTest.5qMW8TYu.js","/Users/macbook/Desktop/folder/dreary-disk/src/components/games/ReactionTimeLeaderboard.tsx":"_astro/ReactionTimeLeaderboard.I1NTjIyP.js","/Users/macbook/Desktop/folder/dreary-disk/src/components/games/TicTacToe.tsx":"_astro/TicTacToe.BuDjIbcN.js","/Users/macbook/Desktop/folder/dreary-disk/src/components/games/TicTacToeLeaderboard.tsx":"_astro/TicTacToeLeaderboard.DDWsGmhg.js","/Users/macbook/Desktop/folder/dreary-disk/src/components/home/HomePage.tsx":"_astro/HomePage.D-ImbaP5.js","/Users/macbook/Desktop/folder/dreary-disk/src/components/layout/AppHeader.tsx":"_astro/AppHeader.GqFL778F.js","@astrojs/react/client.js":"_astro/client.DVxIpRTZ.js","astro:scripts/before-hydration.js":""},"inlinedScripts":[],"assets":["/_astro/reset-password.fKlrJ3lM.css","/favicon.svg","/_astro/AiQuiz.DHAFTZls.js","/_astro/AimTrainer.BHHwepaa.js","/_astro/AimTrainerLeaderboard.C1X-SLuR.js","/_astro/AppHeader.GqFL778F.js","/_astro/HomePage.D-ImbaP5.js","/_astro/QuizLeaderboard.BRaPH_gY.js","/_astro/ReactionTimeLeaderboard.I1NTjIyP.js","/_astro/ReactionTimeTest.5qMW8TYu.js","/_astro/ResetPasswordForm.CGLZhy_q.js","/_astro/TicTacToe.BuDjIbcN.js","/_astro/TicTacToeLeaderboard.DDWsGmhg.js","/_astro/Typography.Bgm4sVaZ.js","/_astro/authService.C4vEGka5.js","/_astro/client.DVxIpRTZ.js","/_astro/index.WxXIy71t.js","/_astro/jsx-runtime.D_zvdyIk.js"],"buildFormat":"directory","checkOrigin":true,"allowedDomains":[],"serverIslandNameMap":[],"key":"8EiVHSDE1WeMtqFX7CStGp8cwlG2eN66AnZMFllfDqk=","sessionConfig":{"driver":"netlify-blobs","options":{"name":"astro-sessions","consistency":"strong"}}});
if (manifest.sessionConfig) manifest.sessionConfig.driverModule = () => import('./chunks/netlify-blobs_DM36vZAS.mjs');

export { manifest };
