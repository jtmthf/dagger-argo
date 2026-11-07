import {
  dag,
  Workspace,
  Directory,
  Container,
  object,
  func,
  check,
} from "@dagger.io/dagger"

/** Where the repository is mounted inside every container. */
const WORKDIR = "/src"

/**
 * Files pnpm needs to resolve and install the workspace. Installing from these
 * alone keeps the dependency layer cached across source-only changes.
 */
const INSTALL_INPUTS = [
  "package.json",
  "pnpm-lock.yaml",
  "pnpm-workspace.yaml",
  ".npmrc",
  "apps/*/package.json",
  "packages/*/package.json",
  "tooling/*/package.json",
]

/**
 * CI for the monorepo. Every check delegates to `turbo run <task>`, so task
 * ordering, dependencies and caching stay defined in turbo.json.
 */
@object()
export class Ci {
  /** Node image the pipeline runs on (Debian-based so Playwright can install browser deps). */
  @func()
  nodeImage: string

  source: Directory

  constructor(ws: Workspace, nodeImage = "node:24-bookworm-slim") {
    this.nodeImage = nodeImage
    this.source = ws.directory("/", {
      gitignore: true,
      exclude: ["**/.git", "**/node_modules", "**/.turbo", ".dagger"],
    })
  }

  /**
   * Node + pnpm with workspace dependencies installed and the source mounted.
   * Pass `browsers` to also install Playwright browsers and their system deps.
   */
  @func()
  base(browsers = false): Container {
    let ctr = this.deps()
    if (browsers) {
      ctr = ctr.withExec(["pnpm", "run", "e2e:install"])
    }
    return ctr
      .withDirectory(WORKDIR, this.source)
      .withMountedCache(`${WORKDIR}/.turbo/cache`, dag.cacheVolume("turbo-cache"))
  }

  /** Run arbitrary Turborepo tasks, e.g. `--tasks build,test --args=--force`. */
  @func()
  turbo(tasks: string[], args: string[] = [], browsers = false): Container {
    return this.base(browsers).withExec(["pnpm", "turbo", "run", ...tasks, ...args])
  }

  /** ESLint across the workspace (`turbo run lint`). */
  @func()
  @check()
  async lint(): Promise<void> {
    await this.turbo(["lint"]).sync()
  }

  /** Production builds of every app (`turbo run build`). */
  @func()
  @check()
  async build(): Promise<void> {
    await this.turbo(["build"]).sync()
  }

  /** TypeScript type checking (`turbo run check-types`). */
  @func()
  @check()
  async checkTypes(): Promise<void> {
    await this.turbo(["check-types"]).sync()
  }

  /** Vitest unit tests (`turbo run test`). */
  @func()
  @check()
  async test(): Promise<void> {
    await this.turbo(["test"]).sync()
  }

  /** Playwright e2e suites against production builds (`turbo run e2e`). */
  @func()
  @check()
  async endToEnd(): Promise<void> {
    await this.turbo(["e2e"], [], true).sync()
  }

  /** Node, pnpm (pinned by `packageManager`) and installed node_modules. */
  private deps(): Container {
    return dag
      .container()
      .from(this.nodeImage)
      .withEnvVariable("CI", "1")
      .withEnvVariable("TURBO_TELEMETRY_DISABLED", "1")
      .withEnvVariable("NEXT_TELEMETRY_DISABLED", "1")
      .withEnvVariable("COREPACK_ENABLE_DOWNLOAD_PROMPT", "0")
      .withMountedCache("/pnpm-store", dag.cacheVolume("pnpm-store"))
      .withWorkdir(WORKDIR)
      .withDirectory(WORKDIR, this.source, { include: INSTALL_INPUTS })
      .withExec(["corepack", "enable"])
      .withExec(["pnpm", "install", "--frozen-lockfile", "--store-dir", "/pnpm-store"])
  }
}
