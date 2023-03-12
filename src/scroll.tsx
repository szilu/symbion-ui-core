import React from 'react'

interface ScrollProps {
	fill?: boolean
	style?: any
	children: React.ReactNode
}

export function Scroll({ fill, style, children }: ScrollProps) {
	return <div className={'m-scroll' + (fill ? ' fill' : '')} style={style}>
		<div className="wrapper">
			{children}
		</div>
	</div>
}

// vim: ts=4
