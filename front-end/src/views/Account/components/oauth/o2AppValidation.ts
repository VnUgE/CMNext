import { MaybeRef } from 'vue'
import { useVuelidate } from '@vuelidate/core'
import { maxLength, helpers, required } from '@vuelidate/validators'
import { useVuelidateWrapper } from '@vnuge/vnlib.browser'
import { OAuth2Application } from '../../../../store/oauthAppsPlugin'

//Custom alpha numeric regex
const alphaNumRegex = helpers.regex(/^[a-zA-Z0-9_,\s]*$/)

const rules = {
    name: {
        alphaNumSpace: helpers.withMessage("Name contains invalid characters", alphaNumRegex),
        maxLength: helpers.withMessage('App name must be less than 50 characters', maxLength(50)),
        required: helpers.withMessage('Oauth Application name is required', required)
    },
    description: {
        alphaNumSpace: helpers.withMessage("Description contains invalid characters", alphaNumRegex),
        maxLength: helpers.withMessage('Description must be less than 50 characters', maxLength(50))
    },
    permissions: {
        alphaNumSpace: helpers.regex(/^[a-zA-Z0-9_,:\s]*$/),
        maxLength: helpers.withMessage('Permissions must be less than 64 characters', maxLength(64))
    }
}

export interface AppValidator {
    readonly v$: ReturnType<typeof useVuelidate>
    readonly validate: () => Promise<boolean>
    readonly reset: () => void
}

/**
 * Gets the validator for the given application (or new appication) buffer
 * @param buffer The app buffer to validate
 * @returns The validator instance, validate function, and reset function
 */
export const getAppValidator = (buffer: MaybeRef<OAuth2Application>) : AppValidator => {
    //App validator
    const v$ = useVuelidate(rules, buffer)
    //validate wrapper function
    const { validate } = useVuelidateWrapper(v$);
    return { v$, validate, reset: v$.value.$reset };
}