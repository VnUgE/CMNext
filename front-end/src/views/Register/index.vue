<template>
  <div id="reg-template" class="app-component-entry">
    <div class="container flex flex-col m-auto my-2 duration-150 ease-linear lg:mt-16">
      <div class="text-center">
        <h2>Sign Up</h2>
      </div>
      <div class="mt-4 content-container">
        <form v-if="formState === 0" @submit.prevent="OnSubmit" :disabled="waiting">
          <fieldset class="input-group">
            <div class="input-container">
              <label for="reg-email" class="pl-1 text-sm">Email Address</label>
              <input
                id="reg-email" 
                v-model="v$.emailAddress.$model"
                type="email"
                placeholder="user@example.com" 
                required
                class="input-field primary"
                @input="onInput"
              >
            </div>
          </fieldset>
          <fieldset class="flex flex-row justify-between mt-6">
            <div>
              <label class="checkbox primary">
                <input v-model="acceptedTerms" type="checkbox">
                <span class="check" />
                <span class="mx-2 text-sm"> 
                  I agree to the
                  <a class="link" href="#">Terms of Service</a>
                </span>
              </label>
            </div>
            <div>
              <button type="submit" :disabled="!acceptedTerms || waiting" class="btn primary">
                Submit
              </button>
            </div>
          </fieldset>
        </form>
        <complete-reg
          v-else-if="formState === 1"
          :reg-path="regPath"
          :token="token"
          @cancel="formState = 0"
          @complete="formState = 2"
        />
        <div v-else>
          <div class="text-center">
            <h3>Success</h3>
            <fa-icon
              :icon="['fa','check-circle']"
              class="text-primary-500 dark:text-primary-600"
              size="3x"
            />
            <p class="mt-4">
              You may log in now.
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { isNil } from 'lodash';
import useVuelidate from '@vuelidate/core'
import { required, maxLength, email, helpers } from '@vuelidate/validators'
import { ref, reactive, watch } from 'vue'
import { useSession, apiCall, useMessage, useWait, useTitle, useVuelidateWrapper } from '@vnuge/vnlib.browser'
import CompleteReg from './components/CompleteReg.vue'
import { useRouter } from 'vue-router';
import { useRouteQuery } from '@vueuse/router';

const regPath = "/account/registration"

useTitle('Registration')

const { setMessage, onInput } = useMessage()
const { waiting } = useWait()
const { browserId } = useSession()
const router = useRouter();

//Token is the t query argument
const token = useRouteQuery('t', null)

const acceptedTerms = ref(false)
const formState = ref(isNil(token.value) ? 0 : 1)

const vState = reactive({
  emailAddress: ''
})

const rules = {
  emailAddress: {
    required: helpers.withMessage('Email cannot be empty', required),
    email: helpers.withMessage('Your email address is not valid', email),
    maxLength: helpers.withMessage('Email address must be less than 50 characters', maxLength(50))
  }
}
const v$ = useVuelidate(rules, vState, { $lazy: true })
const { validate } = useVuelidateWrapper(v$)

const OnSubmit = async function () {
  if (!acceptedTerms.value) {
    setMessage('You must accept the terms of service to continue.')
    return
  }
  if (!await validate()) {
    return
  }
  await apiCall(async ({ axios, toaster }) => {
    const response = await axios.put(regPath, {
      username: v$.value.emailAddress.$model,
      clientid: browserId.value,
      localtime: new Date().toISOString()
    })
    if (response.data.success) {
      toaster.form.success({
          id: 'logout-success',
          title: 'Success',
          text: response.data.result,
          duration: 5000
        }
      )

      acceptedTerms.value = false
      v$.value.emailAddress.$model = '';
      //Clear form
      v$.value.$reset()
    } else {
      setMessage(response.data.result)
    }
  })
}

watch(formState, () => {
  //Clear token if formState is not 1
  v$.value.$reset()
  acceptedTerms.value = false
  v$.value.emailAddress.$model = '';
  router.push({ query: {} })
})

</script>

<style>
#reg-template .content-container{
    @apply mx-auto p-4 bg-white dark:bg-dark-700 border border-gray-200 dark:border-dark-500;
    @apply sm:p-6 sm:rounded-md sm:shadow-sm w-full max-w-sm;
}

#reg-template input.input-field {
    @apply block w-full p-2 border-b-2 my-2;
}

.content-container fieldset.input-group {
    @apply mx-auto;
}
</style>
