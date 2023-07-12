<template>
    <div class="">
        <h3>Login</h3>
        <form id="user-pass-submit-form" method="post" action="/login" @submit.prevent="SubmitLogin">
            <fieldset class="" :disabled="waiting" >
                <div>
                    <div class="float-label">
                        <input
                            id="username"
                            v-model="v$.username.$model"
                            type="email"
                            class="w-full primary input"
                            placeholder="Email"
                            :class="{ 'data-invalid': v$.username.$invalid }"
                            @input="onInput"
                        >
                        <label for="username">Email</label>
                    </div>
                </div>
                 <div class="py-3">
                    <div class="mb-2 float-label">
                        <input
                            id="password"
                            v-model="v$.password.$model"
                            type="password"
                            class="w-full primary input"
                            placeholder="Password"
                            :class="{ 'data-invalid': v$.password.$invalid }"
                            @input="onInput"
                        >
                        <label for="password">Password</label>
                    </div>
                </div>
            </fieldset>
            <button type="submit" form="user-pass-submit-form" class="btn primary" :disabled="waiting">
                <!-- Display spinner if waiting, otherwise the sign-in icon -->
                <fa-icon :class="{'animate-spin':waiting}" :icon="waiting ? 'spinner' : 'sign-in-alt'"/>
                Log-in
            </button>
        </form>
         <div class="flex flex-row justify-between gap-3 pt-3 pb-2 form-links">
            <router-link to="/pwreset">
              Forgot password
            </router-link>
            <router-link to="/register">
              Register a new account
            </router-link>
          </div>
    </div>
</template>

<script setup lang="ts">
import { reactive } from 'vue'
import useVuelidate from '@vuelidate/core'
import { required, maxLength, minLength, email, helpers } from '@vuelidate/validators'
import { useMessage, useVuelidateWrapper, useWait } from '@vnuge/vnlib.browser'

const emit = defineEmits(['login'])

const { onInput } = useMessage();
const { waiting } = useWait();

const vState = reactive({ username: '', password: '' })

const rules = {
    username: {
        required: helpers.withMessage('Email cannot be empty', required),
        email: helpers.withMessage('Your email address is not valid', email),
        maxLength: helpers.withMessage('Email address must be less than 50 characters', maxLength(50))
    },
    password: {
        required: helpers.withMessage('Password cannot be empty', required),
        minLength: helpers.withMessage('Password must be at least 8 characters', minLength(8)),
        maxLength: helpers.withMessage('Password must have less than 128 characters', maxLength(128))
    }
}

const v$ = useVuelidate(rules, vState)
const { validate } = useVuelidateWrapper(v$);

const SubmitLogin = async () => {

    // If the form is not valid set the error message
    if (!await validate()) {
        return
    }

    //Emit login and pass the username and password
    emit('login', { username: v$.value.username.$model, password: v$.value.password.$model });
}

</script>