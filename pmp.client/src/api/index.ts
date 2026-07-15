import { authorizedFetch } from '../auth'
import { AuthClient, WeatherForecastClient } from './generated/api-client'

const authorizedHttp = {
  fetch: authorizedFetch,
}

export const authApi = new AuthClient()
export const weatherForecastApi = new WeatherForecastClient('', authorizedHttp)

export * from './generated/api-client'
