import i18n from 'i18next'
import {initReactI18next} from 'react-i18next'

import en from './locale/en.json'
import th from './locale/th.json'
import cockney from './locale/cockney.json'

i18n.use(initReactI18next).init({
  interpolation: {
    prefix: '{',
    suffix: '}',
  },
  resources: {
    en: {
      translation: en,
    },
    th: {
      translation: th,
    },
    cockney: {
      translation: cockney,
    },
  },
  lng: 'en',
  fallbackLng: 'en',
  compatibilityJSON: 'v3',
})

export default i18n
