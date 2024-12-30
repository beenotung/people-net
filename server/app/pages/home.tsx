import { o } from '../jsx/jsx.js'
import { prerender } from '../jsx/html.js'
import SourceCode from '../components/source-code.js'
import { ResolvedPageRoute, Routes } from '../routes.js'
import { title } from '../../config.js'
import Style from '../components/style.js'
import { Locale, LocaleVariants } from '../components/locale.js'
import { Link } from '../components/router.js'
import { proxy } from '../../../db/proxy.js'

// Calling <Component/> will transform the JSX into AST for each rendering.
// You can reuse a pre-compute AST like `let component = <Component/>`.

// If the expression is static (not depending on the render Context),
// you don't have to wrap it by a function at all.

let style = Style(/* css */ `
`)

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
              <Link href="/people">explore</Link>
            </li>
            <li hidden>
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

let home = (
  <>
    {style}
    {content}
  </>
)



let route: LocaleVariants<ResolvedPageRoute> = {
  en: {
    title: title('Home'),
    description:
      'Getting Started with ts-liveview - a server-side rendering realtime webapp framework with progressive enhancement',
    node: prerender(home, { language: 'en' }),
  },
  zh_hk: {
    title: title('主頁'),
    description:
      '開始使用 ts-liveview - 一個具有漸進增強功能的伺服器端渲染即時網頁應用框架',
    node: prerender(home, { language: 'zh_hk' }),
  },
  zh_cn: {
    title: title('主页'),
    description:
      '开始使用 ts-liveview - 一个具有渐进增强功能的服务器端渲染即时网页应用框架',
    node: prerender(home, { language: 'zh_cn' }),
  },
}


let routes = {
  '/': {
    menuText: <Locale en="Home" zh_hk="主頁" zh_cn="主页" />,
    resolve(context) {
      return Locale(route, context)
    },
  },
} satisfies Routes

export default { routes }
