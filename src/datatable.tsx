import * as React from 'react'
import * as T from '@symbion/runtype'
import { useForm, UseForm } from '@symbion/simple-form'
import { Scroll } from './scroll'
import { SortableContainer, SortableItem, findItemHelper, moveItemHelper } from './sortable'

import {
	FiArrowUp as IcSortAsc,
	FiArrowDown as IcSortDesc,
	FiChevronLeft as IcPagePrev,
	FiChevronRight as IcPageNext,
	FiSettings as IcSettings,
	FiTrash2 as IcDelete,
	FiEdit as IcEdit
} from 'react-icons/fi'

export interface TableDataProvider<T extends { [id: string]: any }> {
	getData: () => T[]
	page?: number
	lastPage?: number | null
	next?: () => Promise<void>
	prev?: () => Promise<void>
}

export interface ColumnDescriptor<T, TV, V> {
	title: string
	defaultWidth: number
	align?: 'left' | 'right' | 'center'
	format?: (value: V, row: T) => React.ReactNode
	sort?: boolean | ((row: T) => T[keyof T])
	editable?: boolean | ((row: T) => boolean)
	renderEdit?: (props: { value: V, onChange: (value: V) => void }) => React.ReactNode
}

export type Columns<T extends { [id: string]: any }, TV extends T = T> = {
	[id in keyof TV]: ColumnDescriptor<T, TV, TV[id]>
}

export interface ColumnConfig<TV extends { [id: string]: any }> {
	id: keyof TV & string
	width: number
}

export function compare(v1: unknown, v2: unknown): number {
	switch (typeof v1) {
	case 'string': return v1.localeCompare('' + v2)
	case 'object':
		if (Array.isArray(v1) && Array.isArray(v2)) {
			for (let i = 0; i < v1.length || i < v2.length; i++) {
				const cmp = compare(v1[i], v2[i])
				if (cmp) return cmp
			}
			return 0
		} else {
			if (v1 == null) return -1
			if (v2 == null) return 1
			return v1 < v2 ? -1 : v1 > v2 ? 1 : 0
		}
	default:
		if (v1 == null) return -1
		if (v2 == null) return 1
		return v1 < v2 ? -1 : v1 > v2 ? 1 : 0
	}
}

function classNames(...cn: (string | false | undefined)[]) {
	const a = cn.filter(c => c)
	console.log('classNames', cn, a)
	return a.length ? a.join(' ') : undefined
}

function useTableData<T extends { [id: string]: any }>(data: T[]): TableDataProvider<T> {
	const d = React.useState(data)

	function getData() {
		return data
	}

	return { getData }
}

function calcWidth(dx: number) {
	//console.log('calcWidth', dx)
	return Math.max((Math.round(dx / 8)), 2)
}

interface ColumnHeaderProps<T, TV extends T, ID extends keyof T> {
	id: ID
	column: ColumnDescriptor<T, TV, TV[ID]>
	width: number
	setWidth?: (width: number) => void
	sortAsc?: boolean
	onClick?: () => void
	remove?: () => void
}

let resizeStartX = 0
function ColumnHeader<T extends { [id: string]: any }, TV extends T, ID extends keyof T>({ id, column, width, setWidth, sortAsc, onClick, remove }: ColumnHeaderProps<T, TV, ID>) {
	const [resizing, setResizing] = React.useState(false)

	function onResizeStart(evt: React.MouseEvent) {
		//console.log('onResizeStart', evt)
		setResizing(true)
		resizeStartX = evt.clientX - 8 * width
		evt.stopPropagation()
		evt.preventDefault()
	}

	const onResizeEnd = React.useCallback(function onResizeEnd(evt: MouseEvent) {
		setResizing(false)
	}, [])

	const onResizeMove = React.useCallback(function onResizeMove(evt: MouseEvent) {
		//console.log('onResizeMove', width)
		if (setWidth) setWidth(calcWidth(evt.clientX - resizeStartX))
		evt.stopPropagation()
		evt.preventDefault()
	}, [])

	React.useEffect(function () {
		//console.log('RESIZING effect', resizing)
		if (resizing) {
			window.addEventListener('mousemove', onResizeMove)
			window.addEventListener('mouseup', onResizeEnd)
		} else {
			window.removeEventListener('mousemove', onResizeMove)
			window.removeEventListener('mouseup', onResizeEnd)
		}
	}, [resizing])

	function disableEvent(evt: React.SyntheticEvent) {
		if (resizing) {
			//console.log('disabled', evt)
			evt.stopPropagation()
			evt.preventDefault()
		}
	}

	return <div className={'column' + (column.sort ? ' sortable' : '') + (column.align ? ' ' + column.align : '')} style={{ width: `${width * 8}px`}} onClick={onClick}>
		<div className="title">
			{column.title}
			{ sortAsc != undefined && (sortAsc ? <IcSortAsc/> : <IcSortDesc/>)}
		</div>
		{ remove && <IcDelete className="a-icon small" onClick={remove}/> }
		<div className="divider"
			onMouseDown={onResizeStart}
			onPointerDown={disableEvent}
			onPointerMove={disableEvent}
			onDragStart={disableEvent}
			onDrag={disableEvent}
		>
			<div className="icon"/>
		</div>
	</div>
}

interface CellProps<T, TV extends T, ID extends keyof T & string> {
	colId: ID
	column: ColumnDescriptor<T, TV, TV[ID]>
	width: number
	data: T
	className?: string
	inputClassName?: string
	onChange?: (evt: React.ChangeEvent<HTMLInputElement>) => void
	onBlur?: (evt: React.FocusEvent<any>) => void
}

function Cell<T extends { [id: string]: any }, TV extends T, ID extends keyof T & string>({ colId, column, width, data }: CellProps<T, TV, ID>) {
	return <div className={'cell' + (column.align ? ' ' + column.align : '')} style={{ width: `${width * 8}px`}}>
		{ column.format ? column.format(data[colId] as TV[ID], data) : data[colId] }
	</div>
}

function EditableCell<T extends { [id: string]: any }, TV extends T, ID extends keyof T & string>({ colId, column, width, data, className, inputClassName, onChange, onBlur }: CellProps<T, TV, ID>) {
	//const [editing, setEditing] = React.useState(false)
	const [value, setValue] = React.useState('')
	console.log({ colId, column, width, data, className, onChange, onBlur })

	function onInputKeyDown(evt: React.KeyboardEvent) {
		switch (evt.key) {
			case 'Enter':
				//onChange && onChange(evt)
				//setEditing(false)
				break
			case 'Escape':
				//setEditing(false)
				break
		}
	}

	function onFocus(evt: React.FocusEvent<HTMLInputElement>) {
		evt.target.select()
	}

	//if (editing) {
		return <div className="cell editing" style={{ width: `${width * 8}px`}}>
			{ column.renderEdit
				? column.renderEdit({ value: data[colId] as TV[ID], onChange: (value) => undefined })
				: <input
					name={colId}
					className={inputClassName}
					autoFocus
					defaultValue={data[colId]}
					onChange={onChange}
					onBlur={onBlur}
					//onKeyDown={onInputKeyDown}
					onFocus={onFocus}
					style={{ width: '100%' }}
			/> }
		</div>
	/*
	} else {
		return <div className={'cell' + (column.align ? ' ' + column.align : '')} style={{ width: `${width * 8}px`}} onClick={() => setEditing(true)}>
			{ column.format ? column.format(data[colId] as TV[ID], data) : data[colId] }
		</div>
	}
	*/
}

function isEditable<T, TV extends T, V>(col: ColumnDescriptor<T, TV, V>, row: T) {
	switch (typeof col.editable) {
		case 'boolean': return col.editable
		case 'function': return col.editable(row)
	}
	return false
}

interface RowProps<T extends { [id: string]: any }, TV extends T, ID extends keyof T & string> {
	className?: string
	cellClassName?: string
	data: T
	columns: Columns<T, TV>
	columnConfig: ColumnConfig<TV>[]
	selected?: boolean
	onClick?: (evt: React.SyntheticEvent) => void
}

function Row<T extends { [id: string]: any }, TV extends T, ID extends keyof T & string>({ className, data, columns, columnConfig, selected, onClick }: RowProps<T, TV, ID>) {
	return <div
		className={'row' + (selected ? ' selected' : '')}
		onClick={evt => onClick?.(evt)}
	>
	{columnConfig.map(col =>
		<Cell key={col.id.toString()} colId={col.id} column={columns[col.id] as any} width={col.width} data={data}/>
	)}
	</div>
}

interface EditRowProps<T extends { [id: string]: any }, TV extends T, ID extends keyof T & string> extends RowProps<T, TV, ID> {
	//data: T
	//columns: Columns<T, TV>
	//columnConfig: ColumnConfig<TV>[]
	//selected?: boolean
	//onClick?: (evt: React.SyntheticEvent) => void
	inputClassName?: string
	struct: T.StructType<T>
	onChange?: (value: string) => void
}

function EditRow<T extends { [id: string]: any }, TV extends T, ID extends keyof T & string>({ className, inputClassName, data, columns, columnConfig, struct, selected, onClick }: EditRowProps<T, TV, ID>) {
	const formRef = React.useRef(null)
	const form = useForm(struct, { formRef, init: data })
	//columnConfig.map(col => console.log(columns[col.id], data, isEditable<T, TV, any>(columns[col.id], data)))

	async function onSubmit() {
		const valid = await form.valid()
		console.log('SUBMIT', valid ? form.get() : 'invalid')
		console.log('SUBMIT', form.get())
		if (valid) {
			alert('Form submit\n---------------------\n\n'
				+ Object.entries(form.get()).map(entry => entry.join(': ')).join('\n'))
		}
	}

	return <form
		ref={formRef}
		id="xx"
		className={classNames('row', selected && ' selected')}
		onClick={evt => onClick?.(evt)}
		onSubmit={onSubmit}
	>
		<button onClick={evt => (evt.preventDefault(), onSubmit())}><IcSettings/></button>
		{ columnConfig.map(col => isEditable<T, TV, any>(columns[col.id], data)
			? <EditableCell key={col.id.toString()} className={className} inputClassName={classNames(inputClassName, form.errors[col.id] && 'invalid')} colId={col.id} column={columns[col.id]} width={col.width} data={data} {...form.props(col.id)}/>
			: <Cell key={col.id.toString()} colId={col.id} column={columns[col.id] as any} width={col.width} data={data}/>
		)}
	</form>
}

interface DataTableProps<T extends { [id: string]: any }, TV extends T> {
	data: T[] | TableDataProvider<T>
	dataKey: keyof T
	columns: Columns<T, TV>
	columnConfig: ColumnConfig<TV>[]
	struct?: T.StructType<T>
	scroll?: boolean
	selection?: boolean | 'multi'
	editable?: boolean
	className?: string
	rowClassName?: string
	inputClassName?: string
	menuItemClassName?: string
	insideClassName?: string
	headerClassName?: string
	itemClassName?: string
	toolbarClassName?: string
	toolbarMenuClassName?: string
	style?: any
	onRowSelect?: (id: keyof T) => void
	onCellChange?: (id: keyof T, patch: Partial<T>) => void
	onRowChange?: (id: keyof T, patch: Partial<T>) => void
	setColumnConfig?: React.Dispatch<React.SetStateAction<ColumnConfig<TV>[]>>
}

export function DataTable<T extends { [id: string]: any }, TV extends T = T>({
	struct,
	scroll,
	selection,
	className,
	rowClassName,
	inputClassName,
	menuItemClassName,
	insideClassName,
	headerClassName,
	itemClassName,
	toolbarClassName,
	toolbarMenuClassName,
	style,
	data,
	dataKey,
	onCellChange,
	onRowChange,
	columns,
	columnConfig,
	setColumnConfig
}: DataTableProps<T, TV>) {
	const sortableTypeId = React.useMemo(() => Symbol('type'), [])
	const [configMode, setConfigMode] = React.useState(false)
	const [sort, setSort] = React.useState<keyof T | undefined>()
	const [sortAsc, setSortAsc] = React.useState(true)
	const [selectedRowId, setSelectedRowId] = React.useState<string | undefined>()
	const [editedRowId, setEditedRowId] = React.useState<any | undefined>(11)
	const TableHeader = SortableContainer<ColumnConfig<TV>, 'id'>
	const ConfigMenuItem = SortableItem<ColumnConfig<TV>, 'id'>
	//console.log('columnConfig', columnConfig.map(c => c.id.toString() + ':' + c.width))
	const td = Array.isArray(data) ? useTableData(data) : data
	const d = Array.isArray(data) ? data : data.getData()
	const unusedColumns = configMode
		? Object.entries(columns).filter(([id, col]) => !columnConfig.find(cc => cc.id === id))
		: []

	const sortedData = React.useMemo(() => {
		if (!sort) return d
		const col = columns[sort]
		const sortFunc: (d: T) => T[keyof T] = (col?.sort && typeof col.sort == 'function') ? col.sort : (d: T) => d[sort]
		return d.sort((d1, d2) => {
			const v1 = sortFunc(d1)
			const v2 = sortFunc(d2)
			return (sortAsc ? 1 : -1) * compare(v1, v2)
		})
	}, [d, sort, sortAsc])

	const setColumnWidth = React.useCallback(function setColumnWidth(colId: keyof TV, width: number) {
		if (setColumnConfig) setColumnConfig(columnConfig => columnConfig.map(col => col.id == colId ? { ...col, width } : col))
	}, [columnConfig])

	const findColumn = React.useCallback(function findColumn(itemId: keyof TV & string) {
		return findItemHelper(columnConfig, 'id', itemId)
	}, [columns, columnConfig])

	const moveColumn = React.useCallback(function moveColumn(itemId: keyof TV & string, to: number) {
		setColumnConfig?.(moveItemHelper(columnConfig, 'id', itemId, to, { id: itemId as keyof T & string, width: columns[itemId as keyof T & string].defaultWidth }))
	}, [findColumn])

	const renderHeaderItem = React.useCallback(function renderHeaderItem(col: ColumnConfig<TV>) {
		return ColumnHeader({
			id: col.id as string,
			column: columns[col.id],
			width: col.width,
			setWidth: (width: number) => setColumnWidth(col.id, width),
			remove: () => moveColumn(col.id, -1)
		})
	}, [columns])

	const renderMenuItem = React.useCallback(function renderMenuItem(col: ColumnConfig<TV>) {
		return <div className={menuItemClassName ?? 'item'}>{columns[col.id].title}</div>
	}, [columns])

	function handleCellChange(row: T, colId: keyof T, value: string) {
		if (onCellChange) onCellChange(row[dataKey], { [colId]: value } as any)
	}

	function toggleSort(colId: keyof T) {
		if (sort == colId) {
			setSortAsc(sa => !sa)
		} else {
			setSort(colId)
			setSortAsc(true)
		}
	}

	function onRowClick(evt: React.SyntheticEvent, id: string) {
		console.log('select', id)
		setSelectedRowId(r => r === id ? undefined : id)
	}

	const inside = <div className={insideClassName ?? 'inside'}>
		{ setColumnConfig && configMode ? <>
			<TableHeader
				className={headerClassName ?? 'header'}
				itemClassName={itemClassName ?? 'editable'}
				items={columnConfig}
				type={sortableTypeId}
				itemKey="id"
				setItems={setColumnConfig}
				renderItem={renderHeaderItem}
				findItem={findColumn}
				moveItem={moveColumn}
				/>
		</>
		:
			<div className={headerClassName ?? 'header'}>
				{ columnConfig.map(col => <ColumnHeader
					key={col.id.toString()}
					id={col.id}
					column={columns[col.id]}
					width={col.width}
					sortAsc={sort == col.id ? sortAsc : undefined}
					onClick={columns[col.id].sort ? () => toggleSort(col.id) : undefined}
				/>) }
			</div>
		}
		{ d.map(row => struct && (editedRowId === row[dataKey])
			? <EditRow<T, TV, string> key={row[dataKey]} className={rowClassName} inputClassName={inputClassName} data={row} columns={columns} columnConfig={columnConfig} struct={struct} selected={selectedRowId === row[dataKey]} onClick={evt => onRowClick(evt, row[dataKey])}/>
			: <>
				<div style={{ position: 'relative' }}>
					<button style={{ position: 'absolute' }} onClick={() => setEditedRowId(row[dataKey])}><IcEdit/></button>
				</div>
				<Row<T, TV, string> key={row[dataKey]} className={rowClassName} data={row} columns={columns} columnConfig={columnConfig} selected={selectedRowId === row[dataKey]} onClick={evt => onRowClick(evt, row[dataKey])}/>
			</>
		)}
		{/*
		{ d.map(row => <div key={row[dataKey]} className={'row' + (selectedRowId === row[dataKey] ? ' selected' : '')} onClick={evt => onRowClick(evt, row[dataKey])}>
			{ columnConfig.map(col => (onCellChange) && isEditable<T, TV, any>(columns[col.id], row)
				? <EditableCell key={col.id.toString()} colId={col.id} column={columns[col.id]} width={col.width} data={row} onChange={(value) => handleCellChange(row, col.id, value)}/>
				: <Cell key={col.id.toString()} colId={col.id} column={columns[col.id] as any} width={col.width} data={row}/>) }
		</div>)}
		*/}
	</div>

	return <div className={className}>
		{ !!setColumnConfig && <>
			<div className={toolbarClassName ?? 'toolbar'}>
				{ td.page != undefined && <>
					<button disabled={!td.page} onClick={td.prev}><IcPagePrev/></button>
					<span>{td.page + 1} / {td.lastPage == null ? '-' : td.lastPage + 1}</span>
					<button disabled={td.lastPage != null && td.page >= td.lastPage} onClick={td.next}><IcPageNext/></button>
				</> }
				<button onClick={() => setConfigMode(!configMode)}><IcSettings/></button>
			</div>
			{ configMode && <div className={toolbarMenuClassName ?? 'toolbar-menu'}>
				{ !unusedColumns.length && <div className="">---</div> }
				{ unusedColumns.map(([id, col]) =>
					<ConfigMenuItem
						key={'' + id}
						type={sortableTypeId}
						className="editable"
						renderItem={renderMenuItem}
						item={{ id, width: col.width }}
						itemKey="id"
						findItem={findColumn}
						moveItem={moveColumn}
					/>
				)}
			</div> }
		</> }
		{ scroll
			? <Scroll fill style={style}>{inside}</Scroll>
			: inside }
	</div>
}

// vim: ts=4
