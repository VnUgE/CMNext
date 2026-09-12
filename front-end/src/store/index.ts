// Copyright (C) 2026 Vaughn Nugent
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as
// published by the Free Software Foundation, either version 3 of the
// License, or (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Affero General Public License for more details.
//
// You should have received a copy of the GNU Affero General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

import { set, get, useLocalStorage, toRefs, type DeepMaybeRef } from '@vueuse/core';
import { defineStore } from 'pinia';
import { defaultsDeep } from 'lodash-es';
import { shallowRef, watchEffect, type UnwrapNestedRefs } from 'vue';

export const storeExport = <T>(val: DeepMaybeRef<T>): UnwrapNestedRefs<T> =>
  val as UnwrapNestedRefs<T>;

export type ThemeNameDark =
  | 'dark'
  | 'forest'
  | 'black'
  | 'luxury'
  | 'dracula'
  | 'business'
  | 'night'
  | 'coffee'
  | 'dim'
  | 'sunset'
  | 'abyss';

export type ThemeNameLight =
  | 'light'
  | 'cupcake'
  | 'emerald'
  | 'corporate'
  | 'retro'
  | 'garden'
  | 'lofi'
  | 'pastel'
  | 'fantasy'
  | 'cmyk'
  | 'autumn'
  | 'acid'
  | 'lemonade'
  | 'winter'
  | 'nord'
  | 'caramellatte'
  | 'silk';

export type ThemeNameComplex = 'synthwave' | 'aqua' | 'luxury' | 'coffee';

export type ThemeName = ThemeNameDark | ThemeNameLight | ThemeNameComplex;

type GlobalState = {
  autoHeartbeat: boolean;
  theme: string;
  loggedIn: boolean;
  userName: string | undefined;
  isLocalAccount: boolean;
};
const defaultState: GlobalState = {
  autoHeartbeat: false,
  theme: '',
  loggedIn: false,
  userName: undefined,
  isLocalAccount: false,
};

export const themeNames: ThemeName[] = [
  'light',
  'dark',
  'forest',
  'cupcake',
  'dracula',
  'winter',
  'nord',
  'silk',
  'emerald',
  'corporate',
  'retro',
  'night',
  'sunset',
  'garden',
  'lofi',
  'pastel',
  'fantasy',
  'cmyk',
  'autumn',
  'acid',
  'lemonade',
  'caramellatte',
  'aqua',
  'black',
  'luxury',
  'business',
  'coffee',
  'dim',
  'abyss',
  'synthwave',
];

/**
 * Loads the main store for the application
 */
export const useStore = defineStore('main', () => {
  //MANAGED STATE
  const pageTitle = shallowRef('');
  const htmlRef = shallowRef<HTMLElement>(document.documentElement);

  //Get shared global state storage.
  const mainState = useLocalStorage('vn-state', defaultState);
  defaultsDeep(mainState.value, defaultState);

  const stateRefs = toRefs<GlobalState>(mainState);

  const setPageTitle = (title: string) => set(pageTitle, title);

  watchEffect(() => {
    const html = get(htmlRef);
    if (!html) return;
    html.setAttribute('data-theme', stateRefs.theme.value);
  });

  return {
    pageTitle,
    setPageTitle,
    ...stateRefs,
    themeNames,
  };
});
