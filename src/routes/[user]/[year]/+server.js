import { json } from '@sveltejs/kit'
import { parseHTML } from 'linkedom'

export async function GET({ params, setHeaders }) {
	const year = 60 * 60 * 24 * 365 // lazy way to figure out how many seconds in a year

	// https://vercel.com/docs/edge-network/caching#cdn-cache-control
	setHeaders({
		'Access-Control-Allow-Origin': '*',
		'Cache-Control': `public, s-maxage=${year}`,
		'CDN-Cache-Control': `public, s-maxage=${year}`,
		'Vercel-CDN-Cache-Control': `public, s-maxage=${year}`,
	})

	const html = await getContributions(params)
	return json(parseContributions(html))
}
// this was really clever on joyofcode's part - figuring out the url to get the data from; he is a genius 8)
async function getContributions({ user, year }) {
	let api = `https://github.com/users/${user}/contributions?from=${year}-12-01&to=${year}-12-31`

	const isCurrentYear = new Date().getFullYear().toString() === year

	if (isCurrentYear) {
		const date = new Date().toLocaleDateString('en-CA')
		const month = date.split('-')[1]
		api = `https://github.com/users/${user}/contributions?from=${year}-${month}-01&to=${date}`
	}

	try {
		const response = await fetch(api)

		if (!response.ok) {
			throw new Error(`Failed to fetch: ${response.status}`)
		}

		return await response.text()
	} catch (e) {
		throw new Error(`Something went wrong: ${e}`)
	}
}
// parsing was tedious to create in the youtube video and if they change the html meta-data this will break
function parseContributions(html) {
	const { document } = parseHTML(html)

	const rows = document.querySelectorAll('tbody > tr')

	const contributions = []

	for (const row of rows) {
		const days = row.querySelectorAll('td:not(.ContributionCalendar-label)')

		const currentRow = []

		for (const day of days) {
			const data = day.innerText.split(' ')

			if (data.length > 1) {
				const contribution = {
					count: data[0] === 'No' ? 0 : +data[0], // No means no contributions
					name: data[3].replace(',', ''),
					month: data[4],
					day: +data[5].replace(',', ''),
					year: +data[6],
					level: +day.dataset.level,
				}
				currentRow.push(contribution)
			} else {
				currentRow.push(null)
			}
		}

		contributions.push(currentRow)
	}

	return contributions
}
