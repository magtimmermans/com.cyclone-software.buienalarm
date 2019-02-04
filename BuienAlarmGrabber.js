'use strict';

const fetch = require('node-fetch');

module.exports = class BuienAlarmGrabber {

	constructor({ lat, lon } = {}) {
		this.lat = lat;
		this.lon = lon;
	}

	async getForecasts() {
		console.log(`Get forcast from https://cdn-secure.buienalarm.nl/api/3.4/forecast.php?lat=${this.lat}&lon=${this.lon}&region=nl&unit=mm/u`);
		const res = await fetch(`https://cdn-secure.buienalarm.nl/api/3.4/forecast.php?lat=${this.lat}&lon=${this.lon}&region=nl&unit=mm/u`);
		if (!res.ok) throw new Error('Unknown Error');
		const data = await res.json();
		return this.constructor.parseForecast(data);
	}

	static parseForecast(data) {
		return { rainData: data.precip, unix_timestamp: data.start, temperature: data.temp };
	}

};
