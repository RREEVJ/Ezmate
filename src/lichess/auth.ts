export const HOST = 'https://lichess.org';
const CLIENT_ID = 'ezmate';
const redirect = () => location.origin + location.pathname;

const b64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes))
  .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const random = (n: number) => b64(crypto.getRandomValues(new Uint8Array(n)));

export const token = () => sessionStorage.getItem('token');
export const forget = () => sessionStorage.removeItem('token');

export async function login() {
  const verifier = random(32);
  const state = random(16);
  sessionStorage.setItem('verifier', verifier);
  sessionStorage.setItem('state', state);
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  location.href = `${HOST}/oauth?` + new URLSearchParams({
    response_type: 'code',
    client_id: CLIENT_ID,
    redirect_uri: redirect(),
    scope: 'board:play challenge:write',
    code_challenge_method: 'S256',
    code_challenge: b64(new Uint8Array(hash)),
    state,
  });
}

/** handle return from Lichess; true if URL was an OAuth callback */
export async function finishLogin(): Promise<boolean> {
  const q = new URLSearchParams(location.search);
  const state = q.get('state');
  if (!state) return false;
  const expected = sessionStorage.getItem('state');
  const verifier = sessionStorage.getItem('verifier');
  sessionStorage.removeItem('state');
  sessionStorage.removeItem('verifier');
  history.replaceState({}, '', location.pathname);

  const code = q.get('code');
  if (state !== expected || !verifier) throw new Error('Login state mismatch, try again');
  if (!code) throw new Error(q.get('error_description') ?? 'Login cancelled');

  const res = await fetch(`${HOST}/api/token`, {
    method: 'POST',
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      code_verifier: verifier,
      redirect_uri: redirect(),
      client_id: CLIENT_ID,
    }),
  });
  if (!res.ok) throw new Error(`Login failed (${res.status})`);
  const { access_token } = await res.json();
  sessionStorage.setItem('token', access_token);
  return true;
}
