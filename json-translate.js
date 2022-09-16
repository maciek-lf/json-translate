import readline from 'readline'
import { unlink, readFile } from 'fs/promises'
import { writeFileSync } from 'fs'

const TRANSLATION_PATH = './translation.txt'
const originalJson = await readJson()
const parsedJson = []
const outputJson = { ...originalJson }

console.log('[OK] Parsing JSON')
Object.keys(originalJson).forEach((key) => {
  parseJson(originalJson[key], key)
})

await writeOriginalValues()
await askQuestion(`[>] Replace ${TRANSLATION_PATH} contents and press enter`)
await reparseJson()
await writeOutput(outputJson)
try {
  await unlink(TRANSLATION_PATH)
} catch {}

//////////////////////////////////////////////////////////////

async function reparseJson() {
  let translatedLines = []
  try {
    const data = await readFile(TRANSLATION_PATH, { encoding: 'utf8' })
    translatedLines = data.split('\n').filter((line) => line) // filter out empty line
  } catch (err) {
    console.error('[ERROR] ', err)
  }

  // set value in object with key in 'dot.notation'
  function set(obj, str, val) {
    str = str.split('.')
    while (str.length > 1) obj = obj[str.shift()]
    return (obj[str.shift()] = val)
  }

  parsedJson.forEach((obj, i) => {
    let line = translatedLines[i]

    // don't translate values in {braces}
    const originalBraces = obj.val.match(/[^{\}]+(?=})/g)
    if (originalBraces) {
      const translatedBraces = line.match(/[^{\}]+(?=})/g)

      originalBraces.forEach((val, i) => {
        line = line.replace(`{${translatedBraces[i]}}`, `{${val}}`)
      })
    }

    set(outputJson, obj.path, line.replaceAll('\\n', '\n'))
  })
}

async function writeOutput(outputJson) {
  console.log('[OK] Writing output to "./translated.json"')

  const stringData = JSON.stringify(outputJson, null, 2)
  try {
    writeFileSync('./translated.json', stringData)
  } catch (err) {
    console.error('[ERROR] ', err)
  }
  console.log('[OK] Finished')
}

async function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  return new Promise((resolve) =>
    rl.question(query, (ans) => {
      rl.close()
      resolve(ans)
    })
  )
}

async function writeOriginalValues() {
  console.log(`[OK] Writing values to "${TRANSLATION_PATH}"`)

  try {
    await unlink(TRANSLATION_PATH)
  } catch {}

  parsedJson.forEach(async (obj) => {
    await writeTmpFile(obj.val.replaceAll('\n', '\\n'))
  })
}

async function parseJson(node_value, path) {
  if (typeof node_value === 'string') {
    parsedJson.push({ path, val: node_value })
  }

  if (typeof node_value === 'object') {
    Object.keys(node_value).forEach((key) => {
      parseJson(node_value[key], path + '.' + key)
    })
  }
}

async function writeTmpFile(content) {
  try {
    writeFileSync(TRANSLATION_PATH, content + '\n', {
      flag: 'a+',
    })
  } catch (err) {
    console.error('[ERROR] ', err)
  }
}

async function readJson() {
  const jsonPath = await askQuestion('[>] Path to json file: ')
  console.log('[OK] Reading source JSON')

  try {
    const data = await readFile(jsonPath, { encoding: 'utf8' })
    return JSON.parse(data)
  } catch (err) {
    console.error('[ERROR] ', err)
  }
}
