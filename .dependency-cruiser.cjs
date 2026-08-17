/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: "no-circular",
      severity: "error",
      from: {},
      to: { circular: true }
    },
    {
      name: "no-unresolved",
      severity: "error",
      from: { path: "^(src|tests)" },
      to: { couldNotResolve: true }
    },
    {
      name: "domain-does-not-depend-outward",
      severity: "error",
      from: { path: "^src/modules/[^/]+/domain" },
      to: {
        path: "^src/(app|composition|platform|workflows)|^src/modules/[^/]+/(application|http|infrastructure)"
      }
    },
    {
      name: "application-does-not-depend-on-adapters",
      severity: "error",
      from: { path: "^src/modules/[^/]+/application" },
      to: { path: "^src/(app|composition)|^src/modules/[^/]+/(http|infrastructure)" }
    },
    {
      name: "http-does-not-depend-on-persistence",
      severity: "error",
      from: { path: "^src/modules/[^/]+/http" },
      to: { path: "^src/modules/[^/]+/infrastructure|^src/platform/database" }
    },
    {
      name: "feedback-domain-is-context-local",
      severity: "error",
      from: { path: "^src/modules/feedback-intake/domain" },
      to: { path: "^src/modules/signal-inbox" }
    },
    {
      name: "signal-domain-is-context-local",
      severity: "error",
      from: { path: "^src/modules/signal-inbox/domain" },
      to: { path: "^src/modules/feedback-intake" }
    },
    {
      name: "feedback-context-imports-signal-application-only",
      severity: "error",
      from: { path: "^src/modules/feedback-intake" },
      to: { path: "^src/modules/signal-inbox/(domain|http|infrastructure)" }
    },
    {
      name: "signal-context-imports-feedback-application-only",
      severity: "error",
      from: { path: "^src/modules/signal-inbox" },
      to: { path: "^src/modules/feedback-intake/(domain|http|infrastructure)" }
    },
    {
      name: "product-issue-domain-is-context-local",
      severity: "error",
      from: { path: "^src/modules/product-issues/domain" },
      to: { path: "^src/modules/(feedback-intake|signal-inbox)" }
    },
    {
      name: "product-issue-context-imports-other-applications-only",
      severity: "error",
      from: { path: "^src/modules/product-issues" },
      to: { path: "^src/modules/(feedback-intake|signal-inbox)/(domain|http|infrastructure)" }
    },
    {
      name: "implementation-brief-domain-is-context-local",
      severity: "error",
      from: { path: "^src/modules/implementation-briefs/domain" },
      to: { path: "^src/modules/(feedback-intake|signal-inbox|product-issues)" }
    },
    {
      name: "implementation-brief-context-imports-other-applications-only",
      severity: "error",
      from: { path: "^src/modules/implementation-briefs" },
      to: {
        path: "^src/modules/(feedback-intake|signal-inbox|product-issues)/(domain|http|infrastructure)"
      }
    },
    {
      name: "platform-does-not-depend-on-product",
      severity: "error",
      from: { path: "^src/platform" },
      to: { path: "^src/(app|composition|modules|workflows)" }
    },
    {
      name: "production-does-not-import-tests",
      severity: "error",
      from: { path: "^src" },
      to: { path: "^tests" }
    }
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    includeOnly: "^(src|tests)",
    tsPreCompilationDeps: true,
    tsConfig: { fileName: "tsconfig.json" },
    enhancedResolveOptions: {
      conditionNames: ["import", "require", "node", "default"],
      exportsFields: ["exports"]
    },
    reporterOptions: {
      text: { highlightFocused: true }
    }
  }
};
