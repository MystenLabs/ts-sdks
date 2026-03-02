// Copyright (c) 2023 composed-offset-position contributors
// SPDX-License-Identifier: MIT
// Vendored from composed-offset-position@0.0.6
// https://github.com/nicolo-ribaudo/composed-offset-position

const TRANSFORM_PROPS = ['transform', 'translate', 'scale', 'rotate', 'perspective'] as const;
const WILL_CHANGE_VALUES = [
	'transform',
	'translate',
	'scale',
	'rotate',
	'perspective',
	'filter',
] as const;
const CONTAIN_VALUES = ['paint', 'layout', 'strict', 'content'] as const;

function isContainingBlock(element: Element): boolean {
	const css = getComputedStyle(element);
	const isWebKit = /AppleWebKit/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);

	return (
		TRANSFORM_PROPS.some((prop) => {
			const value = css.getPropertyValue(prop);
			return value ? value !== 'none' : false;
		}) ||
		(css.containerType ? css.containerType !== 'normal' : false) ||
		(!isWebKit && css.backdropFilter ? css.backdropFilter !== 'none' : false) ||
		(!isWebKit && css.filter ? css.filter !== 'none' : false) ||
		WILL_CHANGE_VALUES.some((value) => (css.willChange || '').includes(value)) ||
		CONTAIN_VALUES.some((value) => (css.contain || '').includes(value))
	);
}

function flatTreeParent(element: Node): Node | null {
	if (element instanceof HTMLSlotElement && element.assignedSlot) {
		return element.assignedSlot;
	}
	if (element.parentNode instanceof ShadowRoot) {
		return element.parentNode.host;
	}
	return element.parentNode;
}

function offsetParentPolyfill(element: Node): Element | null {
	for (let ancestor: Node | null = element; ancestor; ancestor = flatTreeParent(ancestor)) {
		if (!(ancestor instanceof Element)) {
			continue;
		}
		if (getComputedStyle(ancestor).display === 'none') {
			return null;
		}
	}
	for (
		let ancestor: Node | null = flatTreeParent(element);
		ancestor;
		ancestor = flatTreeParent(ancestor)
	) {
		if (!(ancestor instanceof Element)) {
			continue;
		}
		const style = getComputedStyle(ancestor);
		if (style.display === 'contents') {
			continue;
		}
		if (style.position !== 'static' || isContainingBlock(ancestor)) {
			return ancestor;
		}
		if (ancestor.tagName === 'BODY') {
			return ancestor;
		}
	}
	return null;
}

export function offsetParent(element: Node): Element | null {
	return offsetParentPolyfill(element);
}
