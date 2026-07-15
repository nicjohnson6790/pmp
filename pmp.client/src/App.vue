<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { authState, initializeAuth, isAuthenticated, login, logout, register } from './auth'

const mode = ref<'login' | 'register'>('login')
const isBusy = ref(false)
const errorMessage = ref('')

const form = reactive({
  userName: '',
  password: '',
  email: '',
})

const passwordHelp = computed(() => {
  const remaining = 12 - form.password.length
  return remaining > 0 ? `${remaining} more characters needed` : 'Password length looks good'
})

onMounted(() => {
  initializeAuth().catch(() => {
    errorMessage.value = 'Your saved session could not be restored.'
  })
})

async function submitAuth() {
  errorMessage.value = ''
  isBusy.value = true

  try {
    if (mode.value === 'login') {
      await login(form.userName.trim(), form.password)
    } else {
      await register(form.userName.trim(), form.password, form.email)
      mode.value = 'login'
    }

    form.password = ''
  } catch {
    errorMessage.value =
      mode.value === 'login'
        ? 'We could not sign you in with those credentials.'
        : 'Registration failed. Check the username and password length, then try again.'
  } finally {
    isBusy.value = false
  }
}

function switchMode(nextMode: 'login' | 'register') {
  mode.value = nextMode
  errorMessage.value = ''
}

async function logoutToLogin() {
  await logout()
  switchMode('login')
}
</script>

<template>
  <div v-if="!authState.initialized" class="loading-screen">
    <span>Loading...</span>
  </div>

  <div v-else-if="!isAuthenticated" class="auth-page">
    <div class="auth-visual" aria-hidden="true"></div>
    <div class="auth-backdrop"></div>

    <section class="auth-modal" aria-labelledby="auth-title">
      <div class="brand-mark">PMP</div>
      <h1 id="auth-title">{{ mode === 'login' ? 'Welcome back' : 'Create your account' }}</h1>
      <p v-if="mode === 'login'" class="muted">Sign in to continue to your workspace.</p>
      <p v-else class="muted">
        Email is optional, but without one you could lose access to your account. You can add it later.
      </p>

      <form class="auth-form" @submit.prevent="submitAuth">
        <label>
          <span>Username</span>
          <input v-model="form.userName" name="username" autocomplete="username" required />
        </label>

        <label>
          <span>Password</span>
          <input
            v-model="form.password"
            name="password"
            type="password"
            autocomplete="current-password"
            minlength="12"
            required
          />
          <small>{{ passwordHelp }}</small>
        </label>

        <label v-if="mode === 'register'">
          <span>Email</span>
          <input v-model="form.email" name="email" type="email" autocomplete="email" />
        </label>

        <p v-if="errorMessage" class="error-message" role="alert">{{ errorMessage }}</p>

        <button class="primary-button" type="submit" :disabled="isBusy">
          {{ isBusy ? 'Please wait' : mode === 'login' ? 'Log in' : 'Register' }}
        </button>
      </form>

      <button v-if="mode === 'login'" class="link-button" type="button" @click="switchMode('register')">
        Need an account? Register
      </button>
      <button v-else class="link-button" type="button" @click="switchMode('login')">
        Already have an account? Log in
      </button>
    </section>
  </div>

  <div v-else class="app-shell">
    <header class="top-header">
      <a class="header-logo" href="/" aria-label="Home">PMP</a>
      <div class="user-area">
        <span>{{ authState.userName }}</span>
        <button class="secondary-button" type="button" @click="logoutToLogin">Log out</button>
      </div>
    </header>

    <aside class="side-nav" aria-label="Primary navigation">
      <nav>
        <a class="nav-link active" href="/">Home</a>
      </nav>
    </aside>

    <div class="workspace">
      <main class="content-area">
        <p>Logged in.</p>
      </main>
    </div>
  </div>
</template>
