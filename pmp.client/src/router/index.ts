import { createRouter, createWebHistory } from 'vue-router'
import CardWorkspace from '../components/CardWorkspace.vue'
import PaletteWorkspace from '../components/PaletteWorkspace.vue'
import HomeView from '../views/HomeView.vue'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/palettes',
      name: 'palettes',
      component: PaletteWorkspace,
    },
    {
      path: '/cards',
      name: 'cards',
      component: CardWorkspace,
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/',
    },
  ],
})
