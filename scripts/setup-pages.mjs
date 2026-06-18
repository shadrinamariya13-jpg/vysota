// Одноразовый скрипт: задаёт секреты репозитория, включает GitHub Pages
// в режиме "GitHub Actions" и перезапускает упавший workflow.
//
// Запуск: GH_TOKEN=ghp_... node scripts/setup-pages.mjs
// Никаких секретов в файле нет — токен передаётся через env, и сами значения
// тоже из env (см. ниже).

import sodium from 'libsodium-wrappers'

const TOKEN = process.env.GH_TOKEN
const OWNER = 'shadrinamariya13-jpg'
const REPO = 'vysota'

if (!TOKEN) {
  console.error('Нет GH_TOKEN')
  process.exit(1)
}

const SECRETS = {
  VITE_SUPABASE_URL: process.env.SB_URL,
  VITE_SUPABASE_KEY: process.env.SB_KEY,
}

async function api(method, path, body) {
  const res = await fetch(`https://api.github.com${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'X-GitHub-Api-Version': '2022-11-28',
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let json
  try { json = text ? JSON.parse(text) : {} } catch { json = { raw: text } }
  return { ok: res.ok, status: res.status, body: json }
}

await sodium.ready

console.log('1) Получаю public key для секретов…')
const pk = await api('GET', `/repos/${OWNER}/${REPO}/actions/secrets/public-key`)
if (!pk.ok) {
  console.error('Не получилось взять ключ:', pk.status, pk.body)
  process.exit(1)
}
const { key, key_id } = pk.body

function encrypt(secretValue) {
  const messageBytes = sodium.from_string(secretValue)
  const keyBytes = sodium.from_base64(key, sodium.base64_variants.ORIGINAL)
  const encrypted = sodium.crypto_box_seal(messageBytes, keyBytes)
  return sodium.to_base64(encrypted, sodium.base64_variants.ORIGINAL)
}

for (const [name, value] of Object.entries(SECRETS)) {
  if (!value) {
    console.error(`Пропускаю ${name}: пустое значение`)
    continue
  }
  console.log(`2) Записываю секрет ${name}…`)
  const r = await api('PUT', `/repos/${OWNER}/${REPO}/actions/secrets/${name}`, {
    encrypted_value: encrypt(value),
    key_id,
  })
  if (!r.ok) {
    console.error(`  не получилось: ${r.status}`, r.body)
  } else {
    console.log(`  ok (${r.status})`)
  }
}

console.log('3) Включаю Pages в режиме GitHub Actions…')
const pages = await api('POST', `/repos/${OWNER}/${REPO}/pages`, {
  build_type: 'workflow',
})
if (pages.ok || pages.status === 409) {
  console.log(pages.status === 409 ? '  уже включено' : `  ok (${pages.status})`)
} else {
  console.error('  не получилось:', pages.status, pages.body)
}

console.log('4) Ищу последний запуск workflow…')
const runs = await api('GET', `/repos/${OWNER}/${REPO}/actions/runs?per_page=5`)
if (!runs.ok) {
  console.error('  не получилось:', runs.status, runs.body)
  process.exit(1)
}
const last = runs.body.workflow_runs?.[0]
if (!last) {
  console.log('  Нет запусков. Запускаю workflow_dispatch…')
  const dispatch = await api(
    'POST',
    `/repos/${OWNER}/${REPO}/actions/workflows/deploy.yml/dispatches`,
    { ref: 'main' }
  )
  console.log('  dispatch:', dispatch.status, dispatch.ok ? 'ok' : dispatch.body)
} else {
  console.log(`  найден run #${last.run_number}: ${last.status}/${last.conclusion}`)
  if (last.conclusion === 'failure' || last.status === 'completed') {
    console.log('  Перезапускаю…')
    const rerun = await api('POST', `/repos/${OWNER}/${REPO}/actions/runs/${last.id}/rerun`)
    console.log('  rerun:', rerun.status, rerun.ok ? 'ok' : rerun.body)
  } else {
    console.log('  Уже в процессе, ничего не делаю')
  }
}

console.log('\nГотово. Через 1–2 минуты сайт будет на:')
console.log(`  https://${OWNER}.github.io/${REPO}/`)
