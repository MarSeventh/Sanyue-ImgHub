function normalizePath(path = '') {
  return String(path)
    .replace(/\\/g, '/')
    .split('/')
    .filter(segment => segment && segment !== '.')
    .map(segment => segment === '..' ? '_' : segment)
    .join('/')
}

export function getRelativeDirectory(relativePath = '') {
  const normalizedPath = normalizePath(relativePath)
  const lastSlashIndex = normalizedPath.lastIndexOf('/')
  return lastSlashIndex === -1 ? '' : normalizedPath.slice(0, lastSlashIndex)
}

export function joinUploadFolder(baseFolder = '', relativeDirectory = '') {
  const hasLeadingSlash = /^[\\/]/.test(String(baseFolder).trim())
  const joinedPath = [normalizePath(baseFolder), normalizePath(relativeDirectory)]
    .filter(Boolean)
    .join('/')

  if (!joinedPath) return ''
  return hasLeadingSlash ? `/${joinedPath}` : joinedPath
}

export function filesToUploadEntries(files = []) {
  return Array.from(files).map(file => ({
    file,
    relativePath: normalizePath(file.webkitRelativePath || file.relativePath || file.name)
  }))
}

function readFileEntry(entry) {
  return new Promise((resolve, reject) => entry.file(resolve, reject))
}

async function readAllDirectoryEntries(directoryEntry) {
  const reader = directoryEntry.createReader()
  const entries = []

  // Chromium may return directory entries in batches (commonly 100 at a time).
  while (true) {
    const batch = await new Promise((resolve, reject) => reader.readEntries(resolve, reject))
    if (!batch.length) break
    entries.push(...batch)
  }

  return entries
}

async function collectFromEntry(entry, parentPath, result) {
  const relativePath = normalizePath([parentPath, entry.name].filter(Boolean).join('/'))

  if (entry.isFile) {
    const file = await readFileEntry(entry)
    result.push({ file, relativePath })
    return
  }

  if (entry.isDirectory) {
    const children = await readAllDirectoryEntries(entry)
    for (const child of children) {
      await collectFromEntry(child, relativePath, result)
    }
  }
}

async function collectFromHandle(handle, parentPath, result) {
  const relativePath = normalizePath([parentPath, handle.name].filter(Boolean).join('/'))

  if (handle.kind === 'file') {
    result.push({ file: await handle.getFile(), relativePath })
    return
  }

  if (handle.kind === 'directory') {
    for await (const child of handle.values()) {
      await collectFromHandle(child, relativePath, result)
    }
  }
}

export async function collectFilesFromDataTransferItems(items = []) {
  const fileItems = Array.from(items).filter(item => item.kind === 'file')
  const result = []

  // Resolve handles while still in the drop/paste event call chain when possible.
  const handles = await Promise.all(fileItems.map(async item => {
    if (typeof item.getAsFileSystemHandle !== 'function') return null
    try {
      return await item.getAsFileSystemHandle()
    } catch {
      return null
    }
  }))

  for (let index = 0; index < fileItems.length; index++) {
    const item = fileItems[index]
    const handle = handles[index]

    if (handle) {
      await collectFromHandle(handle, '', result)
      continue
    }

    const entry = typeof item.webkitGetAsEntry === 'function' ? item.webkitGetAsEntry() : null
    if (entry) {
      await collectFromEntry(entry, '', result)
      continue
    }

    const file = item.getAsFile?.()
    if (file) result.push(...filesToUploadEntries([file]))
  }

  return result
}
