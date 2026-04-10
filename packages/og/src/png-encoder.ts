/**
 * Minimal PNG encoder for noise backgrounds.
 * Uses node:zlib for deflate compression.
 */

import { deflateSync } from 'node:zlib'

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

function crc32(data: Buffer): number {
	let crc = 0xffffffff
	const table: number[] = []

	// Build CRC table
	for (let n = 0; n < 256; n++) {
		let c = n
		for (let k = 0; k < 8; k++) {
			c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
		}
		table[n] = c
	}

	// Calculate CRC
	for (let i = 0; i < data.length; i++) {
		crc = table[(crc ^ data[i]) & 0xff] ^ (crc >>> 8)
	}

	return (crc ^ 0xffffffff) >>> 0
}

function createChunk(type: string, data: Buffer): Buffer {
	const length = Buffer.alloc(4)
	length.writeUInt32BE(data.length, 0)

	const typeBuffer = Buffer.from(type, 'ascii')
	const crcData = Buffer.concat([typeBuffer, data])
	const crc = Buffer.alloc(4)
	crc.writeUInt32BE(crc32(crcData), 0)

	return Buffer.concat([length, typeBuffer, data, crc])
}

function createIHDR(width: number, height: number): Buffer {
	const data = Buffer.alloc(13)
	data.writeUInt32BE(width, 0)  // Width
	data.writeUInt32BE(height, 4) // Height
	data.writeUInt8(8, 8)   // Bit depth: 8 bits
	data.writeUInt8(2, 9)   // Colour type: 2 (RGB)
	data.writeUInt8(0, 10)  // Compression method
	data.writeUInt8(0, 11)  // Filter method
	data.writeUInt8(0, 12)  // Interlace method

	return createChunk('IHDR', data)
}

function createIDAT(pixels: Uint8ClampedArray, width: number, height: number): Buffer {
	// Apply filter (none filter = 0) per row
	const rawData = Buffer.alloc(height * (width * 3 + 1))

	let srcOffset = 0
	let dstOffset = 0

	for (let y = 0; y < height; y++) {
		rawData[dstOffset++] = 0 // Filter type: none
		for (let x = 0; x < width; x++) {
			const r = pixels[srcOffset++]
			const g = pixels[srcOffset++]
			const b = pixels[srcOffset++]
			srcOffset++ // Skip alpha
			rawData[dstOffset++] = r
			rawData[dstOffset++] = g
			rawData[dstOffset++] = b
		}
	}

	const compressed = deflateSync(rawData)
	return createChunk('IDAT', compressed)
}

function createIEND(): Buffer {
	return createChunk('IEND', Buffer.alloc(0))
}

/**
 * Encode raw RGBA pixel data as a PNG Buffer.
 */
export function encodePNG(pixels: Uint8ClampedArray, width: number, height: number): Buffer {
	return Buffer.concat([
		PNG_SIGNATURE,
		createIHDR(width, height),
		createIDAT(pixels, width, height),
		createIEND(),
	])
}

/**
 * PNGEncoder namespace for cleaner imports.
 */
export const PNGEncoder = {
	encode: encodePNG,
}
