export function scrollIntoView(el: HTMLElement) {
	const container = el.offsetParent

	if (container instanceof HTMLElement) {
		if (container.tagName == 'BODY') return undefined

		if (el.offsetTop < container.scrollTop) {
			container.scrollTo({
				top: el.offsetTop,
				behavior: 'smooth'
			})
		} else if (el.offsetTop + el.clientHeight > container.scrollTop + container.clientHeight) {
			container.scrollTo({
				top: el.offsetTop + el.clientHeight - container.clientHeight,
				behavior: 'smooth'
			})
		}
	}
}

// vim: ts=4
