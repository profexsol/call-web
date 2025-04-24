import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import Backend from 'i18next-http-backend'; //This package is using to separate all translation files for different locales and load only the translation file of user selected locale(language) not all translation files
import LanguageDetector from 'i18next-browser-languagedetector'; //used to detect user language in the browser
// import { TRANSLATION_EN } from '../';
// import { TRANSLATION_AR } from '../locales/ar/translation';
// import { TRANSLATION_JA } from '../locales/ja/translation';
// import { TRANSLATION_KO } from '../locales/ko/translation';

let locale = 'en'
if (localStorage.getItem('locale')) {
    locale = localStorage.getItem('locale')
}

document.documentElement.lang = locale

i18n
  .use(Backend) // passes i18n down to react-i18next
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    supportedLngs: ['en','ar','ja','ko'],
    lng: locale,
    fallbackLng: "en",
    detection: {
        // order and from where user language should be detected
        order: ['htmlTag', 'cookie', 'localStorage', 'path'],
        caches: ['cookie']
      },
    interpolation: {
      escapeValue: false, // react already safes from xss
    },
      resources: {
        // en: {
        //     translation: TRANSLATION_EN
        // },
        // ar: {
        //     translation: TRANSLATION_AR
        // },
        // ja: {
        //     translation: TRANSLATION_JA
        // },
        // ko: {
        //     translation: TRANSLATION_KO
        // }
  },
    react: {
      useSuspense: true, //   <---- this will do the magic
    },
  })

export default i18n
