import { useEffect, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  AiInnovation01Icon,
  ArrowUpRight01Icon,
  GithubIcon,
  Home03Icon,
  Linkedin02Icon,
  NewTwitterIcon,
} from "@hugeicons/core-free-icons"
import { ThemePicker } from "@/components/theme-picker"
import { engineeringWork, experiments, projects, skills } from "@/content"
import "./home.css"

type IconData = typeof Home03Icon
function Icon({ icon, size = 20 }: { icon: IconData; size?: number }) {
  return (
    <HugeiconsIcon
      icon={icon}
      size={size}
      strokeWidth={1.7}
      aria-hidden="true"
    />
  )
}

const indexLinks = [
  { id: "experience", title: "Experience" },
  { id: "engineering", title: "Engineering work" },
  { id: "ai", title: "AI & experiments" },
  { id: "sharing", title: "Sharing" },
  { id: "recognition", title: "Recognition" },
  { id: "work", title: "Projects" },
  { id: "skills", title: "Skills" },
]

export default function App() {
  const [section, setSection] = useState(
    () => window.location.hash.slice(1) || "main"
  )
  useEffect(() => {
    const syncSection = () =>
      setSection(window.location.hash.slice(1) || "main")
    window.addEventListener("hashchange", syncSection)
    return () => window.removeEventListener("hashchange", syncSection)
  }, [])

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <div className="site-layout">
        <aside className="profile-sidebar" aria-label="About Tien">
          <div className="profile-name">
            <a href="#main">Tien Huu Nguyen</a>
            <p className="eyebrow">SOFTWARE ENGINEER · AI &amp; INNOVATION</p>
          </div>
          <div className="profile-photo-frame">
            <img
              className="profile-photo"
              src="/avatar.jpg"
              alt="Tien Huu Nguyen"
              width="256"
              height="256"
              fetchPriority="high"
            />
          </div>
          <p className="profile-summary">
            I build enterprise applications, engineering interfaces, and tools
            for AI-assisted development. Based in Ho Chi Minh City.
          </p>
          <dl className="profile-details">
            <div>
              <dt>SELECTED BUILDS</dt>
              <dd>{String(projects.length).padStart(2, "0")}</dd>
            </div>
            <div>
              <dt>BASED IN</dt>
              <dd>HO CHI MINH CITY</dd>
            </div>
            <div>
              <dt>FOCUS</dt>
              <dd>AI &amp; INNOVATION</dd>
            </div>
          </dl>
          <div className="profile-actions">
            <a className="button button-primary" href="#contact">
              Let’s connect
            </a>
            <a className="button button-outline" href="#work">
              Explore the work
            </a>
            <a
              className="profile-github"
              href="https://github.com/hxutixnnn"
              target="_blank"
              rel="noreferrer"
            >
              FIND ME ON GITHUB ↗
            </a>
            <nav className="social-links" aria-label="Social profiles">
              <a
                href="https://github.com/hxutixnnn"
                target="_blank"
                rel="noreferrer"
                aria-label="GitHub"
                title="GitHub"
              >
                <Icon icon={GithubIcon} size={19} />
              </a>
              <a
                href="https://x.com/hxutixnnn"
                target="_blank"
                rel="noreferrer"
                aria-label="X"
                title="X"
              >
                <Icon icon={NewTwitterIcon} size={19} />
              </a>
              <a
                href="https://www.linkedin.com/in/hxutixnnn"
                target="_blank"
                rel="noreferrer"
                aria-label="LinkedIn"
                title="LinkedIn"
              >
                <Icon icon={Linkedin02Icon} size={19} />
              </a>
            </nav>
            <div className="profile-tools">
              <button
                className="cv-print"
                type="button"
                onClick={() => window.print()}
              >
                Print / save CV <span aria-hidden="true">↗</span>
              </button>
              <ThemePicker className="appearance-button" />
            </div>
          </div>
        </aside>
        <main id="main" className="main-content" tabIndex={-1}>
          <section className="hero" aria-labelledby="hero-title">
            <h1 id="hero-title">
              Interfaces that work.
              <br />
              Tools that help you build.
            </h1>
            <p>
              I’m Tien, a software engineer building enterprise applications,
              engineering interfaces, and tools for AI-assisted development.
            </p>
            <div className="hero-tags" aria-label="Areas of work">
              <span>SOFTWARE ENGINEERING</span>
              <span>REACT + TYPESCRIPT</span>
              <span>AI &amp; INNOVATION</span>
            </div>
            <nav className="page-index" aria-label="Resume sections">
              {indexLinks.map((item) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  aria-current={section === item.id ? "location" : undefined}
                >
                  {item.title}
                </a>
              ))}
            </nav>
            <div className="print-contact">
              <a href="https://nguyenhuutien.com">nguyenhuutien.com</a>
              <a href="https://www.linkedin.com/in/hxutixnnn">
                linkedin.com/in/hxutixnnn
              </a>
              <a href="https://github.com/hxutixnnn">github.com/hxutixnnn</a>
            </div>
          </section>
          <div className="experience-strip">
            <span>CURRENTLY AT</span>
            <a
              href="https://www.strongtie.com/"
              target="_blank"
              rel="noreferrer"
            >
              SIMPSON STRONG-TIE ↗
            </a>
            <span>HO CHI MINH CITY, VIETNAM</span>
          </div>
          <section
            id="experience"
            className="resume-section"
            aria-labelledby="experience-title"
          >
            <div className="section-heading">
              <div>
                <p className="eyebrow">WHERE I WORK</p>
                <h2 id="experience-title">Experience</h2>
              </div>
              <span className="section-number" aria-hidden="true">
                01
              </span>
            </div>
            <article className="experience-entry" aria-labelledby="role-title">
              <div className="timeline-mark" aria-hidden="true" />
              <div className="experience-copy">
                <p className="experience-dates">
                  <time dateTime="2023-05">May 2023</time> — Present
                </p>
                <h3 id="role-title">Senior Software Developer, UI/UX</h3>
                <a
                  className="company-link"
                  href="https://www.strongtie.com/"
                  target="_blank"
                  rel="noreferrer"
                >
                  Simpson Strong-Tie Vietnam
                  <Icon icon={ArrowUpRight01Icon} size={14} />
                </a>
                <p>
                  Building and maintaining enterprise applications and
                  cross-platform engineering interfaces, alongside practical AI
                  exploration and internal knowledge sharing.
                </p>
              </div>
            </article>
          </section>

          <section
            id="engineering"
            className="resume-section"
            aria-labelledby="work-title"
          >
            <div className="section-heading">
              <div>
                <p className="eyebrow">DELIVERED WORK</p>
                <h2 id="work-title">Engineering in practice</h2>
              </div>
              <span className="section-number" aria-hidden="true">
                02
              </span>
            </div>
            <div className="work-list">
              {engineeringWork.map((item, index) => (
                <article
                  className="work-row"
                  key={item.title}
                  aria-labelledby={`work-${index}`}
                >
                  <span className="work-marker" aria-hidden="true">
                    0{index + 1}
                  </span>
                  <div>
                    <h3 id={`work-${index}`}>{item.title}</h3>
                    <p>{item.description}</p>
                    <p className="work-detail">{item.detail}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section
            id="ai"
            className="resume-section"
            aria-labelledby="ai-title"
          >
            <div className="section-heading">
              <div>
                <p className="eyebrow">EVALUATIONS &amp; PROTOTYPES</p>
                <h2 id="ai-title">Applied AI &amp; experiments</h2>
              </div>
              <span className="section-number" aria-hidden="true">
                03
              </span>
            </div>
            <div className="ai-panel">
              <div className="ai-intro">
                <Icon icon={AiInnovation01Icon} size={29} />
                <h3>
                  Practical questions.
                  <br />
                  Hands-on exploration.
                </h3>
                <p>
                  Trying AI in development workflows, including its limitations.
                </p>
              </div>
              <div className="experiment-list">
                {experiments.map((item) => (
                  <article
                    className="experiment"
                    key={item.title}
                    aria-label={item.title}
                  >
                    <span className="stage-label">{item.stage}</span>
                    <h3>{item.title}</h3>
                    <p>{item.description}</p>
                  </article>
                ))}
              </div>
            </div>
          </section>

          <section
            id="sharing"
            className="resume-section"
            aria-labelledby="sharing-title"
          >
            <div className="section-heading">
              <div>
                <p className="eyebrow">GUIDES &amp; PRESENTATION MATERIAL</p>
                <h2 id="sharing-title">Sharing what I learn</h2>
              </div>
              <span className="section-number" aria-hidden="true">
                04
              </span>
            </div>
            <p className="section-description">
              Created practical guides on prompting and MCP tooling. Prepared
              internal presentations and demonstrations on multi-agent
              development workflows.
            </p>
            <ul className="topic-list" aria-label="Sharing topics">
              <li>Prompt design</li>
              <li>MCP tooling</li>
              <li>Multi-agent workflows</li>
            </ul>
          </section>

          <section
            id="recognition"
            className="resume-section"
            aria-labelledby="recognition-title"
          >
            <div className="section-heading">
              <div>
                <p className="eyebrow">BUILDING &amp; EXPERIMENTING</p>
                <h2 id="recognition-title">Recognition</h2>
              </div>
              <span className="section-number" aria-hidden="true">
                05
              </span>
            </div>
            <div className="recognition-list">
              <article
                className="recognition-entry"
                aria-labelledby="codex-award-title"
              >
                <p className="recognition-context">EXTERNAL BUILD EVENT</p>
                <p className="award-result">
                  3rd Prize<span>Engineering Depth track</span>
                </p>
                <h3 id="codex-award-title">Parallel Bug Bounty</h3>
                <p>Solo builder · Weekend Build with Codex</p>
                <p className="award-date">
                  Ho Chi Minh City · <time dateTime="2026-05">May 2026</time>
                </p>
              </article>
              <article
                className="recognition-entry"
                aria-labelledby="internal-award-title"
              >
                <p className="recognition-context">INTERNAL HACKATHON</p>
                <p className="award-result">
                  Winning team<span>Team contribution</span>
                </p>
                <h3 id="internal-award-title">AI-powered camera attendance</h3>
                <p>Member of the winning team in an internal hackathon.</p>
                <p className="award-date">
                  <time dateTime="2023">2023</time>
                </p>
              </article>
            </div>
          </section>

          <section
            id="work"
            className="work-section"
            aria-labelledby="projects-title"
          >
            <span id="lately" className="anchor-alias" aria-hidden="true" />
            <h2 id="projects-title" className="eyebrow section-label">
              Personal projects
            </h2>
            <div className="project-list">
              {projects.map((project) => (
                <a
                  key={project.name}
                  className="project-row"
                  href={project.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  <div className="project-heading">
                    <h3>{project.name}</h3>
                    <div className="project-meta">
                      <span>{project.type}</span>
                      <span className="project-arrow" aria-hidden="true">
                        →
                      </span>
                    </div>
                  </div>
                  <p>{project.description}</p>
                </a>
              ))}
            </div>
          </section>
          <section
            id="about"
            className="about-section"
            aria-labelledby="about-title"
          >
            <h2 id="about-title" className="eyebrow section-label">
              About
            </h2>
            <div className="about-copy">
              <p>
                I’m Tien Huu Nguyen, a software engineer at{" "}
                <a
                  href="https://www.strongtie.com/"
                  target="_blank"
                  rel="noreferrer"
                >
                  Simpson Strong-Tie Vietnam
                </a>{" "}
                in Ho Chi Minh City.
              </p>
              <p>
                My personal projects include Tien UI, Lite Agent Skills, and
                Harness Skills. Explore the work above, see what I’m building on{" "}
                <a
                  href="https://github.com/hxutixnnn"
                  target="_blank"
                  rel="noreferrer"
                >
                  GitHub
                </a>
                , or follow along on{" "}
                <a
                  href="https://x.com/hxutixnnn"
                  target="_blank"
                  rel="noreferrer"
                >
                  X
                </a>
                .
              </p>
            </div>
          </section>
          <div className="personal-note">
            <p>Also a dad &amp; husband. Usually making something.</p>
            <span className="eyebrow">A LITTLE BEYOND THE WORK</span>
          </div>
          <section
            id="skills"
            className="resume-section"
            aria-labelledby="skills-title"
          >
            <div className="section-heading">
              <div>
                <p className="eyebrow">TOOLS &amp; PRACTICE</p>
                <h2 id="skills-title">Skills</h2>
              </div>
              <span className="section-number" aria-hidden="true">
                07
              </span>
            </div>
            <div className="skills-grid">
              {skills.map((group) => (
                <div key={group.title}>
                  <h3>{group.title}</h3>
                  <ul>
                    {group.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>

          <section
            id="contact"
            className="contact-section"
            aria-labelledby="contact-title"
          >
            <span id="connect" className="anchor-alias" aria-hidden="true" />
            <div className="contact-copy">
              <h2 id="contact-title">Let’s connect.</h2>
              <p>
                Find me on LinkedIn, or follow along with what I’m building.
              </p>
            </div>
            <div className="contact-actions">
              <a
                className="button button-primary"
                href="https://www.linkedin.com/in/hxutixnnn"
                target="_blank"
                rel="noreferrer"
              >
                Connect on LinkedIn ↗
              </a>
              <a
                className="button button-outline"
                href="https://x.com/hxutixnnn"
                target="_blank"
                rel="noreferrer"
              >
                Follow on X ↗
              </a>
            </div>
          </section>
          <footer className="site-footer">
            <span>TIEN HUU NGUYEN · SOFTWARE ENGINEER</span>
            <span>
              © 2026 TIEN HUU NGUYEN ·{" "}
              <a
                href="https://github.com/hxutixnnn"
                target="_blank"
                rel="noreferrer"
              >
                GITHUB ↗
              </a>
            </span>
          </footer>
        </main>
      </div>
    </>
  )
}
