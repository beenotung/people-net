import { config as loadEnv } from 'dotenv'
import { populateEnv } from 'populate-env'
import { cwd } from 'process'

loadEnv()

let env = {
  NODE_ENV: 'development',
  PORT: 8100,
  COOKIE_SECRET: '',
  EPOCH: 1, // to distinct initial run or restart in serve mode
  UPLOAD_DIR: 'uploads',
  EMAIL_SERVICE: 'google',
  EMAIL_HOST: 'smtp.gmail.com',
  EMAIL_PORT: 587,
  EMAIL_USER: '',
  EMAIL_PASSWORD: '',
  ORIGIN: '',
}
applyDefaultEnv()

function applyDefaultEnv() {
  if (process.env.NODE_ENV === 'production') return
  let PORT = process.env.PORT || env.PORT
  env.COOKIE_SECRET ||= process.env.COOKIE_SECRET || cwd()
  env.EMAIL_USER ||= process.env.EMAIL_USER || 'skip'
  env.EMAIL_PASSWORD ||= process.env.EMAIL_PASSWORD || 'skip'
  env.ORIGIN ||= process.env.ORIGIN || 'http://localhost:' + PORT
}

populateEnv(env, { mode: 'halt' })

let production = env.NODE_ENV === 'production'
let development = env.NODE_ENV === 'development'

function fixEpoch() {
  // workaround of initial build twice since esbuild v0.17
  if (env.EPOCH >= 2) {
    return env.EPOCH - 1
  }
  return env.EPOCH
}

let epoch = fixEpoch()

export enum LayoutType {
  navbar = 'navbar',
  sidebar = 'sidebar',
  ionic = 'ionic',
}

export let config = {
  production,
  development,
  minify: production,
  site_name: 'People Net',
  short_site_name: 'people-net',
  site_description: 'Connect with network of people sharing similar values',
  setup_robots_txt: false,
  epoch,
  auto_open: !production && development && epoch === 1,
  client_target: 'es2020',
  layout_type: LayoutType.navbar,
  use_social_login: false,
}

const titleSuffix = ' | ' + config.site_name

export function title(page: string) {
  return page + titleSuffix
}

export let apiEndpointTitle = title('API Endpoint')
