import * as React from 'react'
import { useDrag, useDrop, ConnectableElement } from 'react-dnd'
import CSS from 'csstype';

let lastItem: unknown
let lastTime = 0

//export function findItemHelper<T>(items: T[], itemKey: keyof T, itemId: unknown) {
export function findItemHelper<T, K extends keyof T>(items: T[], itemKey: K, itemId: T[K]) {
	return items.findIndex(i => i[itemKey] === itemId)
}

//export function moveItemHelper<T>(items: T[], itemKey: keyof T, itemId: unknown, to: number, newItem?: T) {
export function moveItemHelper<T, K extends keyof T>(items: T[], itemKey: K, itemId: T[K], to: number, newItem?: T) {
	const idx = findItemHelper(items, itemKey, itemId)
	if (to >= 0) { // move inside
		if (idx < 0) { // new item
			console.log('moveItem', itemId, to)
			return newItem
				? [...items.slice(0, to), newItem, ...items.slice(to)]
				: items
		} else if (to > idx) { // move to higher index
			return [...items.slice(0, idx), ...items.slice(idx + 1, to + 1), items[idx], ...items.slice(to + 1)]
		} else if (to < idx) { // move to lower index
			return [...items.slice(0, to), items[idx], ...items.slice(to, idx), ...items.slice(idx + 1)]
		}
	} else { // remove item
		return items.filter(i => i[itemKey] !== itemId)
	}
	return items
}

export interface ItemProps {
	ref: React.Ref<React.ReactHTMLElement<any>>
	//ref: React.RefObject<HTMLElement>
	className?: string
	style?: CSS.Properties
}

export interface SortableContainerProps<T, K extends keyof T> {
	items: T[]
	itemKey: K //keyof T
	//setItems: React.Dispatch<React.SetStateAction<T[]>>
	setItems: (state: T[]) => void
	renderItem: (item: T, props: ItemProps) => React.ReactElement<T>
	type?: string | symbol
	tag?: string
	className?: string
	itemClassName?: string
	style?: CSS.Properties
	findItem?: (itemId: T[K]) => number
	moveItem?: (itemId: T[K], to: number) => void
	children?: React.ReactNode
}

export function SortableContainer<T, K extends keyof T>({ items, itemKey, type, tag, setItems, findItem, moveItem, renderItem, itemClassName, children, ...props }: SortableContainerProps<T, K>) {
	const typeId = type ?? React.useMemo(() => Symbol('type'), [])

	const findItemCB = findItem || React.useCallback(function findItemCB(itemId: T[K]) {
		return findItemHelper(items, itemKey, itemId)
	}, [items, itemKey])

	const moveItemCB = moveItem || React.useCallback(function moveItemCB(itemId: T[K], to: number) {
		return setItems(moveItemHelper(items, itemKey, itemId, to))
	}, [findItemCB])

	const [, drop] = useDrop(() => ({
		accept: typeId,
		hover: (draggedItem: T, monitor) => {
			if (monitor.isOver({ shallow: true })) {
				lastItem = undefined
				lastTime = Date.now()
			}
		},
	}))
	return React.createElement(tag || 'div',
		{
			ref: drop,
			...props
		},
		items.map((item, i) =>
			<SortableItem
				key={'' + item[itemKey]}
				itemKey={itemKey}
				type={typeId}
				className={itemClassName}
				renderItem={renderItem}
				item={item}
				findItem={findItemCB}
				moveItem={moveItemCB}
			/>
		),
		children
	)
}

interface SortableItemProps<T, K extends keyof T> {
	//renderItem: (props: T) => React.ReactElement<T>
	renderItem: (item: T, props: ItemProps) => React.ReactElement<T>
	item: T
	itemKey: K //keyof T
	findItem: (itemId: T[K]) => number
	moveItem: (itemId: T[K], to: number) => void
	type: string | symbol
	className?: string
	style?: CSS.Properties
}

export function SortableItem<T, K extends keyof T>({ renderItem, item, itemKey, findItem, moveItem, type, className, style }: SortableItemProps<T, K>) {
	const [origIdx, setOrigIdx] = React.useState<number>(findItem(item[itemKey]))

	const [{ isDragging }, drag] = useDrag(
		() => ({
			type,
			item,
			collect: (monitor) => ({
				isDragging: monitor.isDragging()
				, x: console.log('Drag', Date.now(), type, item)
			}),
			isDragging: (monitor) => monitor.getItem() === item,
			end: (itm, monitor) => {
				const didDrop = monitor.didDrop()
				if (!didDrop) {
					moveItem(itm[itemKey], origIdx)
				} else {
					setOrigIdx(findItem(item[itemKey]))
				}
			}
		}),
		[item, origIdx, findItem, moveItem]
	)

	const [, drop] = useDrop(() => ({
		accept: type,
		hover: (draggedItem: T, monitor) => {
			if (Date.now() - lastTime < 100) return
			if (draggedItem !== item && lastItem !== item) {
				//console.log('DROP', Date.now() - lastTime, item, lastItem)
				const overIdx = findItem(item[itemKey])
				moveItem(draggedItem[itemKey], overIdx)
			}
			if (item !== lastItem) {
				lastItem = item
				lastTime = Date.now()
			}
		}
	}), [findItem, moveItem])

	return renderItem(item, {
		ref: (node: ConnectableElement) => drag(drop(node)),
		className,
		style: { ...style, opacity: isDragging ? 0.5 : 1 }
	})

	/*
	return React.createElement(tag || 'div',
		{
			ref: node => drag(drop(node)),
			className,
			style: { opacity: isDragging ? 0.5 : 1 }
		},
		renderItem(item)
	)

	return <div ref={node => drag(drop(node))} className={className} style={{ ...style, opacity: isDragging ? 0.5 : 1 }}>
		{renderItem(item)}
	</div>
	*/
}

// vim: ts=4
