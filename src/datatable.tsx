import * as React from 'react'
import * as T from '@symbion/runtype'
import { useForm } from '@symbion/simple-form'
import { Scroll } from './scroll'
import { SortableContainer, SortableItem, ItemProps, findItemHelper, moveItemHelper } from './sortable'

import {
	FiArrowUp as IcSortAsc,
	FiArrowDown as IcSortDesc,
	FiChevronLeft as IcPagePrev,
	FiChevronRight as IcPageNext,
	FiSettings as IcSettings,
	FiTrash2 as IcDelete,
	//FiEdit as IcEdit
} from 'react-icons/fi'

export interface TableDataProvider<T extends { [id: string]: any }> {
	getData: () => T[]
	//page?: number
	lastPage?: number | null
	state: {
		sort?: keyof T
		sortAsc?: boolean
		page?: number
	}
	setState?: (sort: keyof T | undefined, sortAsc: boolean | undefined, page: number | undefined) => void
	next?: () => Promise<void>
	prev?: () => Promise<void>
}

export interface FormatProps {
	onEdit?: () => void
	onCancel?: () => void
	onSubmit?: (evt: React.SyntheticEvent) => void
}

export interface ColumnDescriptor<T, TV, V> {
	title: string
	defaultWidth: number
	align?: 'left' | 'right' | 'center'
	format?: (value: V, row: T, props: FormatProps) => React.ReactNode
	sort?: boolean | ((row: T) => T[keyof T])
	editable?: boolean | ((row: T) => boolean)
	renderEdit?: (props: { value: V, onChange: (value: V) => void }) => React.ReactNode
}

export type Columns<T extends { [id: string]: any }, TV extends T = T> = {
	[id in keyof TV]?: ColumnDescriptor<T, TV, TV[id]>
}

//export interface ColumnConfig<TV extends { [id: string]: any }> {
export interface ColumnConfig<C extends { [id: string]: any }> {
	id: keyof C & string
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
	return a.length ? a.join(' ') : undefined
}

export function useTableData<T extends { [id: string]: any }, TV extends T = T>(data: T[], columns: Columns<T, TV>): TableDataProvider<T> {
	//const [d] = React.useState(data)
	const [sort, setSort] = React.useState<keyof T | undefined>()
	const [sortAsc, setSortAsc] = React.useState(true)

	const sortedData = React.useMemo(() => {
		if (!sort) return data
		const col = columns[sort]
		const sortFunc: (d: T) => T[keyof T] = (col?.sort && typeof col.sort == 'function') ? col.sort : (d: T) => d[sort]
		return data.sort((d1, d2) => {
			const v1 = sortFunc(d1)
			const v2 = sortFunc(d2)
			return (sortAsc ? 1 : -1) * compare(v1, v2)
		})
	}, [data, sort, sortAsc])

	function getData() {
		return sortedData
	}

	function setState(sort: keyof T | undefined, sortAsc: boolean | undefined, page: number | undefined) {
		if (sort) setSort(sort)
		if (sortAsc) setSortAsc(sortAsc)
	}

	return { getData, state: { sort, sortAsc }, setState}
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
	className?: string
	ref?: React.Ref<React.ReactHTMLElement<any>>
}

let resizeStartX = 0
function ColumnHeader<T extends { [id: string]: any }, TV extends T, ID extends keyof T>({ id, column, width, setWidth, sortAsc, onClick, remove, className, ref }: ColumnHeaderProps<T, TV, ID>) {
	const [resizing, setResizing] = React.useState(false)

	function onResizeStart(evt: React.MouseEvent) {
		console.log('onResizeStart', evt)
		setResizing(true)
		resizeStartX = evt.clientX - 8 * width
		evt.stopPropagation()
		evt.preventDefault()
	}

	const onResizeEnd = React.useCallback(function onResizeEnd(evt: MouseEvent) {
		setResizing(false)
	}, [])

	const onResizeMove = React.useCallback(function onResizeMove(evt: MouseEvent) {
		console.log('onResizeMove', width, calcWidth(evt.clientX - resizeStartX))
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

	return <div ref={ref as any} className={classNames(className, 'sui-column', !!column.sort && 'sui-sortable', column.align)} style={{ width: `${width * 8}px`}} onClick={onClick}>
		<div className="sui-title">
			{column.title}
			{ sortAsc != undefined && (sortAsc ? <IcSortAsc/> : <IcSortDesc/>)}
		</div>
		{/* remove && <IcDelete className="sui-icon" onClick={remove}/> */}
		{ remove && <div className="sui-icon" onClick={remove}><IcDelete/></div> }
		<div className="sui-divider"
			onMouseDown={onResizeStart}
			onPointerDown={disableEvent}
			onPointerMove={disableEvent}
			onDragStart={disableEvent}
			onDrag={disableEvent}
		>
			<div className="sui-icon"/>
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
	onEdit?: () => void
	onCancel?: () => void
	onSubmit?: (evt: React.SyntheticEvent) => void
}

function Cell<T extends { [id: string]: any }, TV extends T, ID extends keyof T & string>({ colId, column, width, data, onEdit, onCancel, onSubmit }: CellProps<T, TV, ID>) {
	return <div className={'sui-cell' + (column.align ? ' ' + column.align : '')} style={{ width: `${width * 8}px`}}>
		{ column.format ? column.format(data[colId] as TV[ID], data, {
			onEdit,
			onCancel,
			onSubmit
		}) : data[colId] }
	</div>
}

function EditableCell<T extends { [id: string]: any }, TV extends T, ID extends keyof T & string>({ colId, column, width, data, className, inputClassName, onChange, onBlur, onCancel, onSubmit }: CellProps<T, TV, ID>) {
	//const [editing, setEditing] = React.useState(false)
	const [value, setValue] = React.useState('')
	console.log({ colId, column, width, data, className, onChange, onBlur, onSubmit, onCancel})

	function onInputKeyDown(evt: React.KeyboardEvent) {
		switch (evt.key) {
			case 'Enter':
				onSubmit?.(evt)
				//onChange && onChange(evt)
				//setEditing(false)
				break
			case 'Escape':
				onCancel?.()
				//setEditing(false)
				break
		}
	}

	function onFocus(evt: React.FocusEvent<HTMLInputElement>) {
		evt.target.select()
	}

	//if (editing) {
		return <div className="sui-cell editing" style={{ width: `${width * 8}px`}}>
			{ column.renderEdit
				? column.renderEdit({ value: data[colId] as TV[ID], onChange: (value) => undefined })
				: <input
					name={colId}
					className={inputClassName}
					autoFocus
					defaultValue={data[colId]}
					onChange={onChange}
					onBlur={onBlur}
					onKeyDown={onInputKeyDown}
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

function isEditable<T, TV extends T, V>(col: ColumnDescriptor<T, TV, V> | undefined, row: T) {
	switch (typeof col?.editable) {
		case 'boolean': return col.editable
		case 'function': return col.editable(row)
	}
	return false
}

interface RowProps<T extends { [id: string]: any }, TV extends T, C extends Columns<T, TV>, ID extends keyof T & string> {
	className?: string
	cellClassName?: string
	data: T
	columns: C
	columnConfig: ColumnConfig<C>[]
	selected?: boolean
	onClick?: (evt: React.SyntheticEvent) => void
	onEditClick?: () => void
}

function Row<T extends { [id: string]: any }, TV extends T, C extends Columns<T, TV>, ID extends keyof T & string>({ className, data, columns, columnConfig, selected, onClick, onEditClick }: RowProps<T, TV, C, ID>) {
	return <div
		className={classNames(className, selected ? ' selected' : '')}
		onClick={evt => onClick?.(evt)}
	>
	{columnConfig.map(col =>
		<Cell key={col.id.toString()}
			colId={col.id}
			column={columns[col.id] as any}
			width={col.width}
			data={data}
			onEdit={onEditClick}
		/>
	)}
		<div className="sui-fill"/>
	</div>
}

interface EditRowProps<T extends { [id: string]: any }, TV extends T, C extends Columns<T, TV>, ID extends keyof T & string> extends RowProps<T, TV, C, ID> {
	//data: T
	//columns: Columns<T, TV>
	//columnConfig: ColumnConfig<TV>[]
	//selected?: boolean
	//onClick?: (evt: React.SyntheticEvent) => void
	inputClassName?: string
	buttonClassName?: string
	struct: T.StructType<T>
	cancelEdit: () => void
	onChange?: (value: string) => void
	onSubmit?: (values: T) => Promise<boolean>
}

function EditRow<T extends { [id: string]: any }, TV extends T, C extends Columns<T, TV>, ID extends keyof T & string>({ className, inputClassName, buttonClassName, data, columns, columnConfig, struct, selected, cancelEdit, onClick, onSubmit }: EditRowProps<T, TV, C, ID>) {
	const formRef = React.useRef(null)
	const form = useForm(struct, { formRef, init: data })
	//columnConfig.map(col => console.log(columns[col.id], data, isEditable<T, TV, any>(columns[col.id], data)))

	async function handleSubmit(evt: React.SyntheticEvent) {
		evt.preventDefault()
		const valid = await form.valid()
		console.log('SUBMIT', valid ? form.get() : 'invalid')
		console.log('SUBMIT', form.get())
		if (valid) {
			if (onSubmit) {
				const res = await onSubmit(form.getStrict())
				if (res) cancelEdit()
			} else {
				alert('Form submit\n---------------------\n\n'
					+ Object.entries(form.get()).map(entry => entry.join(': ')).join('\n'))
			}
		}
	}

	return <form
		ref={formRef}
		id="xx"
		className={classNames('sui-row', selected && ' sui-selected')}
		onClick={evt => onClick?.(evt)}
		onSubmit={handleSubmit}
	>
		{ columnConfig.map(col => isEditable<T, TV, any>(columns[col.id], data) && onSubmit
			? <EditableCell
				key={col.id.toString()}
				className={className}
				inputClassName={classNames(inputClassName, form.errors[col.id] && 'invalid')}
				colId={col.id}
				column={columns[col.id] as any}
				width={col.width}
				data={data}
				onSubmit={handleSubmit}
				onCancel={cancelEdit}
				{...form.props(col.id)}
			/>
			: !!columns[col.id] && <Cell
				key={col.id.toString()}
				colId={col.id}
				column={columns[col.id] as any}
				width={col.width}
				data={data}
				onSubmit={onSubmit ? handleSubmit : undefined}
				onCancel={cancelEdit}
			/>
		)}
		<div className="sui-fill"/>
	</form>
}

export interface DataTableProps<T extends { [id: string]: any }, TV extends T, C extends Columns<T, TV> = Columns<T, TV>> {
	data: T[] | TableDataProvider<T>
	dataKey: keyof T
	//columns: Columns<T, TV>
	//columnConfig: ColumnConfig<TV>[]
	columns: C
	columnConfig: ColumnConfig<C>[]
	struct?: T.StructType<T>
	scroll?: boolean
	selection?: boolean | 'multi'
	className?: string
	rowClassName?: string
	selectedRowClassName?: string
	inputClassName?: string
	buttonClassName?: string
	tableClassName?: string
	headerClassName?: string
	itemClassName?: string
	toolbarClassName?: string
	menuClassName?: string
	menuItemClassName?: string
	style?: any
	onRowSelect?: (id?: string) => void
	onCellChange?: (id: keyof T, patch: Partial<T>) => void
	onRowChange?: (id: keyof T, patch: Partial<T>) => void
	setColumnConfig?: React.Dispatch<React.SetStateAction<ColumnConfig<C>[]>>
	onSubmit?: (values: T) => Promise<boolean>
}

export function DataTable<T extends { [id: string]: any }, TV extends T = T, C extends Columns<T, TV> = Columns<T, TV>>({
	struct,
	scroll,
	selection,
	className,
	rowClassName,
	selectedRowClassName,
	inputClassName,
	buttonClassName,
	tableClassName,
	headerClassName,
	itemClassName,
	toolbarClassName,
	menuClassName,
	menuItemClassName,
	style,
	data,
	dataKey,
	onRowSelect,
	onCellChange,
	onRowChange,
	onSubmit,
	columns,
	columnConfig,
	setColumnConfig
}: DataTableProps<T, TV, C>) {
	const sortableTypeId = React.useMemo(() => Symbol('type'), [])
	const [configMode, setConfigMode] = React.useState(false)
	//const [sort, setSort] = React.useState<keyof T | undefined>()
	//const [sortAsc, setSortAsc] = React.useState(true)
	const [selectedRowId, setSelectedRowId] = React.useState<string | undefined>()
	const [editedRowId, setEditedRowId] = React.useState<string | undefined>()
	const SortableTableHeader = SortableContainer<ColumnConfig<C>, 'id'>
	const ConfigMenuItem = SortableItem<ColumnConfig<C>, 'id'>
	//console.log('columnConfig', columnConfig.map(c => c.id.toString() + ':' + c.width))
	const td = Array.isArray(data) ? useTableData(data, columns) : data
	const d = Array.isArray(data) ? data : data.getData()
	const unusedColumns = configMode
		? Object.entries(columns).filter(([id, col]) => !columnConfig.find(cc => cc.id === id))
		: []
	console.log('className', className)

	/*
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
	*/

	const setColumnWidth = React.useCallback(function setColumnWidth(colId: keyof TV, width: number) {
		if (setColumnConfig) setColumnConfig(columnConfig => columnConfig.map(col => col.id == colId ? { ...col, width } : col))
	}, [columnConfig])

	const findColumn = React.useCallback(function findColumn(itemId: keyof TV & string) {
		return findItemHelper(columnConfig, 'id', itemId)
	}, [columns, columnConfig])

	const moveColumn = React.useCallback(function moveColumn(itemId: keyof TV & string, to: number) {
		const col = columns[itemId]
		if (col) {
			//setColumnConfig?.(moveItemHelper(columnConfig, 'id', itemId, to, { id: itemId as keyof T & string, width: columns[itemId as keyof T & string].defaultWidth }))
			setColumnConfig?.(moveItemHelper(columnConfig, 'id', itemId, to, { id: itemId as keyof T & string, width: col.defaultWidth }))
		}
	}, [findColumn])

	const renderHeaderItem = React.useCallback(function renderHeaderItem(col: ColumnConfig<C>, props: ItemProps) {
		console.log('hi', props)
		const column = columns[col.id]
		return ColumnHeader({
			id: col.id as string,
			column: column || { title: '', defaultWidth: 1 },
			className: 'sui-editable',
			//style: { width: `${col.width * 8}px`},
			width: col.width,
			setWidth: (width: number) => setColumnWidth(col.id, width),
			remove: () => moveColumn(col.id, -1),
			...props
		})
	}, [columns])

	const renderMenuItem = React.useCallback(function renderMenuItem(col: ColumnConfig<C>, { className, style, ref }: ItemProps) {
		const column = columns[col.id]
		return <div ref={ref as any} className={className ?? menuItemClassName ?? 'item'} style={style}>{column?.title || ''}</div>
	}, [columns])

	function handleCellChange(row: T, colId: keyof T, value: string) {
		if (onCellChange) onCellChange(row[dataKey], { [colId]: value } as any)
	}

	function toggleSort(colId: keyof T) {
		console.log('toggleSort', td.state)
		if (td.state.sort == colId) {
			td.setState?.(undefined, !td.state.sortAsc, undefined)
			//setSortAsc(sa => !sa)
		} else {
			td.setState?.(colId, true, undefined)
			//setSort(colId)
			//setSortAsc(true)
		}
	}

	function onRowClick(evt: React.SyntheticEvent, id: string) {
		console.log('select', id)
		setSelectedRowId(r => r === id ? undefined : id)
		onRowSelect?.(selectedRowId === id ? undefined : id)
	}

	const inside = <div className={classNames(tableClassName, 'sui-inside')}>
		<div className="sui-head">
			{ setColumnConfig && configMode ? <SortableTableHeader
				className={classNames(headerClassName, 'sui-header')}
				itemClassName="sui-editable"
				items={columnConfig}
				type={sortableTypeId}
				tag="dif"
				itemKey="id"
				setItems={setColumnConfig}
				renderItem={renderHeaderItem}
				findItem={findColumn}
				moveItem={moveColumn}
			>
				<div className="sui-fill"/>
			</SortableTableHeader>
			:
				<div className={classNames(headerClassName, 'sui-header')}>
					{ columnConfig.map(col => <ColumnHeader<T, TV, string>
						key={col.id.toString()}
						id={col.id}
						column={columns?.[col.id] || { title: '', defaultWidth: 1 }}
						width={col.width}
						sortAsc={td.state.sort == col.id ? td.state.sortAsc : undefined}
						onClick={columns?.[col.id]?.sort ? () => toggleSort(col.id) : undefined}
					/>) }
					<div className="sui-fill"/>
				</div>
			}
		</div>
		<div className="sui-body">
			{ d.map(row => struct && (editedRowId === row[dataKey])
				? <EditRow<T, TV, C, string>
					key={row[dataKey]}
					className={classNames(rowClassName, 'sui-row')}
					inputClassName={inputClassName}
					data={row}
					columns={columns}
					columnConfig={columnConfig}
					struct={struct}
					selected={selectedRowId === row[dataKey]}
					cancelEdit={() => setEditedRowId(undefined)}
					onClick={evt => onRowClick(evt, row[dataKey])}
					onSubmit={onSubmit}
				/>
				: <Row<T, TV, C, string>
					key={row[dataKey]}
					className={classNames(rowClassName, selectedRowId === row[dataKey] && selectedRowClassName, 'sui-row')}
					data={row}
					columns={columns}
					columnConfig={columnConfig}
					selected={selectedRowId === row[dataKey]}
					onClick={evt => onRowClick(evt, row[dataKey])}
					onEditClick={onSubmit ? () => setEditedRowId(row[dataKey]) : undefined}
				/>
			)}
		</div>
	</div>

	return <div className={classNames(className, 'sui-data-table')}>
		{ !!setColumnConfig && <>
			<div className={classNames(toolbarClassName, 'sui-toolbar')}>
				{ td.state.page != undefined && <>
					<button className={buttonClassName} disabled={!td.state.page} onClick={td.prev}><IcPagePrev/></button>
					<span>{td.state.page + 1} / {td.lastPage == null ? '-' : td.lastPage + 1}</span>
					<button className={buttonClassName} disabled={td.lastPage != null && td.state.page >= td.lastPage} onClick={td.next}><IcPageNext/></button>
				</> }
				<button className={buttonClassName} onClick={() => setConfigMode(!configMode)}><IcSettings/></button>
			</div>
			{ configMode && <div className={classNames(menuClassName, 'sui-toolbar-menu')}>
				{ !unusedColumns.length && <div className="">---</div> }
				{ unusedColumns.map(([id, col]) =>
					<ConfigMenuItem
						key={'' + id}
						type={sortableTypeId}
						className={classNames(menuItemClassName, 'sui-editable')}
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
