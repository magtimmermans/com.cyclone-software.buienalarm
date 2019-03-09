
function onHomeyReady(Homey) {

	const app = new Vue({
		el: '#app',
		data: {
			raindata: [],
			startDate: null,
		},
		methods: {
			getRainData() {
				return Homey.api('GET', '/raindata', null, (err, result) => {
					if (err) return Homey.alert(`getRainData ${err}`);
					this.raindata = result;
					this.startTime = new Date(this.raindata.unix_timestamp * 1000).getTime();
				});
			},
			getIcon(mm) {
				try {
					let icon = '';
					if (mm < 0.01) {
						icon = 'cloud.png';
					} else if (mm < 0.25) {
						icon = 'cloud2small.png';
					} else if (mm < 1.0) { icon = 'cloud3.png'; } else { icon = 'cloud5.png'; }

					return icon;
				} catch (e) {
					return '<!-- oops -->';
				}
			},
		},
		mounted() {
			this.getRainData();
			Homey.ready();
		},
		computed: {
			getTime() {
				return (arg) => {
					const d = new Date(this.startTime + (arg * 5 * 60000));
					let hour = d.getHours();
					hour = (hour < 10 ? '0' : '') + hour;

					let min = d.getMinutes();
					min = (min < 10 ? '0' : '') + min;
					return `${hour}:${min}`;
					// return arg;
				};
			},
		},
	});
}
