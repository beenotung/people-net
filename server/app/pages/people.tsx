import { o } from '../jsx/jsx.js'
import { Routes } from '../routes.js'
import { title } from '../../config.js'
import Style from '../components/style.js'
import { Context } from '../context.js'
import { mapArray } from '../components/fragment.js'
import { Link } from '../components/router.js'
import { getAuthUser } from '../auth/user.js'
import { proxy } from '../../../db/proxy.js'
import { getUserPreference } from './vote.js'
import { toLocaleDateTimeString } from '../components/datetime.js'
import { fromSqliteTimestamp } from 'better-sqlite3-proxy'

let pageTitle = 'People'

let style = Style(/* css */ `
#People {

}
`)

let page = (
  <>
    {style}
    <div id="People">
      <h1>{pageTitle}</h1>
      <Main />
    </div>
  </>
)

let items = [
  { title: 'Android', slug: 'md' },
  { title: 'iOS', slug: 'ios' },
]

function Main(attrs: {}, context: Context) {
  let user = getAuthUser(context)

  if (user?.id != 1) {
    return (
      <>
        <p>This page is only available for admin at the moment.</p>
        <p>
          <Link href="/login">Login</Link> to access the list.
        </p>
      </>
    )
  }

  return (
    <>
      <ol>
        {mapArray(proxy.user, user => {
          let preference = getUserPreference(user)
          if (preference.type === 'error') return
          let topConcepts = preference.topConcepts
          if (topConcepts.length == 0) return
          return (
            <li>
              <div class="d-flex" style="gap: 1rem;">
                <div>{user.username || user.email?.split('@')[0]}</div>
                <div>
                  (
                  {toLocaleDateTimeString(
                    fromSqliteTimestamp((user as any).created_at),
                    context,
                  )}
                  )
                </div>
              </div>
              <ol>
                {mapArray(topConcepts, concept => (
                  <li>{concept.name}</li>
                ))}
              </ol>
            </li>
          )
        })}
      </ol>
    </>
  )
}

let routes: Routes = {
  '/people': {
    title: title(pageTitle),
    description: 'TODO',
    menuText: pageTitle,
    node: page,
  },
}

export default { routes }
