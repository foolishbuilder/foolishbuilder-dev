const GH_USER = 'foolishbuilder';
const CACHE_TTL = 300;

async function ghProxy(url, env) {
  const headers = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'foolishbuilder-dev-worker',
  };
  if (env.GITHUB_PAT) {
    headers['Authorization'] = `token ${env.GITHUB_PAT}`;
  }

  const res = await fetch(url, { headers });
  const body = await res.text();

  return new Response(body, {
    status: res.status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': `public, max-age=${CACHE_TTL}`,
      'Access-Control-Allow-Origin': '*',
    },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api/repos') {
      return ghProxy(
        `https://api.github.com/users/${GH_USER}/repos?sort=pushed&per_page=100&type=owner`,
        env
      );
    }

    if (url.pathname === '/api/profile') {
      return ghProxy(
        `https://api.github.com/users/${GH_USER}`,
        env
      );
    }

    return env.ASSETS.fetch(request);
  },
};
