'use strict';

const Homey = require('homey');
const BuienAlarmGrabber = require('./BuienAlarmGrabber.js');

const MINUTE = 60000;

class BuienAlarm extends Homey.App {

	onInit() {
		this.log(`${Homey.manifest.id} V${Homey.manifest.version} is running...`);

		this.isRaining = null;
		this.firstTime = true;
		this.rainStopTriggered = false;
		this.rainStartTriggered = false;
		this.data = {};
		this.rainpercentage = 0;
		this.rainmm = 0;

		this.registerBuienAlarmGrabber();
		Homey.ManagerGeolocation.on('location', this.registerBuienAlarmGrabber.bind(this));

		this.initFlows();

		// Start syncing periodically.
		this.shouldSync = true;
		this.startSyncing();
	}

	async startSyncing() {
		// Prevent more than one syncing cycle.
		if (this.syncRunning) return;

		// Start syncing.
		this.syncRunning = true;
		this.log('starting sync');
		this.poll();
	}

	registerBuienAlarmGrabber() {
		const latitude = Homey.ManagerGeolocation.getLatitude();
		const longitude = Homey.ManagerGeolocation.getLongitude();

		this.ba_api = new BuienAlarmGrabber({ lat: latitude, lon: longitude });
	}

	initFlows() {
		this.rainStartTrigger = new Homey.FlowCardTrigger('rain_start').register();
		this.rainStopTrigger = new Homey.FlowCardTrigger('rain_stop').register();
		this.rainInTrigger = new Homey.FlowCardTrigger('raining_in').register().registerRunListener((args, state) => {
			// console.log(`start when ${state.when} = ${args.when}`);
			if (state.when === args.when) {
				this.log(`regen in ${args.when}`);
				return Promise.resolve(true);
			} return Promise.resolve(false);
		});
		this.dryInTrigger = new Homey.FlowCardTrigger('dry_in').register().registerRunListener((args, state) => {
			// console.log(`stop when ${state.when} = ${args.when}`);
			if (state.when === args.when) {
				this.log(`stop regen in ${args.when}`);
				return Promise.resolve(true);
			} return Promise.resolve(false);
		});

		this.trgRainPercentage = new Homey.FlowCardTrigger('triggerRainPercentage').register()
			.registerRunListener((args, state) => {
				if (state.rainpercentageArg > args.rainpercentageArg) {
					return Promise.resolve(true);
				} return Promise.resolve(false);
			});

		this.trgtotalRainNextHour = new Homey.FlowCardTrigger('totalRainNextHour').register()
			.registerRunListener((args, state) => {
				if (state.rainmmArg > args.rainmmArg) {
					return Promise.resolve(true);
				} return Promise.resolve(false);
			});

		this.rainCondition = new Homey.FlowCardCondition('is_raining').register()
			.registerRunListener(async (args, state) => this.isRaining);
		this.rainInCondition = new Homey.FlowCardCondition('raining_in').register()
			.registerRunListener(async (args, state) => {
				const index = (args.when / 5);
			    return this.rainData[index] > 0;
			});

		this.rainmmCondition = new Homey.FlowCardCondition('is_mmrain').register()
			.registerRunListener(async (args, state) => this.rainmm > args.rainmmArg);
		this.rrainPercentageCondition = new Homey.FlowCardCondition('is_percrain').register()
			.registerRunListener(async (args, state) => this.rainpercentage > args.rainpercentageArg);
	}

	addMinutesToTime(time, minutes) {
		return new Date(time.getTime() + minutes * 60000);
	}

	// calculate % of rain the comming 2 hours
	procentageOfRain(data) {
		let total = 0;
		for (let index = 0; index < data.length; index++) {
			 if (data[index] > 0) total++;
		}
		return (total > 0) ? Math.round((total / 25) * 100) : 0;
	}

	// calculate % of rain the comming 2 hours
	totalRainCommingHour(data) {
		let total = 0;
		for (let index = 0; index < 12; index++) {
			 total += data[index];
		}
		return Math.round(total.toFixed(2) * 100) / 100;
	}

	async poll() {
		// Check if it is raining at this moment
		this.isSyncing = true;
		const me = this;
		try {
			const result = await this.ba_api.getForecasts();

			me.data = result;

			let isRainingNew = result.rainData[0] > 0;

			this.rainpercentage = this.procentageOfRain(result.rainData);
			this.rainmm = this.totalRainCommingHour(result.rainData);

			this.trgRainPercentage.trigger({ rainpercentage: this.rainpercentage }, { rainpercentageArg: this.rainpercentage }).catch(err => this.error(err));
			this.trgtotalRainNextHour.trigger({ rainmm: this.rainmm }, { rainmmArg: this.rainmm }).catch(err => this.error(err));

			this.log(`Rain Percentage:${this.rainpercentage}, Total rain within hour:${this.rainmm}`);
			this.log(`current isRaining: ${this.isRaining} new isRaining: ${isRainingNew}`);

			if (this.isRaining === null) {
				this.isRaining = isRainingNew;
				if (isRainingNew) { this.rainStartTrigger.trigger(); }
			} else if (!isRainingNew && this.isRaining === true) {
				// stopped raining
				this.isRaining = false;
				this.log('stopped raining');
				this.rainStopTrigger.trigger();
			} else if (isRainingNew && this.isRaining === false) {
				// starts raining
				this.isRaining = true;
				this.log('starts raining');
				this.rainStartTrigger.trigger();
			}


			const startDate = new Date(result.unix_timestamp * 1000);

			for (let i = 0; i < 8; i += 1) {
				let inMinutes = 0;
				switch (i) {
					case 0: inMinutes = 5; break;
					case 1: inMinutes = 10; break;
					case 2: inMinutes = 15; break;
					case 3: inMinutes = 30; break;
					case 4: inMinutes = 45; break;
					case 5: inMinutes = 60; break;
					case 6: inMinutes = 90; break;
					case 7: inMinutes = 120; break;
					default:
					   this.log('Unknown muinutes');
				}

				const index = (inMinutes / 5);

				isRainingNew = result.rainData[index] > 0;

				const date = this.addMinutesToTime(startDate, inMinutes);

				// this.log(`Date: ${date}, startdate:${startDate}`);

				this.log(`Index: ${index}, inMinutes ${inMinutes} , isRaining:${this.isRaining} NewRaining: ${isRainingNew}, firstime:${this.firstTime}`);

				if ((!isRainingNew && this.isRaining === true) || (!isRainingNew && this.firstTime === true)) {
					this.log(`TRIGGERING FLOW STOP IN: Time: ${date}, raining: ${isRainingNew}`);
					this.dryInTrigger.trigger(null, { when: inMinutes.toString() });

					// this.rainStopTriggered = true;
					// setTimeout(() => {
					// 	this.rainStopTriggered = false;
					// }, inMinutes * MINUTE);
				} else if ((isRainingNew && this.isRaining === false) || (isRainingNew && this.firstTime === true)) {
					this.log(`TRIGGERING FLOW START IN: Time: ${date}, raining: ${isRainingNew}`);
					this.rainInTrigger.trigger(null, { when: inMinutes.toString() });

					// this.rainStartTriggered = true;
					// setTimeout(() => {
					// 	this.rainStartTriggered = false;
					// }, inMinutes * MINUTE);
				}
			}
			this.firstTime = false;
		} catch (e) {
			this.error(e);
		}

		this.isSyncing = false;

		// Schedule next sync.
		this.timeout = setTimeout(
			() => this.poll(),
			5 * MINUTE,
		);
	}

	getRainData() {
		return this.data;
	}

}

module.exports = BuienAlarm;
