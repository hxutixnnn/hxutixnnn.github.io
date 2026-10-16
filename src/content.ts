export const engineeringWork = [
  {
    title: "Enterprise applications",
    description:
      "Built and maintained web applications across service, resource, time, and reporting workflows with React, Next.js, TypeScript, and Nx.",
    detail: "Web applications · Business workflows",
  },
  {
    title: "UI foundations & delivery",
    description:
      "Delivered reusable UI components, form builders, rich-text editing, and API integrations. Contributed to coding standards, release workflows, and automated tests.",
    detail: "Reusable interfaces · Integration · Engineering practice",
  },
  {
    title: "Cross-platform engineering tools",
    description:
      "Developed engineering software interfaces spanning web and desktop, including file imports, engineering inputs, visualizations, and report integration.",
    detail: "Web & desktop · Engineering interfaces",
  },
]

type Experiment = {
  stage: "Evaluation" | "Exploration"
  title: string
  description: string
}

export const experiments = [
  {
    stage: "Evaluation",
    title: "AI-assisted development",
    description:
      "Evaluated coding assistants and practical workflows for AI-assisted software development.",
  },
  {
    stage: "Exploration",
    title: "OCR-enabled interfaces",
    description: "Explored interface workflows that use OCR capabilities.",
  },
  {
    stage: "Exploration",
    title: "Image-to-structured-HTML",
    description:
      "Tested image-to-structured-HTML prototypes and documented where the approach failed.",
  },
] satisfies Experiment[]

export const projects = [
  {
    name: "Tien UI",
    description:
      "My React components and defaults. A home for the interface pieces I use to build, from buttons and tooltips to appearance controls.",
    url: "https://ui.nguyenhuutien.com",
    type: "UI library",
  },
  {
    name: "Lite Agent Skills",
    description:
      "Coding workflows that use less context. Skills for working with AI coding agents, with instructions focused on the task at hand.",
    url: "https://github.com/hxutixnnn/lite-agent-skills",
    type: "Agent tools",
  },
  {
    name: "Harness Skills",
    description:
      "Better ways to work with coding agents. A collection of skills for the workflows around building software with AI.",
    url: "https://github.com/hxutixnnn/harness-skills",
    type: "Agent tools",
  },
]

export const skills = [
  {
    title: "Software engineering",
    items: ["React", "Next.js", "TypeScript", "Nx", "Automated testing"],
  },
  {
    title: "Interfaces & integration",
    items: [
      "Reusable UI",
      "Forms & rich-text editors",
      "API integration",
      "Visualization",
      "Web & desktop interfaces",
    ],
  },
  {
    title: "AI & development workflows",
    items: [
      "Coding assistants",
      "Prompt design",
      "MCP tooling",
      "Multi-agent workflows",
    ],
  },
]
