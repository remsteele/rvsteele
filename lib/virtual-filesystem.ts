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
  "  cat contact.txt"
].join("\n");

const contact = [
  "Contact",
  "-------",
  "Email: remington@portfolio.dev",
  "GitHub: https://github.com/remsteele",
  "LinkedIn: https://linkedin.com/in/rvsteele",
  "Location: United States"
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
                    "1. project_1.txt - Systems and automation work",
                    "2. project_2.txt - Full-stack application delivery",
                    "",
                    "Use cat project_1.txt or cat project_2.txt"
                  ].join("\n")
                },
                "project_1.txt": {
                  type: "file",
                  content: [
                    "Project 1: Distributed Ingestion Pipeline",
                    "-----------------------------------------",
                    "Role: Lead Engineer",
                    "Stack: Go, Postgres, Redis, Docker, AWS",
                    "Highlights:",
                    "- Built resilient queue consumers with backpressure controls",
                    "- Reduced ingestion latency from minutes to sub-second ranges",
                    "- Added observability with tracing and SLO-driven alerting"
                  ].join("\n")
                },
                "project_2.txt": {
                  type: "file",
                  content: [
                    "Project 2: Workflow Operations Console",
                    "--------------------------------------",
                    "Role: Full-Stack Engineer",
                    "Stack: Next.js, TypeScript, Tailwind, GraphQL",
                    "Highlights:",
                    "- Delivered operator-facing dashboards for incident workflows",
                    "- Implemented role-aware UI and auditable actions",
                    "- Improved release confidence with integration test coverage"
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
                    "- Languages: Go, TypeScript, Python, SQL",
                    "- Frontend: React, Next.js, Tailwind",
                    "- Backend: REST, GraphQL, distributed systems",
                    "- Platform: Docker, CI/CD, monitoring, cloud infra"
                  ].join("\n")
                },
                "backend.txt": {
                  type: "file",
                  content: [
                    "Backend",
                    "-------",
                    "- API design and service decomposition",
                    "- Database modeling and query optimization",
                    "- Concurrency, reliability, and production operations"
                  ].join("\n")
                },
                "frontend.txt": {
                  type: "file",
                  content: [
                    "Frontend",
                    "--------",
                    "- Design systems and purposeful UI architecture",
                    "- Accessible, performant interfaces in React/Next.js",
                    "- Advanced state management and data-fetch workflows"
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
                    "See company_1.txt and company_2.txt for selected roles."
                  ].join("\n")
                },
                "company_1.txt": {
                  type: "file",
                  content: [
                    "Company 1 - Senior Software Engineer",
                    "-------------------------------------",
                    "Built core platform APIs and operational tooling.",
                    "Partnered with product and infrastructure to ship reliably."
                  ].join("\n")
                },
                "company_2.txt": {
                  type: "file",
                  content: [
                    "Company 2 - Software Engineer",
                    "------------------------------",
                    "Delivered customer-facing features across web and backend services.",
                    "Focused on maintainability, testing, and service quality."
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
                    "See degree.txt and certifications.txt"
                  ].join("\n")
                },
                "degree.txt": {
                  type: "file",
                  content: [
                    "B.S. Computer Science",
                    "----------------------",
                    "Focus: systems, algorithms, and software engineering."
                  ].join("\n")
                },
                "certifications.txt": {
                  type: "file",
                  content: [
                    "Certifications",
                    "--------------",
                    "- Cloud architecture fundamentals",
                    "- Secure software development practices"
                  ].join("\n")
                }
              }
            },
            "README.txt": { type: "file", content: readme },
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
