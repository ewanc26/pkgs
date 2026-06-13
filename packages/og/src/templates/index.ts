/**
 * Built-in OG templates.
 */

export { blogTemplate } from './blog.js'
export { profileTemplate } from './profile.js'
export { defaultTemplate } from './default.js'
export { documentationTemplate } from './Documentation.js'

import { blogTemplate } from './blog.js'
import { profileTemplate } from './profile.js'
import { defaultTemplate } from './default.js'
import { documentationTemplate } from './Documentation.js'
import type { OgTemplate } from '../types.js'

export const templates = {
	blog: blogTemplate,
	profile: profileTemplate,
	default: defaultTemplate,
	documentation: documentationTemplate,
} as const

export type TemplateName = keyof typeof templates

export function getTemplate(name: TemplateName | OgTemplate): OgTemplate {
	if (typeof name === 'function') {
		return name
	}
	return templates[name]
}
