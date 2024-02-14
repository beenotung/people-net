import { o } from '../jsx/jsx.js'
import { prerender } from '../jsx/html.js'
import SourceCode from '../components/source-code.js'
import { mapArray } from '../components/fragment.js'
import { proxy } from '../../../db/proxy.js'
import { Link } from '../components/router.js'

// Calling <Component/> will transform the JSX into AST for each rendering.
// You can reuse a pre-compute AST like `let component = <Component/>`.

// If the expression is static (not depending on the render Context),
// you don't have to wrap it by a function at all.

let content = (
  <div id="home">
    {
      // And it can be pre-rendered into html as well
      prerender(
        <>
          <h1>Home Page</h1>
          <p>Match your partner sharing similar values.</p>
          <h2>Get started</h2>
          <ul>
            <li>
              <Link href="/vote">vote</Link>
            </li>
            <li>
              <Link href="/match">match</Link>
            </li>
          </ul>
          <h2>Stats</h2>
        </>,
      )
    }
    <Stats />
    {prerender(<SourceCode page="home.tsx" />)}
  </div>
)

function Stats() {
  return (
    <p>
      <b>{proxy.user.length} users</b> has made{' '}
      <b>{proxy.concept_compare.length} votes</b> on{' '}
      <b>{proxy.concept.length} concepts</b>.
    </p>
  )
}

export default content
