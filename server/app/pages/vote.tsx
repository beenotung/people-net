import { o } from '../jsx/jsx.js'
import { Routes } from '../routes.js'
import { apiEndpointTitle, title } from '../../config.js'
import Style from '../components/style.js'
import { Context, DynamicContext, getContextFormBody } from '../context.js'
import { mapArray } from '../components/fragment.js'
import { object, string } from 'cast.ts'
import { Link, Redirect } from '../components/router.js'
import { renderError } from '../components/error.js'
import { getAuthUser } from '../auth/user.js'
import { Concept, User, proxy } from '../../../db/proxy.js'
import { sortTopN } from 'graph-sort'
import { count, filter, find } from 'better-sqlite3-proxy'
import { db } from '../../../db/db.js'

let pageTitle = 'Vote'
let addPageTitle = 'Add Vote'

let style = Style(/* css */ `
#Vote {

}
.compare--concept {
  display: inline-flex;
  border: 1px solid #0000ff88;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
}
`)

let page = (
  <>
    {style}
    <div id="Vote">
      <h1>{pageTitle}</h1>
      <Main />
    </div>
  </>
)

let items = [
  { title: 'Android', slug: 'md' },
  { title: 'iOS', slug: 'ios' },
]

let select_concept_compare = db
  .prepare(
    /* sql */ `
select id
from concept_compare
where user_id = :user_id
  and (
    (small_id = :concept_id_1 and large_id = :concept_id_2)
    or 
    (small_id = :concept_id_2 and large_id = :concept_id_1)
  )
`,
  )
  .pluck()

class ConceptNotCompared extends Error {
  constructor(public concepts: Concept[]) {
    super('concept not compared')
  }
}

function getUserPreference(user: User) {
  try {
    let topN = Math.ceil(proxy.concept.length * 0.2)
    let topConcepts = sortTopN(
      (a, b) => {
        let id = select_concept_compare.get({
          user_id: user.id,
          concept_id_1: a.id,
          concept_id_2: b.id,
        }) as number
        if (!id) {
          throw new ConceptNotCompared([a, b])
        }
        let row = proxy.concept_compare[id]
        return row.small_id == a.id
          ? { small: a, large: b }
          : { small: b, large: a }
      },
      topN,
      proxy.concept.map(row => row),
    )
    return {
      type: 'list' as const,
      concepts: topConcepts,
    }
  } catch (error) {
    if (error instanceof ConceptNotCompared) {
      return {
        type: 'compare' as const,
        concepts: error.concepts,
      }
    }
    return {
      type: 'error' as const,
      error,
    }
  }
}

function Main(attrs: {}, context: Context) {
  let user = getAuthUser(context)
  if (!user) {
    return (
      <p>
        You can vote after <Link href="/login">login</Link>.
      </p>
    )
  }
  let userPreference = getUserPreference(user)
  let votes = count(proxy.concept_compare, { user_id: user.id! })
  switch (userPreference.type) {
    case 'error':
      return renderError(userPreference.error, context)
    case 'compare':
      return (
        <>
          <h2>Which concept below do you value more?</h2>
          {mapArray(
            userPreference.concepts,
            concept => (
              <button
                class="compare--concept"
                onclick={`emit('/vote/submit',${concept.id},${userPreference.concepts?.map(concept => concept.id)})`}
              >
                {concept.name}
              </button>
            ),
            ' vs ',
          )}
          <p>progress: done {votes} votes</p>
        </>
      )
    case 'list':
  }
  return (
    <>
      <ul>
        {mapArray(items, item => (
          <li>
            {item.title} ({item.slug})
          </li>
        ))}
      </ul>
      {user ? (
        <Link href="/vote/add">
          <button>{addPageTitle}</button>
        </Link>
      ) : (
        <p>
          You can add vote after <Link href="/register">register</Link>.
        </p>
      )}
    </>
  )
}

let addPage = (
  <div id="AddVote">
    {Style(/* css */ `
#AddVote .field {
  margin-block-end: 1rem;
}
#AddVote .field label input {
  display: block;
  margin-block-start: 0.25rem;
}
#AddVote .field label .hint {
  display: block;
  margin-block-start: 0.25rem;
}
`)}
    <h1>{addPageTitle}</h1>
    <form method="POST" action="/vote/add/submit" onsubmit="emitForm(event)">
      <div class="field">
        <label>
          Title*:
          <input name="title" required minlength="3" maxlength="50" />
          <p class="hint">(3-50 characters)</p>
        </label>
      </div>
      <div class="field">
        <label>
          Slug*:
          <input
            name="slug"
            required
            placeholder="should be unique"
            pattern="(\w|-|\.){1,32}"
          />
          <p class="hint">
            (1-32 characters of: <code>a-z A-Z 0-9 - _ .</code>)
          </p>
        </label>
      </div>
      <input type="submit" value="Submit" />
      <p>
        Remark:
        <br />
        *: mandatory fields
      </p>
    </form>
  </div>
)

function AddPage(attrs: {}, context: DynamicContext) {
  let user = getAuthUser(context)
  if (!user) return <Redirect href="/login" />
  return addPage
}

let submitParser = object({
  title: string({ minLength: 3, maxLength: 50 }),
  slug: string({ match: /^[\w-]{1,32}$/ }),
})

function Submit(attrs: {}, context: DynamicContext) {
  try {
    let user = getAuthUser(context)
    if (!user) throw 'You must be logged in to submit ' + pageTitle
    let body = getContextFormBody(context)
    let input = submitParser.parse(body)
    let id = items.push({
      title: input.title,
      slug: input.slug,
    })
    return <Redirect href={`/vote/result?id=${id}`} />
  } catch (error) {
    return (
      <Redirect
        href={'/vote/result?' + new URLSearchParams({ error: String(error) })}
      />
    )
  }
}

function SubmitResult(attrs: {}, context: DynamicContext) {
  let params = new URLSearchParams(context.routerMatch?.search)
  let error = params.get('error')
  let id = params.get('id')
  return (
    <div>
      {error ? (
        renderError(error, context)
      ) : (
        <>
          <p>Your submission is received (#{id}).</p>
          <p>
            Back to <Link href="/vote">{pageTitle}</Link>
          </p>
        </>
      )}
    </div>
  )
}

let routes: Routes = {
  '/vote': {
    title: title(pageTitle),
    description: 'TODO',
    menuText: pageTitle,
    node: page,
  },
  '/vote/add': {
    title: title(addPageTitle),
    description: 'TODO',
    node: <AddPage />,
    streaming: false,
  },
  '/vote/add/submit': {
    title: apiEndpointTitle,
    description: 'TODO',
    node: <Submit />,
    streaming: false,
  },
  '/vote/result': {
    title: apiEndpointTitle,
    description: 'TODO',
    node: <SubmitResult />,
    streaming: false,
  },
}

export default { routes }
