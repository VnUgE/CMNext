<script setup lang="ts">
import { useVuelidate } from '@vuelidate/core'
import { reactive, Ref } from 'vue'
import { helpers, required, maxLength } from '@vuelidate/validators'
import { useWait, useMessage, usePassConfirm, useVuelidateWrapper, type VuelidateInstance } from '@vnuge/vnlib.browser'

//Use component side of pw prompt
const { isRevealed, confirm, cancel } = usePassConfirm()

const { waiting } = useWait()
const { onInput } = useMessage()

const pwState = reactive({ password: '' })

const rules = {
  password: {
    required: helpers.withMessage('Please enter your password', required),
    maxLength: helpers.withMessage('Password must be less than 100 characters', maxLength(100))
  }
}

const v$ = useVuelidate(rules, pwState, { $lazy: true })

//Wrap validator so we an display error message on validation, defaults to the form toaster
const { validate } = useVuelidateWrapper(v$ as Ref<VuelidateInstance>);

const formSubmitted = async function () {
  //Calls validate on the vuelidate instance
  if (!await validate()) {
    return
  }

  //Store pw copy
  const password = v$.value.password.$model;

  //Clear the password form
  v$.value.password.$model = '';
  v$.value.$reset();

  //Pass the password to the confirm function
  confirm({ password });
}

const close = function () {
  // Clear the password form
  v$.value.password.$model = '';
  v$.value.$reset();

  //Close prompt
  cancel(null);
}

</script>

<template>
  <div id="password-prompt" class="z-40">
    <Dialog :open="isRevealed" @close="close()">

      <template v-slot:title>
        Enter your password
      </template>

      <template v-slot:description>
        <div class="w-full text-center">

          <p class="my-1 text-sm ">
            To confirm your identity, please enter your password.
          </p>

          <form id="password-form" class="my-2 w-full" @submit.prevent="formSubmitted()" :disabled="waiting">
            <fieldset>
              <div class="input-container">
                <input tabindex="1" v-model="v$.password.$model" id="password-prompt-input" type="password"
                  class="input input-primary" placeholder="Password" @input="onInput">
              </div>
            </fieldset>
          </form>

          <div class="join mt-4 w-fit float-right">
            <button class="btn btn-primary join-item" form="password-form">
              Submit
            </button>
            <button class="btn join-item" @click.prevent="close()">
              Close
            </button>
          </div>
        </div>
      </template>

    </Dialog>
  </div>

</template>
