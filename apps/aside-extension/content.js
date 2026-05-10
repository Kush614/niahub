// NiaHub Aside companion — content script.
// Maps the current host to a pack and slides in a small install offer.

const PACK_BY_HOST = [
  { match: /(^|\.)stripe\.com$/, pack: 'stripe-api-current', label: 'Stripe', accent: '#635bff' },
  { match: /(^|\.)react\.dev$/, pack: 'react-core', label: 'React', accent: '#61dafb' },
  { match: /(^|\.)nextjs\.org$/, pack: 'nextjs-app-router', label: 'Next.js', accent: '#ffffff' },
  { match: /(^|\.)postgresql\.org$/, pack: 'postgres-17', label: 'Postgres', accent: '#336791' },
  { match: /(^|\.)docs\.aws\.amazon\.com$/, pack: 'aws-s3', label: 'AWS S3', accent: '#ff9900' },
  { match: /(^|\.)tailwindcss\.com$/, pack: 'tailwind-v4', label: 'Tailwind v4', accent: '#38bdf8' },
  { match: /(^|\.)modelcontextprotocol\.io$/, pack: 'mcp-protocol', label: 'MCP', accent: '#a855f7' },
];

const host = location.host;
const hit = PACK_BY_HOST.find((p) => p.match.test(host));
if (hit) injectOffer(hit);

function injectOffer({ pack, label, accent }) {
  const stop = sessionStorage.getItem(`niahub:dismiss:${pack}`);
  if (stop === '1') return;

  const root = document.createElement('div');
  root.className = 'niahub-aside-offer';
  root.innerHTML = `
    <div class="niahub-card" style="--accent:${accent}">
      <div class="niahub-row">
        <span class="niahub-dot"></span>
        <span class="niahub-title">You're on ${label} docs.</span>
      </div>
      <div class="niahub-sub">Install the <code>${pack}</code> pack for your editor — one click, zero config.</div>
      <div class="niahub-actions">
        <button class="niahub-btn-primary" data-action="install">Install via NiaHub</button>
        <button class="niahub-btn" data-action="dismiss">Not now</button>
      </div>
    </div>
  `;
  document.documentElement.appendChild(root);

  root.querySelector('[data-action="install"]').addEventListener('click', () => {
    chrome.runtime.sendMessage({ kind: 'install', pack });
    window.open(`https://niahub.dev/packs/${pack}?from=aside`, '_blank', 'noopener');
  });
  root.querySelector('[data-action="dismiss"]').addEventListener('click', () => {
    sessionStorage.setItem(`niahub:dismiss:${pack}`, '1');
    root.remove();
  });
}
