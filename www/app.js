import { domain, clientId, audience } from './env.js'
let user = null
let AuthService = null

if (domain && clientId && audience) {
  // @ts-ignore
  // eslint-disable-next-line no-undef
  AuthService = Auth0Provider.initialize({
    domain,
    clientId,
    audience,
    useRefreshTokens: true,
    onRedirectCallback: appState => {
      window.location.replace(
        appState && appState.targetUrl
          ? appState.targetUrl
          : window.location.pathname
      )
    }
  })
  AuthService.on(AuthService.AUTH_EVENTS.LOADED, () => {
    drawLogin()
  })

  AuthService.on(AuthService.AUTH_EVENTS.AUTHENTICATED, async () => {
    user = AuthService.user
    api.defaults.headers.authorization = AuthService.bearer
    api.interceptors.request.use(refreshAuthToken)
    drawUser()
  })
  // drawLogin()
} else {
  console.warn("No variables set for env.js. Auth Cannot be used")
}

async function refreshAuthToken(config) {
  if (!AuthService.isAuthenticated) { return config }
  const expires = AuthService.identity.exp * 1000
  const expired = expires < Date.now()
  const needsRefresh = expires < Date.now() + (1000 * 60 * 60 * 12)
  if (expired) {
    await AuthService.loginWithPopup()
  } else if (needsRefresh) {
    await AuthService.getTokenSilently()
  }
  api.defaults.headers.authorization = AuthService.bearer
  return config
}

// @ts-ignore
// eslint-disable-next-line no-undef
const api = axios.create({
  baseURL: '',
  timeout: 8000,
  withCredentials: true
})

api.interceptors.request.use(config => config, handleAxiosError)
api.interceptors.response.use(response => response, handleAxiosError)

function handleAxiosError(error) {
  if (error.response) {
    console.warn('[📡 AXIOS_ERROR_RESPONSE_DATA]', error.response.data)
  } else if (error.request) {
    console.warn('[📡 AXIOS_ERROR_NO_RESPONSE]', error.request)
  } else {
    console.warn('[📡 AXIOS_ERROR_INVALID_REQUEST]', error.message)
  }
  return Promise.reject(error)
}

window['login'] = function () {
  AuthService.loginWithRedirect()
}

window['logout'] = function () {
  AuthService.logout()
}

window['copyToken'] = function () {
  window.navigator.clipboard.writeText(AuthService.bearer.slice(7))
  console.log('📋copied Token!');
}

function drawUser() {
  console.log(user);
  document.getElementById('login-button').classList.add('d-none')
  const profileElm = document.getElementById('user-profile')
  profileElm.innerHTML = `
  <div class="profile">
        <img src="${user.picture}" alt="">
        <span>${user.name}</span>
        <button class="btn btn-outline-danger" onclick="logout()">
          🚪logout
        </button>
        <div class="token" title="copy token" onclick="copyToken()">
          ${AuthService.bearer}
        </div>
      </div>
  `
}

function drawLogin() {
  if (user) return
  document.getElementById('login-button').classList.remove('d-none')
}

