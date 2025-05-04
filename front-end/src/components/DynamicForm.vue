
<script setup lang="ts">
import { defaultTo, cloneDeep, map } from 'lodash-es'
import { toRefs, computed } from 'vue'
import type { useVuelidate } from '@vuelidate/core'



export interface IDynamicFormField {
  readonly name: string
  readonly label: string
  readonly type: 'text' | 'email' | 'password' | 'select' | 'textarea'
  readonly id: string
  readonly hidden?: boolean
  readonly disabled?: boolean
  readonly placeholder?: string
  readonly description?: string
  readonly options?: { value: string, label: string }[]
}

export interface IDynamicForm {
  readonly id: string
  readonly method?: 'get' | 'post' | 'put' | 'delete'
  readonly path?: string
  readonly fields: IDynamicFormField []
}

interface InternalFormField extends IDynamicFormField {
  validator: {
    $model: string
    $dirty: boolean
    $invalid: boolean
  }
}

const props = defineProps<{
  form: IDynamicForm
  disabled: boolean
  validator: ReturnType<typeof useVuelidate<IDynamicForm>>
}>()

const emit = defineEmits(['input', 'submit'])

const { form, disabled, validator } = toRefs(props)

const schema = computed(() => cloneDeep(form.value))
const path = computed(() => defaultTo(form.value.path, '#'))

const fields = computed<InternalFormField[]>(() => {
  const ff = defaultTo(schema.value.fields, [])
  //Set validators for the field, storeing the fields in the schema item
  return map(ff, (field) => {
    return {
      ...field,
      validator: validator.value[field.name]
    } as InternalFormField
  })
})

const isSelect = (field: IDynamicFormField) => field.type === 'select'
const isTextArea = (field: IDynamicFormField) => field.type === 'textarea'
const placeholder = (field: IDynamicFormField) => defaultTo(field.placeholder, field.label)

const onSubmit = () => emit('submit')
const onInput = (field: IDynamicFormField) => emit('input', field)

</script>

<template>
  <form 
    :id="form.id" 
    class="dynamic-form form" 
    :method="form.method" 
    :path="path" 
    @submit.prevent="onSubmit"
  >

    <fieldset class="dynamic-form input-group" :disabled="disabled">

      <!-- Create a new div element for each field in the form -->
      <div v-show="!field.hidden"
        v-for="field in fields"
        :key="field.name"
        :class="{ 'dirty': field.validator.$dirty, 'data-invalid': field.validator.$invalid }"
        class="dynamic-form input-container"
      >
        <!-- label above the fields -->
        <label :for="field.id" class="dynamic-form input-label" >
          {{ field.label }}
        </label>

        <!-- Determine select, input, or textarea -->
        <select v-if="isSelect(field)"
          v-model="field.validator.$model"
          :id="field.id"
          :disabled="field.disabled"
          class="dynamic-form dynamic-input input-select"
          @change="onInput(field)"
        >

          <option v-for="option in field.options" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>

        </select>

        <textarea v-else-if="isTextArea(field)"
          v-model="field.validator.$model"
          :id="field.id"
          :disabled="field.disabled"
          class="dynamic-form dynamic-input input-textarea"
          @input="onInput(field)"
        />

        <input v-else
          v-model="field.validator.$model"
          :id="field.id"
          :type="field.type"
          :name="field.name"
          :disabled="field.disabled"
          class="dynamic-form dynamic-input input"
          :placeholder="placeholder(field)"
          @input="onInput(field)"
        >

        <div class="dynamic-form field-description">
          <p>{{ field.description }}</p>
        </div>

      </div>

    </fieldset>

  </form>
</template>