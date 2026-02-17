import { TERMINAL_CONFIG } from "@/lib/terminal-config";

export type VirtualFile = {
  type: "file";
  content: string;
};

export type VirtualDirectory = {
  type: "directory";
  children: Record<string, VirtualNode>;
};

export type VirtualNode = VirtualFile | VirtualDirectory;

export type VfsMutationResult =
  | { ok: true }
  | {
      ok: false;
      reason:
        | "invalid-name"
        | "not-found"
        | "already-exists"
        | "not-directory"
        | "parent-not-directory"
        | "directory-not-empty"
        | "is-directory"
        | "cannot-remove-root";
    };

const readme = [
  "Remington Steele Portfolio Terminal",
  "----------------------------------",
  "Welcome. This shell is a curated interface over portfolio data.",
  "",
  "Try:",
  "  ls",
  "  cd projects",
  "  cat index.txt",
  "  tree",
  "  cat about.txt",
  "  cat contact.txt"
].join("\n");

const contact = [
  "Contact",
  "-------",
  "Phone: 619-635-3351",
  "Email: rsteele2215@gmail.com",
  "Website: https://rvsteele.com",
  "GitHub: https://github.com/remsteele",
  "LinkedIn: https://linkedin.com/in/rvsteele",
  "Location: San Diego, CA"
].join("\n");

const about = [
  "About Me",
  "--------",
  "I am a software engineer who likes building practical systems that hold up in production.",
  "Outside work, I am into climbing, coding side projects, food, skating, lifting at the gym,",
  "video games, and chess."
].join("\n");

export const VFS_ROOT: VirtualDirectory = {
  type: "directory",
  children: {
    home: {
      type: "directory",
      children: {
        remington: {
          type: "directory",
          children: {
            projects: {
              type: "directory",
              children: {
                "index.txt": {
                  type: "file",
                  content: [
                    "Projects Overview",
                    "-----------------",
                    "1. copilotcareer.txt - Production AI platform backend redesign",
                    "2. homelab.txt - Multi-OS infrastructure and systems administration",
                    "3. bubblemachine.txt - Full-stack delivery with Django + Stripe",
                    "",
                    "Use cat <file>.txt to inspect each project"
                  ].join("\n")
                },
                "copilotcareer.txt": {
                  type: "file",
                  content: [
                    "CopilotCareer | June 2024 - Present",
                    "-----------------------------------",
                    "Role: Backend Engineering Lead",
                    "Stack: Go, Python, PostgreSQL, Azure, Apidog",
                    "Highlights:",
                    "- Led backend redesign for a production AI platform",
                    "- Migrated legacy Python services to a concurrent Go backend",
                    "- Reworked PostgreSQL schemas for stronger normalization",
                    "- Designed and documented a consistent versioned REST API"
                  ].join("\n")
                },
                "homelab.txt": {
                  type: "file",
                  content: [
                    "Self-Hosted HomeLab | June 2024 - Present",
                    "------------------------------------------",
                    "Role: Systems Administration Project (Personal)",
                    "Stack: OpenBSD, FreeBSD, AlmaLinux, Ubuntu, OpenIndiana, AIX, Ansible",
                    "Highlights:",
                    "- Operate a multi-VM environment that simulates heterogeneous enterprise systems",
                    "- Built centralized DNS (NSD), LDAP auth, PKI/TLS, and NFS shared services",
                    "- Automated configuration and privilege workflows with Ansible and Vault",
                    "- Run production-style services: GitLab, TLS nginx, Docker apps, logging, backups"
                  ].join("\n")
                },
                "bubblemachine.txt": {
                  type: "file",
                  content: [
                    "bubblemachine.org | April 2025 - September 2025",
                    "-----------------------------------------------",
                    "Role: Software Engineer (SDSU Research Grant Project)",
                    "Stack: React, Django, PostgreSQL, Stripe",
                    "Highlights:",
                    "- Led a 2-engineer team turning a client-only React prototype into production software",
                    "- Built secure backend services with authentication and cloud persistence",
                    "- Implemented subscription billing and access controls with Stripe",
                    "- Extended frontend account flows and cloud-synced features"
                  ].join("\n")
                }
              }
            },
            skills: {
              type: "directory",
              children: {
                "index.txt": {
                  type: "file",
                  content: [
                    "Skills Overview",
                    "---------------",
                    "- Languages: Go, Python, JavaScript, HTML, CSS, SQL",
                    "- Frameworks/Tools: Gin, Django, Docker, Git, Azure, PostgreSQL, GitHub Actions",
                    "- Systems: Unix administration, distributed systems, database theory, networking",
                    "",
                    "See languages.txt, frameworks-tools.txt, and coursework.txt"
                  ].join("\n")
                },
                "languages.txt": {
                  type: "file",
                  content: [
                    "Languages",
                    "---------",
                    "- Go",
                    "- Python",
                    "- JavaScript",
                    "- HTML",
                    "- CSS",
                    "- SQL"
                  ].join("\n")
                },
                "frameworks-tools.txt": {
                  type: "file",
                  content: [
                    "Frameworks & Tools",
                    "------------------",
                    "- Gin",
                    "- Django",
                    "- Docker",
                    "- Git",
                    "- Azure",
                    "- PostgreSQL",
                    "- GitHub Actions"
                  ].join("\n")
                },
                "coursework.txt": {
                  type: "file",
                  content: [
                    "Relevant Coursework",
                    "-------------------",
                    "- Object-Oriented Programming",
                    "- Data Structures & Algorithms",
                    "- Advanced Programming Languages",
                    "- Operating Systems",
                    "- Database Theory",
                    "- Distributed Systems",
                    "- Wireless Networking",
                    "- Unix System Administration"
                  ].join("\n")
                }
              }
            },
            experience: {
              type: "directory",
              children: {
                "index.txt": {
                  type: "file",
                  content: [
                    "Experience Overview",
                    "-------------------",
                    "1. backend-engineering-lead.txt",
                    "2. software-engineer-bubblemachine.txt",
                    "3. production-technician.txt"
                  ].join("\n")
                },
                "backend-engineering-lead.txt": {
                  type: "file",
                  content: [
                    "Backend Engineering Lead | June 2024 - Present",
                    "-----------------------------------------------",
                    "Organization: SDSU Digital Innovation Lab",
                    "Location: San Diego, CA",
                    "- Lead 3 backend engineers across 4 production web applications",
                    "- Built scalable backends in Go/Python with PostgreSQL and SQL Server",
                    "- Delivered RAG and multi-step tool-calling AI workflows",
                    "- Improved throughput up to 6x and reduced latency by 70%",
                    "- Led Azure deployment strategy and cut cloud costs by 66%"
                  ].join("\n")
                },
                "software-engineer-bubblemachine.txt": {
                  type: "file",
                  content: [
                    "Software Engineer | April 2025 - September 2025",
                    "-----------------------------------------------",
                    "Project: bubblemachine.org (SDSU Research Grant)",
                    "Location: San Diego, CA",
                    "- Led a 2-engineer team and productionized a React prototype",
                    "- Built Django + PostgreSQL backend with auth and persistence",
                    "- Implemented Stripe subscriptions and access controls",
                    "- Extended frontend account management and cloud-sync UX"
                  ].join("\n")
                },
                "production-technician.txt": {
                  type: "file",
                  content: [
                    "Production Technician | December 2021 - Present",
                    "-----------------------------------------------",
                    "Organization: Turning Point Ministries",
                    "Location: San Diego, CA",
                    "- Camera operator and crew chief for live and studio productions",
                    "- Plan and validate camera systems with media + technical teams",
                    "- Own setup, live monitoring, and teardown workflows"
                  ].join("\n")
                }
              }
            },
            education: {
              type: "directory",
              children: {
                "index.txt": {
                  type: "file",
                  content: [
                    "Education Overview",
                    "------------------",
                    "See degree.txt and campus-involvement.txt"
                  ].join("\n")
                },
                "degree.txt": {
                  type: "file",
                  content: [
                    "San Diego State University",
                    "--------------------------",
                    "Bachelor of Science in Computer Science",
                    "Dates: August 2022 - May 2026",
                    "GPA: 3.8",
                    "Location: San Diego, CA"
                  ].join("\n")
                },
                "campus-involvement.txt": {
                  type: "file",
                  content: [
                    "Clubs & Organizations",
                    "---------------------",
                    "- ZIP Launchpad",
                    "- AI Club",
                    "- Rocket Project",
                    "- Mechatronics",
                    "- Chess Club"
                  ].join("\n")
                }
              }
            },
            "README.txt": { type: "file", content: readme },
            "about.txt": { type: "file", content: about },
            "contact.txt": { type: "file", content: contact }
          }
        }
      }
    }
  }
};

export const HOME_PATH = [...TERMINAL_CONFIG.homePath];

export function resolvePathSegments(cwd: string[], input: string): string[] {
  const source = input.trim();
  if (!source || source === ".") return [...cwd];

  let segments: string[];
  if (source.startsWith("/")) {
    segments = [];
  } else if (source === "~" || source.startsWith("~/")) {
    segments = [...HOME_PATH];
  } else {
    segments = [...cwd];
  }

  const relativePath =
    source === "~"
      ? ""
      : source.startsWith("~/")
        ? source.slice(2)
        : source.startsWith("/")
          ? source.slice(1)
          : source;

  for (const piece of relativePath.split("/")) {
    if (!piece || piece === ".") continue;
    if (piece === "..") {
      segments.pop();
      continue;
    }
    segments.push(piece);
  }

  return segments;
}

export function absolutePath(segments: string[]): string {
  return `/${segments.join("/")}`.replace(/\/+$/, "") || "/";
}

export function promptPath(segments: string[]): string {
  const homePrefix = `/${HOME_PATH.join("/")}`;
  const current = absolutePath(segments);
  if (current === homePrefix) return "~";
  if (current.startsWith(`${homePrefix}/`)) return `~${current.slice(homePrefix.length)}`;
  return current;
}

export function getNodeAtPath(segments: string[]): VirtualNode | null {
  let node: VirtualNode = VFS_ROOT;
  for (const segment of segments) {
    if (node.type !== "directory") return null;
    const nextNode: VirtualNode | undefined = node.children[segment];
    if (!nextNode) return null;
    node = nextNode;
  }
  return node;
}

function isValidNodeName(name: string): boolean {
  return name.length > 0 && name !== "." && name !== ".." && !name.includes("/");
}

function getParentDirectory(
  segments: string[]
): { parent: VirtualDirectory; name: string } | { parent: null; name: null } {
  if (segments.length === 0) {
    return { parent: null, name: null };
  }

  const name = segments[segments.length - 1];
  const parentNode = getNodeAtPath(segments.slice(0, -1));
  if (!parentNode || parentNode.type !== "directory") {
    return { parent: null, name: null };
  }

  return { parent: parentNode, name };
}

export function createFile(segments: string[]): VfsMutationResult {
  if (segments.length === 0) {
    return { ok: false, reason: "is-directory" };
  }

  const existingNode = getNodeAtPath(segments);
  if (existingNode) {
    if (existingNode.type === "directory") return { ok: false, reason: "is-directory" };
    return { ok: true };
  }

  const parentInfo = getParentDirectory(segments);
  if (!parentInfo.parent || !parentInfo.name) {
    return { ok: false, reason: "not-found" };
  }

  if (!isValidNodeName(parentInfo.name)) {
    return { ok: false, reason: "invalid-name" };
  }

  parentInfo.parent.children[parentInfo.name] = {
    type: "file",
    content: ""
  };
  return { ok: true };
}

export function writeFile(segments: string[], content: string): VfsMutationResult {
  if (segments.length === 0) {
    return { ok: false, reason: "is-directory" };
  }

  const existingNode = getNodeAtPath(segments);
  if (existingNode) {
    if (existingNode.type === "directory") {
      return { ok: false, reason: "is-directory" };
    }

    existingNode.content = content;
    return { ok: true };
  }

  const parentInfo = getParentDirectory(segments);
  if (!parentInfo.parent || !parentInfo.name) {
    return { ok: false, reason: "not-found" };
  }

  if (!isValidNodeName(parentInfo.name)) {
    return { ok: false, reason: "invalid-name" };
  }

  parentInfo.parent.children[parentInfo.name] = {
    type: "file",
    content
  };
  return { ok: true };
}

export function createDirectory(segments: string[], recursive = false): VfsMutationResult {
  if (segments.length === 0) {
    return recursive ? { ok: true } : { ok: false, reason: "already-exists" };
  }

  if (recursive) {
    let node: VirtualNode = VFS_ROOT;
    for (const segment of segments) {
      if (!isValidNodeName(segment)) {
        return { ok: false, reason: "invalid-name" };
      }

      if (node.type !== "directory") {
        return { ok: false, reason: "parent-not-directory" };
      }

      const nextNode: VirtualNode | undefined = node.children[segment];
      if (!nextNode) {
        const created: VirtualDirectory = { type: "directory", children: {} };
        node.children[segment] = created;
        node = created;
        continue;
      }

      if (nextNode.type !== "directory") {
        return { ok: false, reason: "parent-not-directory" };
      }
      node = nextNode;
    }

    return { ok: true };
  }

  const parentInfo = getParentDirectory(segments);
  if (!parentInfo.parent || !parentInfo.name) {
    return { ok: false, reason: "not-found" };
  }

  if (!isValidNodeName(parentInfo.name)) {
    return { ok: false, reason: "invalid-name" };
  }

  if (parentInfo.parent.children[parentInfo.name]) {
    return { ok: false, reason: "already-exists" };
  }

  parentInfo.parent.children[parentInfo.name] = {
    type: "directory",
    children: {}
  };
  return { ok: true };
}

export function removeNode(segments: string[], recursive = false): VfsMutationResult {
  if (segments.length === 0) {
    return { ok: false, reason: "cannot-remove-root" };
  }

  const parentInfo = getParentDirectory(segments);
  if (!parentInfo.parent || !parentInfo.name) {
    return { ok: false, reason: "not-found" };
  }

  const existingNode = parentInfo.parent.children[parentInfo.name];
  if (!existingNode) {
    return { ok: false, reason: "not-found" };
  }

  if (existingNode.type === "directory" && !recursive) {
    return { ok: false, reason: "is-directory" };
  }

  delete parentInfo.parent.children[parentInfo.name];
  return { ok: true };
}

export function removeDirectory(segments: string[]): VfsMutationResult {
  if (segments.length === 0) {
    return { ok: false, reason: "cannot-remove-root" };
  }

  const parentInfo = getParentDirectory(segments);
  if (!parentInfo.parent || !parentInfo.name) {
    return { ok: false, reason: "not-found" };
  }

  const existingNode = parentInfo.parent.children[parentInfo.name];
  if (!existingNode) {
    return { ok: false, reason: "not-found" };
  }

  if (existingNode.type !== "directory") {
    return { ok: false, reason: "not-directory" };
  }

  if (Object.keys(existingNode.children).length > 0) {
    return { ok: false, reason: "directory-not-empty" };
  }

  delete parentInfo.parent.children[parentInfo.name];
  return { ok: true };
}

export function getDirectoryEntries(node: VirtualDirectory): Array<{
  name: string;
  node: VirtualNode;
}> {
  return Object.entries(node.children)
    .sort(([leftName, leftNode], [rightName, rightNode]) => {
      if (leftNode.type !== rightNode.type) {
        return leftNode.type === "directory" ? -1 : 1;
      }
      return leftName.localeCompare(rightName);
    })
    .map(([name, child]) => ({ name, node: child }));
}

export function renderTree(startSegments: string[]): string[] {
  const startNode = getNodeAtPath(startSegments);
  if (!startNode) return ["tree: path not found"];

  const label = startSegments.length === 0 ? "/" : startSegments[startSegments.length - 1];
  const output: string[] = [label];

  if (startNode.type === "file") return output;

  const walk = (dir: VirtualDirectory, prefix: string) => {
    const entries = getDirectoryEntries(dir);
    entries.forEach((entry, index) => {
      const last = index === entries.length - 1;
      const connector = last ? "└── " : "├── ";
      output.push(`${prefix}${connector}${entry.name}${entry.node.type === "directory" ? "/" : ""}`);
      if (entry.node.type === "directory") {
        walk(entry.node, `${prefix}${last ? "    " : "│   "}`);
      }
    });
  };

  walk(startNode, "");
  return output;
}
