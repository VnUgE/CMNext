<template>
  <div id="reg-submit-template">
    <form 
      id="complete-registration"
      method="POST"
      action="#"
      :disabled="waiting"
      @submit.prevent="onSubmit"
    >
      <fieldset class="input-group">
        <div class="input-container">
          <label for="reg-password" class="pl-1">
            Password
          </label>
          <input
            id="reg-password"
            v-model="v$.password.$model"
            type="password"
            class="input-field primary input"
            @input="onInput"
          >
        </div>
        <div class="input-container">
          <label for="reg-repeat-pass" class="pl-1">
            Repeat Password
          </label>
          <input
            id="reg-repeat-pass"
            v-model="v$.repeatPass.$model"
            type="password"
            class="input-field primary input"
            @input="onInput"
          >
        </div>
        <div class="flex flex-row justify-end gap-4 pt-4">
          <button form="complete-registration" type="submit" class="btn primary">
            Submit
          </button>
          <button class="text-red-500 cursor-pointer" @click.prevent="cancel">
            Cancel
          </button>
        </div>
      </fieldset>
    </form>
  </div>
</template>

<script setup lang="ts">

import { isEqual } from 'lodash'
import useVuelidate from '@vuelidate/core'
import { required, minLength, maxLength, helpers } from '@vuelidate/validators'
import { apiCall, useMessage, useWait, useVuelidateWrapper, WebMessage } from '@vnuge/vnlib.browser'
import { computed, reactive, toRefs } from 'vue'

const emit = defineEmits(['complete', 'cancel'])

const props = defineProps<{
  token: string
  regPath: string
}>()

const { token, regPath } = toRefs(props)
const { onInput } = useMessage()
const { waiting } = useWait()

const vState = reactive({ password: '', repeatPass: ''})

const rules = computed(() => {
  return {
    password: {
      required: helpers.withMessage('Password cannot be empty', required),
      minLength: helpers.withMessage('Password must be at least 8 characters', minLength(8)),
      maxLength: helpers.withMessage(' must have less than 128 characters', maxLength(128))
    },
    repeatPass: {
      sameAs: helpers.withMessage('Your passwords do not match', (value : string) => isEqual(value, v$.value.password.$model)),
      required: helpers.withMessage('Repeat password cannot be empty', required),
      minLength: helpers.withMessage('Repeat password must be at least 8 characters', minLength(8)),
      maxLength: helpers.withMessage('Repeat password must have less than 128 characters', maxLength(128))
    },
  }
})

const v$ = useVuelidate(rules, vState, { $lazy: true })

const { validate } = useVuelidateWrapper(v$)

const onSubmit = async function () {
  
  if (!await validate()) {
    return
  }

  await apiCall(async ({ axios }) => {
    // finalize by passing the token and the new password
    const { data } = await axios.post<WebMessage>(regPath.value, {
      token: token.value,
      password: v$.value.password.$model
    })
  
    //Throw if not successful
    data.getResultOrThrow()
    v$.value.$reset()
    emit('complete')
    
  })
}

const cancel = () => emit('cancel')

</script>

<style>

</style>
