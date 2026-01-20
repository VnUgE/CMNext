<script setup lang="ts">
import { defer } from 'lodash-es'
import { tryOnMounted } from '@vueuse/core'
import { useOauthLogin } from '@vnuge/vnlib.browser'
import { useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useStore } from '../../store';
import { useApiCall } from '@vnuge/vnlib.browser/vue';
import { vnlib, toaster } from '../../main';

const store = useStore();
const router = useRouter()
const { loggedIn } = storeToRefs(store)
const { invoke: apiCall, waiting } = useApiCall({ toaster })

//Set the page title
store.setPageTitle('Social Login')
const { completeLogin } = useOauthLogin(vnlib);

tryOnMounted(() => defer(async () => {

    // Wait for account data to load
    await store.account.wait();

    //If logged-in redirect to login page
    if (loggedIn.value) {
        router.push({ path: '/login' })
        return
    }

    //try to complete an oauth login
    apiCall(async () => {

        // We need to wait for the account rpc state to be ready 
        // before issuing a state change (login) this avoids a 
        // session cookie mismatch
        await store.account.wait();

        await completeLogin()

        //Trigger the account rpc state to update the account state
        store.account.refresh();

        await router.push('/login')
    })
}))

</script>

<template>
    <div id="social-login-template" class="app-component-entry">
        <div class="container flex flex-col m-auto my-16">
            <div id="social-final-template" class="flex justify-center">
                <div class="md:mt-6">
                    <h3 class="text-xl font-bold text-center">
                        <span v-if="loggedIn">
                            Login complete
                        </span>
                        <span v-else>
                            Completing login
                        </span>
                    </h3>
                    <div class="mt-6 mb-4">
                        <div v-if="waiting">
                            <div class="flex justify-center mb-4">
                                <div class="m-auto">
                                    <fa-icon class="animate-spin" icon="spinner" size="2x" />
                                </div>
                            </div>
                            <p>Please wait while we log you in.</p>
                        </div>
                        <div v-else class="">
                            <div class="flex justify-center mt-5">
                                <router-link to="/login">
                                    <button type="submit" class="btn btn-primary" :disabled="waiting">
                                        <fa-icon icon="sign-in-alt" />
                                        Back to login
                                    </button>
                                </router-link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
