import { createMuiTheme, useTheme } from '@material-ui/core/styles'
import Amiri from './../fonts/Amiri/Amiri-Regular.ttf'
import AmiriBold from './../fonts/Amiri/Amiri-Bold.ttf'
import AmiriRegularItalic from './../fonts/Amiri/Amiri-Italic.ttf'
import Roboto from './../fonts/Roboto/Roboto-Regular.ttf'
import RobotoMedium from './../fonts/Roboto/Roboto-Medium.ttf'
import RobotoBold from './../fonts/Roboto/Roboto-Bold.ttf'
import Nastaleeq from './../fonts/Nastaleeq/Nastaleeq.ttf'

let locale = 'en'
if (localStorage.getItem('locale')) {
  locale = localStorage.getItem('locale')
}

document.documentElement.lang = locale

// export const getFontFamily = () => {
//   if (localStorage.getItem('locale')) {
//     locale = localStorage.getItem('locale')
//   }
//   if (locale === 'ar') {
//     fontFamily = 'Amiri, Roboto'
//   } else if (locale === 'ur') {
//     fontFamily = 'Nastaleeq, Roboto'
//   } else {
//     fontFamily = 'Roboto'
//   }
//   return fontFamily
// }

// const amiriRegular = {
//   fontFamily: 'Amiri',
//   fontStyle: 'normal',
//   fontDisplay: 'swap',
//   fontWeight: 300,
//   src: `
//     local('Amiri'),
//     local('Amiri-Regular'),
//     url(${Amiri}) format('truetype')
//   `,
//   unicodeRange: 'U+0600–06FF',
// }

// const nastleeq = {
//   fontFamily: 'Nastaleeq',
//   fontDisplay: 'swap',
//   src: `
//     local('Nastaleeq'),
//     local('Nastaleeq'),
//     url(${Nastaleeq}) format('truetype')
//   `,
//   unicodeRange: 'U+0600-U+06FF, U+0750-U+077F, U+FB50-U+FDFF, U+FE70-U+FEFF',
// }

// const amiriBold = {
//   fontFamily: 'Amiri',
//   fontStyle: 'bold',
//   fontDisplay: 'swap',
//   fontWeight: 700,
//   src: `
//     local('Amiri'),
//     local('Amiri-Bold'),
//     url(${AmiriBold}) format('truetype')
//   `,
//   unicodeRange: 'U+0600–06FF',
// }

// const robotoRegular = {
//   fontFamily: 'Roboto',
//   fontStyle: 'normal',
//   fontDisplay: 'swap',
//   fontWeight: 300,
//   src: `
//     local('Roboto'),
//     local('Roboto-Regular'),
//     url(${Roboto}) format('truetype')
//   `,
// }

// const robotoBold = {
//   fontFamily: 'Roboto',
//   fontStyle: 'bold',
//   fontDisplay: 'swap',
//   fontWeight: 700,
//   src: `
//     local('Roboto'),
//     local('Roboto-Bold'),
//     url(${RobotoBold}) format('truetype')
//   `,
// }

// const robotoMedium = {
//   fontFamily: 'Roboto',
//   fontStyle: 'medium',
//   fontDisplay: 'swap',
//   fontWeight: 500,
//   src: `
//     local('Roboto'),
//     local('Roboto-Medium'),
//     url(${RobotoMedium}) format('truetype')
//   `,
// }

export const theme = createMuiTheme({
  palette: {
    primary: {
      main: '#0cb36d',
      contrastText: '#fff',
    },
    text: {
      primary: '#0d0d0d',
    },
  },
  typography: {
    label: {
      fontSize: '0.8rem',
    },
  },
  overrides: {
    MuiTextField: {
      text: {
        fontSize: '0.8rem',
        fontWeight: '300',
      },
    },
  },
})

export const defaultTheme = createMuiTheme({
  palette: {
    primary: {
      main: '#3f51b5',
    },
    text: {
      primary: '#0d0d0d',
    },
  },
})

export const amiriFont = createMuiTheme({
  palette: {
    primary: {
      main: '#5d78ff',
    },
    secondary: {
      main: '#5d78ff',
    },
    text: {
      primary: '#0d0d0d',
    },
  },
})
