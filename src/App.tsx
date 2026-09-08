import { useState } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  Home03Icon,
  CodeSquareIcon,
  ArrowUpRight01Icon,
  GithubIcon,
  NewTwitterIcon,
  Linkedin02Icon,
  Location01Icon,
  SourceCodeIcon,
  SlidersHorizontalIcon,
} from '@hugeicons/core-free-icons'
import { ActionButton } from '@/components/tien/action-button'
import { SimpleTooltip } from '@/components/tien/simple-tooltip'
import { ThemePicker } from '@/components/theme-picker'
import './home.css'

type IconData = typeof Home03Icon
function Icon({ icon, size = 20 }: { icon: IconData; size?: number }) {
  return <HugeiconsIcon icon={icon} size={size} strokeWidth={1.7} aria-hidden="true" />
}

const projects = [
  { name: 'Tien UI', description: 'My React components and defaults.', url: 'https://ui.nguyenhuutien.com', type: 'UI library', icon: null },
  { name: 'Lite Agent Skills', description: 'Coding workflows that use less context.', url: 'https://github.com/hxutixnnn/lite-agent-skills', type: 'Agent tools', icon: SourceCodeIcon },
  { name: 'Harness Skills', description: 'Better ways to work with coding agents.', url: 'https://github.com/hxutixnnn/harness-skills', type: 'Agent tools', icon: SlidersHorizontalIcon },
]

export default function App() {
  const [section, setSection] = useState(() => window.location.hash.slice(1) || 'about')
  return (
    <>
      <a className="skip-link" href="#about">Skip to content</a>
      <div className="ambient-grid" aria-hidden="true" />
      <nav className="floating-rail" aria-label="Personal site navigation">
        <a className="rail-monogram" href="#about" aria-label="Tien, back to introduction" onClick={() => setSection('about')}>t<span>.</span></a>
        <div className="rail-divider" />
        {[
          { id: 'about', title: 'About me', icon: Home03Icon },
          { id: 'lately', title: 'What I’m making', icon: CodeSquareIcon },
          { id: 'connect', title: 'Connect on LinkedIn', icon: Linkedin02Icon },
        ].map(item => (
          <SimpleTooltip key={item.id} content={item.title} side="right">
            <a className={`rail-button ${section === item.id ? 'is-current' : ''}`} href={`#${item.id}`} aria-label={item.title} aria-current={section === item.id ? 'location' : undefined} onClick={() => setSection(item.id)}>
              <Icon icon={item.icon} />
            </a>
          </SimpleTooltip>
        ))}
        <div className="rail-divider" />
        <SimpleTooltip content="GitHub" side="right"><a className="rail-button" href="https://github.com/hxutixnnn" target="_blank" rel="noreferrer" aria-label="GitHub profile"><Icon icon={GithubIcon}/></a></SimpleTooltip>
        <ThemePicker />
      </nav>

      <div className="page-shell">
        <header className="masthead">
          <a href="#about" className="nameplate">TIEN HUU NGUYEN<span className="nameplate-dot" /></a>
          <span className="location"><Icon icon={Location01Icon} size={14}/>Ho Chi Minh City, VN</span>
        </header>

        <main>
          <section id="about" className="intro" aria-labelledby="intro-title">
            <div className="intro-heading">
              <div className="portrait-frame"><img src="/avatar.jpg" alt="Tien Huu Nguyen" width="88" height="88" fetchPriority="high" /><span className="portrait-spark" aria-hidden="true">✳</span></div>
              <div><p className="intro-kicker">A LITTLE ABOUT ME</p><h1 id="intro-title">Hi, I’m <span>Tien.</span></h1></div>
            </div>
            <p className="bio">Senior UX Engineer at <a href="https://www.strongtie.com/" target="_blank" rel="noreferrer">Simpson Strong-Tie<Icon icon={ArrowUpRight01Icon} size={15}/></a>.<br className="desktop-break"/> I build interfaces and tools for AI coding agents.</p>
            <p className="personal-note">Also a dad &amp; husband. Usually making something.</p>
            <div id="connect" className="contact-actions">
              <ActionButton className="connect-button" size="lg" nativeButton={false} render={<a href="https://www.linkedin.com/in/hxutixnnn" target="_blank" rel="noreferrer" />} trailingIcon={<Icon icon={ArrowUpRight01Icon} size={18}/>}>Let’s connect</ActionButton>
              <a className="follow-link" href="https://x.com/hxutixnnn" target="_blank" rel="noreferrer"><Icon icon={NewTwitterIcon} size={17}/>Follow along<Icon icon={ArrowUpRight01Icon} size={14}/></a>
            </div>
          </section>

          <section id="lately" className="lately" aria-labelledby="lately-title">
            <div className="section-heading"><h2 id="lately-title">Lately</h2><span>A few things I’m building</span></div>
            <div className="project-list">
              {projects.map((project, index) => (
                <a key={project.name} className="project-row" href={project.url} target="_blank" rel="noreferrer">
                  <span className={`project-symbol project-symbol-${index}`}>{project.icon ? <Icon icon={project.icon} size={22}/> : <span className="tien-ui-mark">t<span>.</span></span>}</span>
                  <span className="project-copy"><span className="project-name">{project.name}</span><span className="project-description">{project.description}</span></span>
                  <span className="project-type">{project.type}</span>
                  <span className="project-arrow"><Icon icon={ArrowUpRight01Icon} size={18}/></span>
                </a>
              ))}
            </div>
          </section>
        </main>

        <footer><span>Small corner of the internet. <span className="footer-wave" aria-hidden="true">✳</span></span><a href="https://ui.nguyenhuutien.com" target="_blank" rel="noreferrer">Made with Tien UI<Icon icon={ArrowUpRight01Icon} size={13}/></a></footer>
      </div>
    </>
  )
}
