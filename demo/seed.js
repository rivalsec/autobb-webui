// Synthetic demo dataset for the AutoBB Web UI.
//
// Runs on first init of the demo Mongo image (it is copied into
// /docker-entrypoint-initdb.d/, so mongosh executes it against the
// MONGO_INITDB_DATABASE database). Everything is fabricated — fictional
// companies on the reserved .test / .example TLDs, no real targets.
//
// Dates are computed relative to "now" at container start, so the dashboard
// always looks fresh no matter how old the image is. Collection names and
// field shapes mirror autobb's schema (see backend/app/db.py + filters.py).

if (db.domains.estimatedDocumentCount() > 0) {
  print("autobb-demo: already seeded, skipping.");
} else {
  const now = new Date();
  const DAY = 24 * 60 * 60 * 1000;
  const daysAgo = (n) => new Date(now.getTime() - Math.round(n * DAY));
  const rint = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
  const pick = (xs) => xs[rint(0, xs.length - 1)];
  const chance = (p) => Math.random() < p;
  const sample = (xs, k) => {
    const c = xs.slice();
    for (let i = c.length - 1; i > 0; i--) {
      const j = rint(0, i);
      [c[i], c[j]] = [c[j], c[i]];
    }
    return c.slice(0, k);
  };
  const ip = () => `${rint(1, 223)}.${rint(0, 255)}.${rint(0, 255)}.${rint(1, 254)}`;
  // add_date: spread over the last ~60 days; ~25% land inside the last 7 days
  // so the "new this week" counters are non-zero. last_alive stays recent so
  // everything is inside the default 30-day alive window.
  const addDate = () => (chance(0.25) ? daysAgo(rint(0, 6)) : daysAgo(rint(7, 60)));
  const aliveDate = () => daysAgo(Math.random() * 9);

  const SCOPES = [
    { name: "acme", base: "acme.test" },
    { name: "globex", base: "globex.example" },
    { name: "initech", base: "initech.test" },
  ];
  const SUBS = [
    "www", "api", "dev", "staging", "admin", "mail", "vpn", "shop", "blog",
    "portal", "git", "jenkins", "grafana", "status", "cdn", "assets", "auth",
    "login", "dashboard", "internal", "docs", "support", "files", "ci", "db",
  ];
  const WEBSERVERS = ["nginx", "Apache/2.4.52", "cloudflare", "Microsoft-IIS/10.0", "openresty", "gunicorn"];
  const TECHS = [
    "Nginx", "Apache", "PHP", "WordPress", "React", "Cloudflare", "Tomcat",
    "Express", "OpenSSL", "jQuery", "Bootstrap", "Java", "Python", "Vue.js",
  ];
  const TITLES = [
    "Welcome", "Login", "Dashboard", "API Gateway", "403 Forbidden", "Sign in",
    "Index of /", "Grafana", "Jenkins", "Coming soon", "Service Status", "Not Found",
  ];
  const PATHS = [
    "/", "/admin", "/login", "/.git/config", "/api/v1/users", "/robots.txt",
    "/.env", "/backup.zip", "/wp-login.php", "/server-status", "/health",
    "/static/js/app.js", "/uploads/", "/config.json", "/swagger/index.html",
  ];
  const STATUS = [200, 200, 200, 301, 302, 403, 401, 404, 500];
  const COMMON_PORTS = [80, 443, 22, 8080, 8443, 3306, 6379, 9200, 21, 25];

  const ACTIVE_TEMPLATES = [
    { id: "log4j-rce", name: "Apache Log4j2 Remote Code Execution", severity: "critical", tags: ["cve", "rce", "log4j"] },
    { id: "gitlab-rce-cve-2021-22205", name: "GitLab CE/EE Unauthenticated RCE", severity: "critical", tags: ["cve", "gitlab", "rce"] },
    { id: "git-config-exposure", name: "Exposed .git/config", severity: "high", tags: ["exposure", "git"] },
    { id: "subdomain-takeover-s3", name: "Subdomain Takeover (AWS S3)", severity: "high", tags: ["takeover", "aws"] },
    { id: "sql-error-disclosure", name: "SQL Error Message Disclosure", severity: "high", tags: ["sqli", "errors"] },
    { id: "dir-listing", name: "Directory Listing Enabled", severity: "medium", tags: ["exposure", "listing"] },
    { id: "cors-misconfig", name: "CORS Misconfiguration", severity: "medium", tags: ["cors", "misconfig"] },
    { id: "default-login", name: "Default Credentials", severity: "medium", tags: ["default-login"] },
    { id: "server-version", name: "Web Server Version Disclosure", severity: "low", tags: ["disclosure"] },
    { id: "cookie-no-secure", name: "Cookie Without Secure Flag", severity: "low", tags: ["cookie", "headers"] },
    { id: "tech-detect", name: "Technology Detection", severity: "info", tags: ["tech"] },
    { id: "robots-txt", name: "robots.txt Disclosure", severity: "info", tags: ["files"] },
  ];
  const PASSIVE_TEMPLATES = [
    { id: "env-file-exposure", name: "Exposed Environment File (.env)", severity: "high", tags: ["exposure", "config"] },
    { id: "mixed-content", name: "Mixed Active Content", severity: "medium", tags: ["ssl", "headers"] },
    { id: "outdated-jquery", name: "Outdated jQuery Library", severity: "low", tags: ["js", "outdated"] },
    { id: "missing-security-headers", name: "Missing Security Headers", severity: "info", tags: ["headers"] },
    { id: "ssl-dns-names", name: "TLS Certificate SAN Enumeration", severity: "info", tags: ["ssl", "tls"] },
  ];

  const domains = [];
  const probes = [];
  const ports = [];
  const httpPaths = [];
  const activeHits = [];
  const passiveHits = [];

  for (const sc of SCOPES) {
    const subs = sample(SUBS, rint(14, 22));
    for (const sub of subs) {
      const host = `${sub}.${sc.base}`;
      const add = addDate();
      const alive = aliveDate();
      const ips = [ip()].concat(chance(0.3) ? [ip()] : []);

      domains.push({
        host,
        scope: sc.name,
        a: ips,
        cname: chance(0.25) ? [`${sub}.cdn.${sc.base}`] : [],
        juicy_weight: rint(0, 100),
        add_date: add,
        last_alive: alive,
      });

      // Open ports for most hosts.
      for (const p of sample(COMMON_PORTS, rint(1, 4))) {
        ports.push({
          host,
          ip: ips[0],
          port: p,
          scope: sc.name,
          add_date: add,
          last_alive: aliveDate(),
        });
      }

      // An HTTP service on most hosts.
      if (chance(0.8)) {
        const tls = chance(0.7);
        const scheme = tls ? "https" : "http";
        const port = tls ? 443 : 80;
        const url = `${scheme}://${host}`;
        const status = pick(STATUS);
        probes.push({
          url,
          input: host,
          host,
          port: String(port),
          scheme,
          status_code: status,
          title: pick(TITLES),
          webserver: pick(WEBSERVERS),
          tech: sample(TECHS, rint(1, 4)),
          content_length: rint(120, 48000),
          words: rint(20, 4000),
          lines: rint(5, 800),
          a: ips,
          cnames: chance(0.2) ? [`${sub}.cdn.${sc.base}`] : [],
          final_url: status >= 300 && status < 400 ? `${url}/login` : url,
          hash: { body_md5: Math.random().toString(16).slice(2).padEnd(32, "0").slice(0, 32) },
          tls: { probe_status: tls, version: tls ? "TLS 1.3" : null, host: tls ? host : null },
          scope: sc.name,
          add_date: add,
          last_alive: aliveDate(),
        });

        // Fuzzed paths.
        for (const path of sample(PATHS, rint(1, 5))) {
          const ps = pick(STATUS);
          httpPaths.push({
            url: `${url}${path}`,
            host,
            path,
            status_code: ps,
            content_length: rint(0, 22000),
            words: rint(0, 1500),
            lines: rint(0, 400),
            redirect: ps >= 300 && ps < 400 ? `${url}/login` : null,
            scope: sc.name,
            add_date: addDate(),
            last_alive: aliveDate(),
          });
        }
      }

      // Findings on a subset of hosts.
      if (chance(0.45)) {
        const t = pick(ACTIVE_TEMPLATES);
        const url = `https://${host}`;
        const matchedAt = `${url}${pick(["/", "/admin", "/.git/config", "/api/v1", "/login"])}`;
        activeHits.push({
          "template-id": t.id,
          info: {
            name: t.name,
            severity: t.severity,
            tags: t.tags,
            description: `${t.name} detected on ${host}.`,
            author: ["pdteam"],
          },
          type: "http",
          "matcher-name": pick(["word", "status", "regex", "dsl"]),
          host,
          "matched-at": matchedAt,
          "extracted-results": chance(0.4) ? [`v${rint(1, 9)}.${rint(0, 9)}.${rint(0, 9)}`] : [],
          "curl-command": `curl -X GET '${matchedAt}'`,
          scope: sc.name,
          add_date: addDate(),
          last_alive: aliveDate(),
        });
      }
      if (chance(0.3)) {
        const t = pick(PASSIVE_TEMPLATES);
        const url = `https://${host}`;
        passiveHits.push({
          "template-id": t.id,
          info: {
            name: t.name,
            severity: t.severity,
            tags: t.tags,
            description: `${t.name} observed passively on ${host}.`,
            author: ["pdteam"],
          },
          type: "http",
          host,
          "matched-at": url,
          port: pick(["443", "80"]),
          path: pick(["/", "/static/js/app.js", "/.env"]),
          scope: sc.name,
          add_date: addDate(),
          last_alive: aliveDate(),
        });
      }
    }
  }

  // Notification history (not scope-tagged in autobb).
  const ALERT_SOURCES = ["telegram", "smtp", "vkteams"];
  const alerts = [];
  for (let i = 0; i < 14; i++) {
    const n = rint(1, 5);
    alerts.push({
      source: pick(ALERT_SOURCES),
      created_at: daysAgo(Math.random() * 21),
      msg: `${n} new finding(s) across ${pick(SCOPES).name}`,
      items: Array.from({ length: n }, () => pick(ACTIVE_TEMPLATES).id),
      dispatch: { status: "sent" },
    });
  }

  db.domains.insertMany(domains);
  db.http_probes.insertMany(probes);
  db.ports.insertMany(ports);
  db.http_paths.insertMany(httpPaths);
  db.nuclei_hits.insertMany(activeHits);
  db.nuclei_passive_hits.insertMany(passiveHits);
  db.alerts.insertMany(alerts);

  print(
    `autobb-demo seeded: ${domains.length} domains, ${probes.length} probes, ` +
    `${ports.length} ports, ${httpPaths.length} paths, ${activeHits.length} active + ` +
    `${passiveHits.length} passive findings, ${alerts.length} alerts.`
  );
}
