import React from 'react'

interface ScrollProps {
	fill?: boolean
	style?: any
	children: React.ReactNode
}

export function Scroll({ fill, style, children }: ScrollProps) {
	return <div className={'sui-scroll' + (fill ? ' sui-fill' : '')} style={style}>
		<div className="sui-wrapper">
			{children}
		</div>
	</div>
}

// vim: ts=4
