import { getFileExtension, isImageFile, normalizeMimeType } from '@/utils/mimeTypes'

const textAt = (bytes, start, length) => String.fromCharCode(...bytes.subarray(start, start + length))

// Read bounded slices so large GIFs do not need to be loaded into memory at once.
function createReader(file) {
    let start = -1
    let cached = new Uint8Array()
    return async (offset, length) => {
        if (offset < 0 || offset + length > file.size) throw new Error('Truncated image')
        if (offset < start || offset + length > start + cached.length) {
            start = offset
            cached = new Uint8Array(await file.slice(offset, offset + Math.max(length, 65536)).arrayBuffer())
        }
        if (offset + length > start + cached.length) throw new Error('Truncated image')
        return cached.subarray(offset - start, offset - start + length)
    }
}

async function isAnimatedGif(read) {
    const header = await read(0, 13)
    let offset = 13 + (header[10] & 0x80 ? 3 * (2 ** ((header[10] & 7) + 1)) : 0)
    let frames = 0
    while (true) {
        const marker = (await read(offset, 1))[0]
        if (marker === 0x3b) return false
        if (marker === 0x2c) {
            const descriptor = await read(offset, 10)
            if (++frames > 1) return true
            const packed = descriptor[9]
            offset += 10 + (packed & 0x80 ? 3 * (2 ** ((packed & 7) + 1)) : 0)
            await read(offset, 1) // LZW minimum code size
            offset++
        } else if (marker === 0x21) {
            offset += 2 // Extension introducer and label
        } else {
            throw new Error('Invalid GIF block')
        }
        // Skip complete sub-blocks; marker-like bytes inside data are not frames.
        while (true) {
            const length = (await read(offset, 1))[0]
            offset += 1 + length
            if (length === 0) break
        }
    }
}

async function isAnimatedWebp(read, size) {
    let offset = 12
    while (offset < size) {
        const chunk = await read(offset, 8)
        const type = textAt(chunk, 0, 4)
        const length = new DataView(chunk.buffer, chunk.byteOffset, 8).getUint32(4, true)
        if (offset + 8 + length > size) throw new Error('Truncated WebP chunk')
        if (type === 'ANIM' || type === 'ANMF') return true
        if (type === 'VP8X' && length >= 1 && ((await read(offset + 8, 1))[0] & 0x02)) return true
        offset += 8 + length + (length % 2)
    }
    return false
}

async function isAnimatedPng(read, size) {
    let offset = 8
    while (offset < size) {
        const chunk = await read(offset, 8)
        const type = textAt(chunk, 4, 4)
        const length = new DataView(chunk.buffer, chunk.byteOffset, 8).getUint32(0)
        if (offset + 12 + length > size) throw new Error('Truncated PNG chunk')
        if (type === 'acTL' && length === 8) {
            const control = await read(offset + 8, 4)
            return new DataView(control.buffer, control.byteOffset, 4).getUint32(0) > 1
        }
        // APNG requires acTL before the first IDAT.
        if (type === 'IDAT' || type === 'IEND') return false
        offset += 12 + length
    }
    throw new Error('Missing PNG image data')
}

/** Whether an upload must bypass transformations to preserve animation. */
export async function isAnimatedImage(file) {
    const possibleAnimation = ['image/gif', 'image/webp', 'image/png', 'image/apng'].includes(normalizeMimeType(file.type)) || ['gif', 'webp', 'png', 'apng'].includes(getFileExtension(file.name))
    if (!possibleAnimation && !isImageFile(file)) return false
    try {
        const read = createReader(file)
        const header = await read(0, Math.min(12, file.size))
        const signature = textAt(header, 0, 6)
        if (signature === 'GIF87a' || signature === 'GIF89a') return await isAnimatedGif(read)
        if (textAt(header, 0, 4) === 'RIFF' && textAt(header, 8, 4) === 'WEBP') return await isAnimatedWebp(read, file.size)
        if (textAt(header, 0, 8) === '\x89PNG\r\n\x1a\n') return await isAnimatedPng(read, file.size)
        return possibleAnimation
    } catch (error) {
        // A failed inspection must not flatten a potentially animated upload.
        console.warn('Unable to inspect image animation; preserving original upload:', error)
        return true
    }
}
