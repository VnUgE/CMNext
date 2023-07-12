<template>

  <form :id="form.id" class="dynamic-form form" :path="path" @submit.prevent="onSubmit">

    <fieldset class="dynamic-form input-group" :disabled="disabled">

      <!-- Create a new div element for each field in the form -->
      <div v-show="!field.hidden"
        v-for="field in fields"
        :key="field"
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

<script setup lang="ts">
import { defaultTo, cloneDeep, forEach } from 'lodash'
import { toRefs, computed } from 'vue'

const props = defineProps<{
  form: any
  disabled?: boolean
  validator: any
}>()

const emit = defineEmits(['input', 'submit'])

const { form, disabled, validator } = toRefs(props)

const schema = computed(() => cloneDeep(form.value))
const path = computed(() => defaultTo(form.value.path, '#'))

const fields = computed(() =>{
  const ff = defaultTo(schema.value.fields, [])
  //Set validators for the field, storeing the fields in the schema item
  forEach(ff, field => field.validator = validator.value[field.name])
  return ff;
})

const isSelect = (field : any) => field.type === 'select'
const isTextArea = (field : any) => field.type === 'textarea'
const placeholder = (field : any) => defaultTo(field.placeholder, field.label)

const onSubmit = () => emit('submit')
const onInput = (field : string) => emit('input', field)

</script>