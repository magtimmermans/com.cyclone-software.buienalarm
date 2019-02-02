
function onHomeyReady(Homey){

    var app = new Vue({
        el: '#app',
        data: {
            raindata: null,
            startDate : null,
        },
        methods: {
            getRainData() {
                return Homey.api('GET', '/raindata', null, (err, result) => {
                    if (err) return Homey.alert('getRainData ' + err);
                    this.raindata = result;
                    this.startTime = new Date(this.raindata.unix_timestamp*1000).getTime();
                });
            },
            getIcon: function (mm) {
                try {
                    var icon = "";
                    if (mm<0.01)
                    {
                        icon="cloud.png";
                    } else if (mm<0.25) {
                        icon="cloud2small.png";
                    } else if (mm<1.0)
                       icon="cloud3.png";
                    else
                       icon="cloud5.png";
                       
                    return icon;
                } catch (e) {
                    return "<!-- oops -->";
                }
            }
        },
        mounted() {
            this.getRainData();
        },
        computed: {
            getTime() {
               return arg => {
                    var d= new Date(this.startTime + (arg * 5 * 60000));
                    var hour = d.getHours();
                    hour = (hour < 10 ? "0" : "") + hour;
                
                    var min  = d.getMinutes();
                    min = (min < 10 ? "0" : "") + min;
                    return hour + ":" + min;
                    //return arg;
               }
            }
        }
    });    
}
