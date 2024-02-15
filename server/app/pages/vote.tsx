import { o } from '../jsx/jsx.js'
import { Routes } from '../routes.js'
import { apiEndpointTitle, title } from '../../config.js'
import Style from '../components/style.js'
import { Context, DynamicContext, getContextFormBody } from '../context.js'
import { mapArray } from '../components/fragment.js'
import { id, object, string } from 'cast.ts'
import { Link, Redirect } from '../components/router.js'
import { renderError } from '../components/error.js'
import { getAuthUser } from '../auth/user.js'
import { Concept, User, proxy } from '../../../db/proxy.js'
import { CompareResult, benchmarkSorters, sortTopNIter } from 'graph-sort'
import { count, filter, find } from 'better-sqlite3-proxy'
import { db, dbFile } from '../../../db/db.js'
import { toUrl } from '../../url.js'
import { memorize } from '@beenotung/tslib/memorize.js'
import { MessageException } from '../helpers.js'
import { nodeToVNode } from '../jsx/vnode.js'
import { HttpError } from '../../http-error.js'

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
      <div id="VoteMain">
        <Main />
      </div>
    </div>
  </>
)

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

const TopNRate = 0.1

let benchmarkConcepts = memorize(function benchmark(totalCount: number) {
  let topN = Math.ceil(totalCount * TopNRate)
  let [{ Sorter, averageCompareCount }] = benchmarkSorters({ topN, totalCount })
  return { totalCount, topN, Sorter, averageCompareCount }
})

let select_concept_ids = db
  .prepare(
    /* sql */ `
select id
from concept
where id not in (
  select
    concept.id
  from concept
  inner join concept_theme on concept_theme.concept_id = concept.id
  inner join theme on theme.id = concept_theme.theme_id
  where theme.name == 'skip'
)
order by id asc
`,
  )
  .pluck()

function getUserPreference(user: User) {
  let topConcepts: Concept[] = []
  let allConcepts = (select_concept_ids.all() as number[]).map(
    id => proxy.concept[id],
  )
  let benchmarkResult = benchmarkConcepts(allConcepts.length)
  try {
    let sorter = new benchmarkResult.Sorter<Concept>((a, b) => {
      let id = select_concept_compare.get({
        user_id: user.id,
        concept_id_1: a.id,
        concept_id_2: b.id,
      }) as number
      if (!id) {
        throw new ConceptNotCompared(Math.random() < 0.5 ? [a, b] : [b, a])
      }
      let row = proxy.concept_compare[id]
      return row.small_id == a.id
        ? { small: a, large: b }
        : { small: b, large: a }
    })
    sorter.addValues(allConcepts)
    for (let concept of sorter.popTopNIter(benchmarkResult.topN)) {
      topConcepts.push(concept)
    }
    return {
      type: 'list' as const,
      topConcepts,
      benchmarkResult,
    }
  } catch (error) {
    if (error instanceof ConceptNotCompared) {
      return {
        type: 'compare' as const,
        conceptsToCompare: error.concepts,
        topConcepts,
        benchmarkResult,
      }
    }
    return {
      type: 'error' as const,
      error,
    }
  }
}

let undo = (
  <div style="margin-top: 1rem">
    <button onclick="emit('/vote/undo')">undo last vote</button>
  </div>
)

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
  if (userPreference.type == 'error') {
    return renderError(userPreference.error, context)
  }
  let { benchmarkResult, topConcepts } = userPreference
  let {
    topN,
    averageCompareCount,
    totalCount: totalConceptCount,
  } = benchmarkResult
  let votes = count(proxy.concept_compare, { user_id: user.id! })
  let topConceptList =
    topConcepts.length == 0 ? null : (
      <>
        <h3>Top Concepts</h3>
        <ol class="top--list">
          {mapArray(topConcepts, concept => (
            <li class="top--concept">{concept.name}</li>
          ))}
        </ol>
      </>
    )
  switch (userPreference.type) {
    case 'compare':
      return (
        <>
          <h2>Which concept below do you value more?</h2>
          {mapArray(
            userPreference.conceptsToCompare,
            (concept, i, concepts) => {
              let url = toUrl('/vote/submit', {
                small_id: concepts[1 - i].id!,
                large_id: concept.id!,
              })
              return (
                <button class="compare--concept" onclick={`emit('${url}')`}>
                  {concept.name}
                </button>
              )
            },
            ' vs ',
          )}
          {undo}
          <h3>Progress</h3>
          <p>
            ranked top {topConcepts.length}/{totalConceptCount} concepts with{' '}
            {votes} votes
          </p>
          <p>
            goal: to rank top {topN} ({TopNRate * 100}%) concepts
          </p>
          <p>estimated votes needed: {Math.ceil(averageCompareCount)}</p>
          {topConceptList}
        </>
      )
    case 'list':
      return (
        <>
          {topConceptList}
          <p>
            ranked top {topConcepts.length}/{totalConceptCount} concepts
          </p>
          {undo}
        </>
      )
    default:
      return (
        <>
          {renderError(
            'unknown type: ' + (userPreference satisfies never as any).type,
            context,
          )}
        </>
      )
  }
}

let submitParser = object({
  small_id: id(),
  large_id: id(),
})

function Submit(attrs: {}, context: DynamicContext) {
  try {
    let user = getAuthUser(context)
    if (!user)
      throw new HttpError(401, 'You must be logged in to submit ' + pageTitle)
    let input = submitParser.parse(
      Object.fromEntries(new URLSearchParams(context.routerMatch?.search)),
    )
    proxy.concept_compare.push({
      user_id: user.id!,
      small_id: input.small_id,
      large_id: input.large_id,
    })
    if (context.type === 'ws') {
      context.url = '/vote'
      return page
    }
    return <Redirect href={`/vote`} />
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
  return <div>{renderError(error, context)}</div>
}

let delete_last_vote = db.prepare(/* sql */ `
delete from concept_compare
where id in (
  select id from concept_compare
  where user_id = :user_id
  order by id desc
  limit 1
)
`)

function Undo(attrs: {}, context: DynamicContext) {
  try {
    let user = getAuthUser(context)
    if (!user)
      throw new HttpError(
        401,
        'You must be logged in to undo last ' + pageTitle,
      )
    delete_last_vote.run({ user_id: user.id })
    if (context.type === 'ws') {
      context.url = '/vote'
      return page
    }
    return <Redirect href={`/vote`} />
  } catch (error) {
    return (
      <Redirect
        href={'/vote/result?' + new URLSearchParams({ error: String(error) })}
      />
    )
  }
}

let routes: Routes = {
  '/vote': {
    title: title(pageTitle),
    description: 'vote which concepts do you value more',
    menuText: pageTitle,
    node: page,
  },
  '/vote/submit': {
    title: apiEndpointTitle,
    description: 'submit vote',
    node: <Submit />,
    streaming: false,
  },
  '/vote/result': {
    title: apiEndpointTitle,
    description: 'error page of vote submission',
    node: <SubmitResult />,
    streaming: false,
  },
  '/vote/undo': {
    title: apiEndpointTitle,
    description: 'undo last vote',
    node: <Undo />,
    streaming: false,
  },
}

export default { routes }
