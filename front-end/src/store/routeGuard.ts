import 'pinia';
import { get, whenever } from '@vueuse/core';
import { type PiniaPlugin, type PiniaPluginContext } from 'pinia';
import { storeExport } from './index';
import { type Router } from 'vue-router';
import { isLoggedIn } from '@vnuge/vnlib.browser';
import { startsWith } from 'lodash-es';

export const pageGuardPlugin = (router: Router): PiniaPlugin => {
  const { beforeEach, afterEach, push, currentRoute } = router;

  //scroll window back to top
  afterEach(() => window.scrollTo(0, 0));

  const toLogin = () => {
    const cr = get(currentRoute);
    return push({ path: '/login', query: { redirect: cr.fullPath } });
  };

  return ({ store }: PiniaPluginContext) => {
    whenever(() => !isLoggedIn(store.account.data), toLogin, { immediate: false });

    // Setup nav guards
    beforeEach(async (to) => {
      if (!to.name) {
        return true;
      }

      // For the initial page load, wait for the login status to be determined
      // before checking the value of loggedIn
      const acc = await store.account.wait();

      // If navigating to login page or already logged in, allow navigation
      if (startsWith(to.path, '/login') || isLoggedIn(acc)) {
        return true;
      }

      // Reload account state when showing login page to ensure fresh state
      store.account.refresh();

      return { path: '/login', query: { redirect: to.fullPath } };
    });

    return storeExport({});
  };
};
