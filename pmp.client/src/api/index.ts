import { authorizedFetch } from '../auth'
import { AuthClient, CardsClient, PalettesClient, WeatherForecastClient } from './generated/api-client'

const authorizedHttp = {
  fetch: authorizedFetch,
}

export const authApi = new AuthClient()
export const cardsApi = new CardsClient('', authorizedHttp)
export const palettesApi = new PalettesClient('', authorizedHttp)
export const weatherForecastApi = new WeatherForecastClient('', authorizedHttp)

export * from './generated/api-client'
