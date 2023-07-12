
import { maxLength, helpers, numeric, alpha, alphaNum } from '@vuelidate/validators'

export const Rules = {
  first: {
    alpha,
    maxLength: helpers.withMessage('First name must be less than 50 characters', maxLength(50))
  },
  last: {
    alpha,
    maxLength: helpers.withMessage('Last name must be less than 50 characters', maxLength(50))
  },
  company: {
    alphaNum: helpers.regex(/^[a-zA-Z0-9\s.&!]*$/),
    maxLength: helpers.withMessage('Company name must be less than 50 characters', maxLength(50))
  },
  phone: {
    numeric: helpers.withMessage('Phone number must contain only numbers', numeric),
    maxLength: helpers.withMessage('Phone number must be less than 11 numbers', maxLength(11))
  },
  street: {
    alphaNum: helpers.regex(/^[a-zA-Z0-9\s&]*$/),
    maxLength: helpers.withMessage('Street name must be less than 50 characters', maxLength(50))
  },
  city: {
    alphaNum,
    maxLength: helpers.withMessage('City name must be less than 50 characters', maxLength(50))
  },
  state: {
    alpha,
    maxLength: helpers.withMessage('State code is invalid', maxLength(2))
  },
  zip: {
    numeric,
    maxLength: helpers.withMessage('Zip code must be exactly 5 numbers', maxLength(5))
  }
}


export const FormSchema = {
  id: 'profile-edit-form',
  fields: [
    {
      label: 'First',
      name: 'first',
      type: 'text',
      id: 'first-name'
    },
    {
      label: 'Last',
      name: 'last',
      type: 'text',
      id: 'last-name'
    },
    {
      label: 'Company',
      name: 'company',
      type: 'text',
      id: 'company'
    },
    {
      label: 'Phone',
      name: 'phone',
      type: 'text',
      id: 'phone'
    },
    {
      label: 'Street',
      name: 'street',
      type: 'text',
      id: 'street'
    },
    {
      label: 'City',
      name: 'city',
      type: 'text',
      id: 'city'
    },
    {
      label: 'State',
      name: 'state',
      type: 'select',
      id: 'state',
      options: [
        {
          'label':'Select State',
          'value': ''
        },
        {
          "label": "Alabama",
          "value": "AL"
        },
        {
          "label": "Alaska",
          "value": "AK"
        },
        {
          "label": "Arizona",
          "value": "AZ"
        },
        {
          "label": "Arkansas",
          "value": "AR"
        },
        {
          "label": "California",
          "value": "CA"
        },
        {
          "label": "Colorado",
          "value": "CO"
        },
        {
          "label": "Connecticut",
          "value": "CT"
        },
        {
          "label": "Delaware",
          "value": "DE"
        },
        {
          "label": "District Of Columbia",
          "value": "DC"
        },
        {
          "label": "Florida",
          "value": "FL"
        },
        {
          "label": "Georgia",
          "value": "GA"
        },
        {
          "label": "Guam",
          "value": "GU"
        },
        {
          "label": "Hawaii",
          "value": "HI"
        },
        {
          "label": "Idaho",
          "value": "ID"
        },
        {
          "label": "Illinois",
          "value": "IL"
        },
        {
          "label": "Indiana",
          "value": "IN"
        },
        {
          "label": "Iowa",
          "value": "IA"
        },
        {
          "label": "Kansas",
          "value": "KS"
        },
        {
          "label": "Kentucky",
          "value": "KY"
        },
        {
          "label": "Louisiana",
          "value": "LA"
        },
        {
          "label": "Maine",
          "value": "ME"
        },
        {
          "label": "Maryland",
          "value": "MD"
        },
        {
          "label": "Massachusetts",
          "value": "MA"
        },
        {
          "label": "Michigan",
          "value": "MI"
        },
        {
          "label": "Minnesota",
          "value": "MN"
        },
        {
          "label": "Mississippi",
          "value": "MS"
        },
        {
          "label": "Missouri",
          "value": "MO"
        },
        {
          "label": "Montana",
          "value": "MT"
        },
        {
          "label": "Nebraska",
          "value": "NE"
        },
        {
          "label": "Nevada",
          "value": "NV"
        },
        {
          "label": "New Hampshire",
          "value": "NH"
        },
        {
          "label": "New Jersey",
          "value": "NJ"
        },
        {
          "label": "New Mexico",
          "value": "NM"
        },
        {
          "label": "New York",
          "value": "NY"
        },
        {
          "label": "North Carolina",
          "value": "NC"
        },
        {
          "label": "North Dakota",
          "value": "ND"
        },
        {
          "label": "Ohio",
          "value": "OH"
        },
        {
          "label": "Oklahoma",
          "value": "OK"
        },
        {
          "label": "Oregon",
          "value": "OR"
        },
        {
          "label": "Pennsylvania",
          "value": "PA"
        },
        {
          "label": "Puerto Rico",
          "value": "PR"
        },
        {
          "label": "Rhode Island",
          "value": "RI"
        },
        {
          "label": "South Carolina",
          "value": "SC"
        },
        {
          "label": "South Dakota",
          "value": "SD"
        },
        {
          "label": "Tennessee",
          "value": "TN"
        },
        {
          "label": "Texas",
          "value": "TX"
        },
        {
          "label": "Utah",
          "value": "UT"
        },
        {
          "label": "Vermont",
          "value": "VT"
        },
        {
          "label": "Virginia",
          "value": "VA"
        },
        {
          "label": "Washington",
          "value": "WA"
        },
        {
          "label": "West Virginia",
          "value": "WV"
        },
        {
          "label": "Wisconsin",
          "value": "WI"
        },
        {
          "label": "Wyoming",
          "value": "WY"
        }
      ]
    },
    {
      label: 'Zip',
      name: 'zip',
      type: 'text',
      id: 'zip'
    }
  ]
}