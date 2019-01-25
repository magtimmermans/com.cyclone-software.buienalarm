'use strict';

const Homey = require('homey');
const BuienAlarmGrabber = require("./BuienAlarmGrabber.js");

const MINUTE = 60000;

class BuienAlarm extends Homey.App {
	
	onInit() {
		this.log(`${ Homey.manifest.id } V${Homey.manifest.version} is running...`);

		this.isRaining = null;
		this.rainStopTriggered = false;
		this.rainStartTriggered = false;
	
		this.registerBuienAlarmGrabber();
		Homey.ManagerGeolocation.on('location', this.registerBuienAlarmGrabber.bind(this));	

		this.initFlows();

		// Start syncing periodically.
		this.shouldSync = true;
		this.startSyncing();

		setInterval(this.poll.bind(this), 5 * MINUTE);
	}

	async startSyncing() {
        // Prevent more than one syncing cycle.
        if (this.syncRunning) return;
    
        // Start syncing.
        this.syncRunning = true;
        this.log('starting sync');
        this.poll();
    }

	registerBuienAlarmGrabber(){
		let latitude = Homey.ManagerGeolocation.getLatitude();
        let longitude = Homey.ManagerGeolocation.getLongitude();

        this.api = new BuienAlarmGrabber({ lat: latitude, lon: longitude });
	}

    initFlows() {
        this.rainStartTrigger = new Homey.FlowCardTrigger('rain_start').register();
        this.rainStopTrigger = new Homey.FlowCardTrigger('rain_stop').register();
        this.rainInTrigger = new Homey.FlowCardTrigger('raining_in').register();
        this.dryInTrigger = new Homey.FlowCardTrigger('dry_in').register();
        this.rainCondition = new Homey.FlowCardCondition('is_raining').register()
            .registerRunListener(async (args, state) => {
                return this.isRaining;
            });
        this.rainInCondition = new Homey.FlowCardCondition('raining_in').register()
            .registerRunListener(async (args, state) => {
				console.log(args.when);
                return false;
            });
	}
	
	addMinutesToTime(time, minutes) {
        return new Date(time.getTime() + minutes * 60000);
    }

	async poll() {
		// Check if it is raining at this moment
		this.isSyncing = true;
		try {
            let result = await this.api.getForecasts();
			console.log(result);
			
			let isRaining = result.rainData[0]>0;

			this.log(`current isRaining: ${this.isRaining} new isRaining: ${isRaining}`);

			if (this.isRaining===null) {
				this.isRaining=isRaining;
			} else if (!isRaining && this.isRaining===true) {
				// stopped raining
				this.log('stopped raining');
			} else if (isRaining && this.isRaining===false) {
				// starts raining
				this.log('starts raining');
			}

			let startDate = new Date(result.unix_timestamp*1000);

			for (let i = 0; i < 8; i++) {
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
				}

				let index = (inMinutes / 5) - 1;

				let isRaining = result.rainData[index]>0;

				var date = this.addMinutesToTime(startDate, inMinutes);

				this.log(`Index: ${index}, atTime:${date}, inMinutes ${inMinutes} : Raining: ${isRaining}`);

				if (!isRaining && this.isRaining === true && this.rainStopTriggered === false) {
					this.log(`TRIGGERING FLOW STOP IN: Time: ${date}, raining: ${isRaining}`);
					this.dryInTrigger.trigger(null, {when: inMinutes.toString()});
	
					this.rainStopTriggered = true;
					setTimeout(() => {
						this.rainStopTriggered = false;
					}, inMinutes * MINUTE);
				}
				else if (isRaining && this.isRaining === false && this.rainStartTriggered === false) {
					this.log(`TRIGGERING FLOW START IN: Time: ${date}, raining: ${isRaining}`);
					this.rainInTrigger.trigger(null, {when: inMinutes.toString()});
	
					this.rainStartTriggered = true;
					setTimeout(() => {
						this.rainStartTriggered = false;
					}, inMinutes * MINUTE);
				}
			}
        } catch (e) {
            this.error(e);
		}

        this.isSyncing = false;
    
        // Schedule next sync.
        this.timeout = setTimeout(
          () => this.sync(),
           5 * MINUTE
        );
	}
	
}

module.exports = BuienAlarm;